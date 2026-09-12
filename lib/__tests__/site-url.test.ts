import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getBaseUrl, DEFAULT_APP_URL } from '../site-url'

describe('getBaseUrl utility', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.NEXT_PUBLIC_SITE_URL
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL
    delete process.env.VERCEL_URL
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns default fallback when no env variables are set', () => {
    expect(getBaseUrl()).toBe(DEFAULT_APP_URL)
  })

  it('prioritizes NEXT_PUBLIC_APP_URL over other env variables', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://custom-app.org'
    process.env.NEXT_PUBLIC_SITE_URL = 'https://custom-site.org'
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'custom-vercel.app'
    process.env.VERCEL_URL = 'preview.vercel.app'

    expect(getBaseUrl()).toBe('https://custom-app.org')
  })

  it('strips trailing slashes from NEXT_PUBLIC_APP_URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://custom-app.org///'
    expect(getBaseUrl()).toBe('https://custom-app.org')
  })

  it('uses NEXT_PUBLIC_SITE_URL if NEXT_PUBLIC_APP_URL is not set', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://site-url.org/'
    expect(getBaseUrl()).toBe('https://site-url.org')
  })

  it('uses VERCEL_PROJECT_PRODUCTION_URL when present and prepends https:// if missing', () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'u-track-production.vercel.app'
    expect(getBaseUrl()).toBe('https://u-track-production.vercel.app')
  })

  it('preserves existing protocol in VERCEL_PROJECT_PRODUCTION_URL', () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'https://u-track-production.vercel.app/'
    expect(getBaseUrl()).toBe('https://u-track-production.vercel.app')
  })

  it('uses VERCEL_URL when VERCEL_PROJECT_PRODUCTION_URL is not set', () => {
    process.env.VERCEL_URL = 'u-track-git-feat.vercel.app'
    expect(getBaseUrl()).toBe('https://u-track-git-feat.vercel.app')
  })
})
