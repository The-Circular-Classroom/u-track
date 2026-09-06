import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { requireRole, type UserRole } from '@/lib/auth/roles'

const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/forget-password',
  '/auth/reset-password',
  '/auth/set-new-password',
  '/deeplink',
  '/api/health',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/register',
  '/api/auth/reset-password',
  '/api/auth/callback',
  '/api/auth/signup',
  '/api/auth/forgot-password',
  '/api/auth/set-new-password',
  '/api/collection/overall-donations',
  '/api/collection/overall-donations-by-category',
]

function getDefaultRouteForRole(role: string): string {
  switch (role) {
    case 'Admin':
      return '/analytics/overview'
    case 'SchoolStaff':
      return '/analytics/school'
    case 'PsgVolunteer':
      return '/donation-drives'
    default:
      return '/settings'
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths without authentication
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Create response and supabase client with cookie handling
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
          // Update cookies on the request for downstream
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Recreate response with updated request cookies
          response = NextResponse.next({ request })
          // Set cookies on the response for the browser
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Validate JWT by calling getUser() which verifies the token server-side
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    // For API requests, return 401 JSON response
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // For page requests, redirect to login
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Enforcement check: user must change temporary password before accessing protected routes
  const forcePasswordChange = user.app_metadata?.force_password_change === true
  if (forcePasswordChange) {
    const ALLOWED_FORCE_CHANGE_PATHS = [
      '/auth/change-password',
      '/api/auth/set-new-password',
      '/api/auth/logout',
      '/api/auth/me',
      '/api/auth/session',
      '/api/auth/refresh',
      '/api/users/me',
    ]

    const isAllowed = ALLOWED_FORCE_CHANGE_PATHS.some((p) => pathname.startsWith(p))
    if (!isAllowed) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'password_change_required', message: 'You must change your temporary password' },
          { status: 403 }
        )
      }
      return NextResponse.redirect(new URL('/auth/change-password', request.url))
    }
  }

  // Look up the user's role from the users table (canonical source)
  // Use the service role key to bypass RLS policies on the users table
  let role = 'Parent'
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { persistSession: false } }
    )
    const { data: dbUser, error: dbError } = await adminClient
      .from('users')
      .select('role')
      .eq('supabase_auth_id', user.id)
      .single()

    if (dbError) {
      console.error('[proxy] Role lookup failed:', JSON.stringify({
        userId: user.id,
        error: dbError.message,
        code: dbError.code,
        details: dbError.details,
        hint: dbError.hint,
      }))
      // Fallback to app_metadata
      role = user.app_metadata?.role || 'Parent'
    } else if (dbUser?.role) {
      // DB stores enum values like 'admin', 'school_staff', 'parent', 'psg_volunteer'
      // Map them to the application role names
      const roleMap: Record<string, string> = {
        admin: 'Admin',
        school_staff: 'SchoolStaff',
        parent: 'Parent',
        psg_volunteer: 'PsgVolunteer',
      }
      role = roleMap[dbUser.role] || dbUser.role
      console.log('[proxy] Role resolved:', JSON.stringify({ userId: user.id, dbRole: dbUser.role, mappedRole: role }))
    } else {
      console.warn('[proxy] No role found in DB for user:', user.id)
      role = user.app_metadata?.role || 'Parent'
    }
  } catch (err) {
    console.error('[proxy] Role lookup exception:', err instanceof Error ? err.message : String(err))
    // Fallback to app_metadata if DB lookup fails
    role = user.app_metadata?.role || 'Parent'
  }

  // Page-level Role Authorization (RBAC)
  if (!pathname.startsWith('/api/')) {
    let minRoleForPage: UserRole | null = null

    if (pathname.startsWith('/users') || pathname.startsWith('/file-approval')) {
      minRoleForPage = 'Admin'
    } else if (
      pathname.startsWith('/configuration') ||
      pathname.startsWith('/analytics')
    ) {
      minRoleForPage = 'SchoolStaff'
    } else if (
      pathname.startsWith('/inventory') ||
      pathname.startsWith('/donation-drives') ||
      pathname.startsWith('/update-item-condition')
    ) {
      minRoleForPage = 'PsgVolunteer'
    }

    if (minRoleForPage && !requireRole(role, minRoleForPage)) {
      const defaultRoute = getDefaultRouteForRole(role)
      return NextResponse.redirect(new URL(defaultRoute, request.url))
    }
  }

  // Attach user info to headers for downstream use
  response.headers.set('x-user-id', user.id)
  response.headers.set('x-user-role', role)
  response.headers.set('x-user-force-password-change', String(forcePasswordChange))

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static assets (svg, png, jpg, jpeg, gif, webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

