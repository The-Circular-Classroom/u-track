import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export function safeParseJwt(token: string | null) {
  try {
    if (!token || typeof token !== 'string') return null
    const parts = token.split('.')
    if (parts.length < 2) return null

    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)

    const json = atob(padded)
    return JSON.parse(json)
  } catch {
    return null
  }
}

/**
 * Map Supabase user role to legacy UI role constants.
 */
export function mapRoleToLegacy(role: string): string {
  if (role === 'Admin') return 'TCC_ADMIN'
  if (role === 'SchoolStaff') return 'SCHOOL_STAFF'
  if (role === 'PsgVolunteer') return 'PSG'
  return 'UNKNOWN'
}

export function mapRoleFromLegacy(role: string): string {
  if (role === 'TCC_ADMIN') return 'Admin'
  if (role === 'SCHOOL_STAFF') return 'SchoolStaff'
  if (role === 'PSG') return 'PsgVolunteer'
  return 'Parent'
}

/**
 * Get default route for UI role.
 */
export function getDefaultRouteForRole(role: string): string {
  switch (role) {
    case 'TCC_ADMIN':
      return '/analytics/overview'
    case 'SCHOOL_STAFF':
    case 'PSG':
      return '/analytics/school'
    default:
      return '/inventory'
  }
}

export function setRoleInSession(role: string) {
  try {
    sessionStorage.setItem('userRole', role)
  } catch {
    // ignore
  }
}

export function setTokensInSession(accessToken?: string | null, refreshToken?: string | null) {
  try {
    if (typeof window !== 'undefined') {
      if (accessToken) {
        sessionStorage.setItem('access_token', accessToken)
      } else {
        sessionStorage.removeItem('access_token')
      }
      if (refreshToken) {
        sessionStorage.setItem('refresh_token', refreshToken)
      } else {
        sessionStorage.removeItem('refresh_token')
      }
    }
  } catch {
    // ignore
  }
}

export function getTokensFromSession(): { access_token: string | null; refresh_token: string | null } {
  try {
    if (typeof window !== 'undefined') {
      return {
        access_token: sessionStorage.getItem('access_token'),
        refresh_token: sessionStorage.getItem('refresh_token'),
      }
    }
  } catch {
    // ignore
  }
  return { access_token: null, refresh_token: null }
}

export function getRoleFromSession(): string {
  try {
    const stored = sessionStorage.getItem('userRole')
    if (stored) return stored

    const profile = sessionStorage.getItem('userProfile')
    if (profile) {
      const parsed = JSON.parse(profile)
      if (parsed.role) {
        const legacy = mapRoleToLegacy(parsed.role)
        setRoleInSession(legacy)
        return legacy
      }
    }
    return 'UNKNOWN'
  } catch {
    return 'UNKNOWN'
  }
}

export function getUserProfileFromSession(): any | null {
  try {
    if (typeof window === 'undefined') return null
    const profile = sessionStorage.getItem('userProfile')
    return profile ? JSON.parse(profile) : null
  } catch {
    return null
  }
}

export function getUserSchoolFromSession(): { id: number; name: string; logoUrl?: string | null } | null {
  const profile = getUserProfileFromSession()
  return profile?.school || null
}

export async function fetchUserProfile(): Promise<any> {
  try {
    const res = await fetch('/api/users/me')
    if (res.ok) {
      const data = await res.json()
      sessionStorage.setItem('userProfile', JSON.stringify(data))
      const legacyRole = mapRoleToLegacy(data.role)
      setRoleInSession(legacyRole)
      if (data.school) {
        // Emit school-changed event for header
        window.dispatchEvent(
          new CustomEvent('school-changed', {
            detail: { schoolName: data.school.name, logoUrl: `/api/school/${data.school.id}/logo` }
          })
        )
      }
      return data
    }
  } catch (err) {
    console.error('Failed to fetch user profile:', err)
  }
  return null
}

export async function clearAuthSession() {
  try {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
  } catch (err) {
    console.error('Supabase signout error:', err)
  }
  try {
    sessionStorage.clear()
    localStorage.clear()
    // Trigger auth change event
    window.dispatchEvent(new Event('auth-changed'))
  } catch (err) {
    // ignore
  }
}
