import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import sitemap from '../sitemap'

describe('app/sitemap.ts', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns valid array of sitemap entries with default domain', () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    const entries = sitemap()

    expect(Array.isArray(entries)).toBe(true)
    expect(entries.length).toBeGreaterThanOrEqual(4)

    const urls = entries.map((e) => e.url)
    expect(urls).toContain('https://u-track.circularclassroom.org')
    expect(urls).toContain('https://u-track.circularclassroom.org/auth/login')
    expect(urls).toContain('https://u-track.circularclassroom.org/auth/signup')
    expect(urls).toContain('https://u-track.circularclassroom.org/faq')

    for (const entry of entries) {
      expect(entry.url).toMatch(/^https:\/\//)
      expect(entry.lastModified).toBeInstanceOf(Date)
      expect(entry.priority).toBeGreaterThanOrEqual(0)
      expect(entry.priority).toBeLessThanOrEqual(1)
      expect(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']).toContain(
        entry.changeFrequency
      )
    }
  })

  it('uses NEXT_PUBLIC_APP_URL for all URLs when set', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://custom.circularclassroom.org'
    const entries = sitemap()

    for (const entry of entries) {
      expect(entry.url.startsWith('https://custom.circularclassroom.org')).toBe(true)
    }
  })
})
