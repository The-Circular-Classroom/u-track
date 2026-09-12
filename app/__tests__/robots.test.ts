import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import robots from '../robots'

describe('app/robots.ts', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns valid MetadataRoute.Robots with default domain', () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    const config = robots()

    expect(config.sitemap).toBe('https://u-track.circularclassroom.org/sitemap.xml')
    expect(config.rules).toBeDefined()

    const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules
    expect(rules.userAgent).toBe('*')
    expect(rules.allow).toContain('/')
    expect(rules.allow).toContain('/auth/login')
    expect(rules.allow).toContain('/faq')

    expect(rules.disallow).toContain('/api/')
    expect(rules.disallow).toContain('/inventory/')
    expect(rules.disallow).toContain('/analytics/')
    expect(rules.disallow).toContain('/users/')
  })

  it('uses NEXT_PUBLIC_APP_URL for sitemap URL when provided', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://custom.circularclassroom.org'
    const config = robots()

    expect(config.sitemap).toBe('https://custom.circularclassroom.org/sitemap.xml')
  })
})
