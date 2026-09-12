import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  DEFAULT_PUBLIC_WEBSITE_PROD_URL,
  DEFAULT_PUBLIC_WEBSITE_STAGING_URL,
  getPublicWebsiteConfig,
  buildPublicWebsiteCallbackUrl,
  redirectToPublicWebsiteStage,
} from '../public-website'

const mockGetSession = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getSession: mockGetSession,
    },
  }),
}))

describe('public-website auth helper', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    mockGetSession.mockReset()
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  describe('getPublicWebsiteConfig', () => {
    it('returns default URLs when env variables are not set', () => {
      delete process.env.NEXT_PUBLIC_PUBLIC_WEBSITE_PROD_URL
      delete process.env.NEXT_PUBLIC_PUBLIC_WEBSITE_STAGING_URL

      const config = getPublicWebsiteConfig()
      expect(config.prodUrl).toBe(DEFAULT_PUBLIC_WEBSITE_PROD_URL)
      expect(config.stagingUrl).toBe(DEFAULT_PUBLIC_WEBSITE_STAGING_URL)
    })

    it('returns custom URLs when env variables are provided', () => {
      process.env.NEXT_PUBLIC_PUBLIC_WEBSITE_PROD_URL = 'https://custom-prod.circularclassroom.org'
      process.env.NEXT_PUBLIC_PUBLIC_WEBSITE_STAGING_URL = 'https://custom-staging.circularclassroom.org/'

      const config = getPublicWebsiteConfig()
      expect(config.prodUrl).toBe('https://custom-prod.circularclassroom.org')
      expect(config.stagingUrl).toBe('https://custom-staging.circularclassroom.org/')
    })
  })

  describe('buildPublicWebsiteCallbackUrl', () => {
    it('formats callback url without trailing slash in base url', () => {
      const url = buildPublicWebsiteCallbackUrl(
        'https://www.circularclassroom.org',
        'token-123',
        'refresh-456'
      )
      expect(url).toBe(
        'https://www.circularclassroom.org/admin/auth/callback?access_token=token-123&refresh_token=refresh-456'
      )
    })

    it('strips multiple trailing slashes from base url', () => {
      const url = buildPublicWebsiteCallbackUrl(
        'https://staging.circularclassroom.org///',
        'token-123',
        'refresh-456'
      )
      expect(url).toBe(
        'https://staging.circularclassroom.org/admin/auth/callback?access_token=token-123&refresh_token=refresh-456'
      )
    })

    it('properly URI encodes tokens containing special characters', () => {
      const complexToken = 'header.payload+value/special==&?'
      const url = buildPublicWebsiteCallbackUrl(
        'https://www.circularclassroom.org',
        complexToken,
        'refresh_token_test'
      )
      expect(url).toContain(
        `access_token=${encodeURIComponent(complexToken)}`
      )
      expect(url).not.toContain('header.payload+value/special==&?')
    })
  })

  describe('redirectToPublicWebsiteStage', () => {
    it('opens window with callback url when tokens are available in session', async () => {
      const mockOpen = vi.fn()
      vi.stubGlobal('window', {
        open: mockOpen,
      })

      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'fake-access-token',
            refresh_token: 'fake-refresh-token',
          },
        },
      })

      const success = await redirectToPublicWebsiteStage('https://staging.circularclassroom.org')
      expect(success).toBe(true)
      expect(mockOpen).toHaveBeenCalledWith(
        'https://staging.circularclassroom.org/admin/auth/callback?access_token=fake-access-token&refresh_token=fake-refresh-token',
        '_self',
        'noopener,noreferrer'
      )

      vi.unstubAllGlobals()
    })

    it('returns false when no tokens are found', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: null,
        },
      })

      const success = await redirectToPublicWebsiteStage('https://staging.circularclassroom.org')
      expect(success).toBe(false)
    })
  })
})
