import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { getTokensFromSession, setTokensInSession } from '@/utils/auth'

export const DEFAULT_PUBLIC_WEBSITE_PROD_URL = 'https://www.circularclassroom.org'
export const DEFAULT_PUBLIC_WEBSITE_STAGING_URL = 'https://staging.circularclassroom.org'

export interface PublicWebsiteConfig {
  prodUrl: string
  stagingUrl: string
}

/**
 * Get configured public website URLs with sensible defaults.
 */
export function getPublicWebsiteConfig(): PublicWebsiteConfig {
  const prodUrl =
    process.env.NEXT_PUBLIC_PUBLIC_WEBSITE_PROD_URL?.trim() ||
    DEFAULT_PUBLIC_WEBSITE_PROD_URL
  const stagingUrl =
    process.env.NEXT_PUBLIC_PUBLIC_WEBSITE_STAGING_URL?.trim() ||
    DEFAULT_PUBLIC_WEBSITE_STAGING_URL

  return { prodUrl, stagingUrl }
}

/**
 * Construct the public website admin callback URL with encoded tokens.
 */
export function buildPublicWebsiteCallbackUrl(
  baseUrl: string,
  accessToken: string,
  refreshToken: string
): string {
  const cleanBase = baseUrl.replace(/\/+$/, '')
  return `${cleanBase}/admin/auth/callback?access_token=${encodeURIComponent(
    accessToken
  )}&refresh_token=${encodeURIComponent(refreshToken)}`
}

/**
 * Initiate IdP redirect to the public website admin callback endpoint.
 * Retrieves tokens from active Supabase session (with fallback to session storage).
 */
export async function redirectToPublicWebsiteStage(
  targetBaseUrl: string
): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    const supabase = createSupabaseBrowserClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const sessionTokens = getTokensFromSession()
    const accessToken = session?.access_token || sessionTokens.access_token
    const refreshToken = session?.refresh_token || sessionTokens.refresh_token

    if (session) {
      setTokensInSession(session.access_token, session.refresh_token)
    }

    if (accessToken && refreshToken) {
      const callbackUrl = buildPublicWebsiteCallbackUrl(
        targetBaseUrl,
        accessToken,
        refreshToken
      )
      window.open(callbackUrl, '_self', 'noopener,noreferrer')
      return true
    }

    console.warn(
      '[redirectToPublicWebsiteStage] Missing active access_token or refresh_token'
    )
    return false
  } catch (error) {
    console.error(
      '[redirectToPublicWebsiteStage] Failed to redirect to public website:',
      error
    )
    return false
  }
}
