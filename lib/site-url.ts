/**
 * Helper to determine the application canonical base URL.
 * Checks environment variables in priority order:
 * 1. NEXT_PUBLIC_APP_URL
 * 2. NEXT_PUBLIC_SITE_URL
 * 3. VERCEL_PROJECT_PRODUCTION_URL
 * 4. VERCEL_URL
 * 5. Default fallback: https://u-track.circularclassroom.org
 */
export const DEFAULT_APP_URL = 'https://u-track.circularclassroom.org'

export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/+$/, '')
  }

  if (process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
    return process.env.NEXT_PUBLIC_SITE_URL.trim().replace(/\/+$/, '')
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()) {
    const domain = process.env.VERCEL_PROJECT_PRODUCTION_URL.trim().replace(/\/+$/, '')
    return domain.startsWith('http://') || domain.startsWith('https://')
      ? domain
      : `https://${domain}`
  }

  if (process.env.VERCEL_URL?.trim()) {
    const domain = process.env.VERCEL_URL.trim().replace(/\/+$/, '')
    return domain.startsWith('http://') || domain.startsWith('https://')
      ? domain
      : `https://${domain}`
  }

  return DEFAULT_APP_URL
}
