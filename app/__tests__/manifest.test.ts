import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('app/manifest.json', () => {
  const manifestPath = path.resolve(process.cwd(), 'app/manifest.json')
  const publicDir = path.resolve(process.cwd(), 'public')

  it('exists and is valid JSON', () => {
    expect(fs.existsSync(manifestPath)).toBe(true)
    const raw = fs.readFileSync(manifestPath, 'utf-8')
    expect(() => JSON.parse(raw)).not.toThrow()
  })

  it('contains all required W3C PWA installability fields', () => {
    const raw = fs.readFileSync(manifestPath, 'utf-8')
    const manifest = JSON.parse(raw)

    // Identity and URLs
    expect(manifest.id).toBe('/')
    expect(manifest.start_url).toBe('/')
    expect(manifest.scope).toBe('/')

    // Names
    expect(manifest.name).toBe('U-Track - The Circular Classroom')
    expect(manifest.short_name).toBe('U-Track')
    expect(manifest.short_name.length).toBeLessThanOrEqual(12)
    expect(manifest.description).toBeDefined()
    expect(manifest.description.length).toBeGreaterThan(10)

    // Visual appearance
    expect(manifest.display).toBe('standalone')
    expect(Array.isArray(manifest.display_override)).toBe(true)
    expect(manifest.display_override).toContain('standalone')
    expect(manifest.orientation).toBe('portrait-primary')
    expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/)
    expect(manifest.theme_color.toLowerCase()).toBe('#69aa56')
    expect(manifest.background_color).toMatch(/^#[0-9a-fA-F]{6}$/)

    // Metadata
    expect(Array.isArray(manifest.categories)).toBe(true)
    expect(manifest.categories).toContain('sustainability')
    expect(manifest.categories).toContain('education')
    expect(manifest.lang).toBe('en')
    expect(manifest.dir).toBe('ltr')
    expect(manifest.prefer_related_applications).toBe(false)
  })

  it('specifies valid icons with both any and maskable purposes matching real files', () => {
    const raw = fs.readFileSync(manifestPath, 'utf-8')
    const manifest = JSON.parse(raw)

    expect(Array.isArray(manifest.icons)).toBe(true)
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2)

    const sizes = manifest.icons.map((icon: any) => icon.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')

    const purposes = manifest.icons.map((icon: any) => icon.purpose)
    expect(purposes).toContain('any')
    expect(purposes).toContain('maskable')

    for (const icon of manifest.icons) {
      expect(icon.src.startsWith('/')).toBe(true)
      expect(icon.type).toBe('image/png')
      expect(['any', 'maskable', 'monochrome']).toContain(icon.purpose)

      // Verify the referenced icon file physically exists in public/
      const diskPath = path.join(publicDir, icon.src.replace(/^\//, ''))
      expect(fs.existsSync(diskPath)).toBe(true)
    }
  })

  it('specifies valid shortcuts pointing to key application sections', () => {
    const raw = fs.readFileSync(manifestPath, 'utf-8')
    const manifest = JSON.parse(raw)

    expect(Array.isArray(manifest.shortcuts)).toBe(true)
    expect(manifest.shortcuts.length).toBeGreaterThanOrEqual(4)

    const urls = manifest.shortcuts.map((s: any) => s.url)
    expect(urls).toContain('/inventory')
    expect(urls).toContain('/donation-drives')
    expect(urls).toContain('/analytics/school')
    expect(urls).toContain('/analytics/overview')

    for (const shortcut of manifest.shortcuts) {
      expect(shortcut.name).toBeDefined()
      expect(shortcut.url.startsWith('/')).toBe(true)
      expect(shortcut.description).toBeDefined()

      if (shortcut.icons) {
        for (const icon of shortcut.icons) {
          const diskPath = path.join(publicDir, icon.src.replace(/^\//, ''))
          expect(fs.existsSync(diskPath)).toBe(true)
        }
      }
    }
  })
})
