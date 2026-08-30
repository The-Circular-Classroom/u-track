import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/collection/[slug]/route'
import { prisma } from '@/lib/prisma/client'

vi.mock('@/lib/prisma/client', () => ({
  prisma: {
    inventoryBalance: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    donationDrive: {
      findMany: vi.fn(),
    },
    itemType: {
      findMany: vi.fn(),
    },
    transaction: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}))

describe('Public Collection APIs: overall-donations & overall-donations-by-category', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/collection/overall-donations', () => {
    it('allows unauthenticated access without any role or auth header', async () => {
      vi.mocked(prisma.inventoryBalance.findMany).mockResolvedValue([
        {
          quantity: 10,
          itemType: {
            category: { id: 1, categoryName: 'Shirts', weightKg: 0.25 },
          },
        } as any,
      ])

      const request = new NextRequest('http://localhost:3000/api/collection/overall-donations')
      const response = await GET(request, {
        params: Promise.resolve({ slug: 'overall-donations' }),
      })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.message).toBe('Overall inventory count retrieved successfully')
      expect(json.data).toEqual({
        totalCount: 10,
        totalWeight: 2.5,
      })
    })

    it('correctly aggregates multiple items, categories, and rounds weights to 2 decimals', async () => {
      vi.mocked(prisma.inventoryBalance.findMany).mockResolvedValue([
        {
          quantity: 15,
          itemType: {
            category: { id: 1, categoryName: 'Shirts', weightKg: 0.255 },
          },
        } as any,
        {
          quantity: 8,
          itemType: {
            category: { id: 2, categoryName: 'Pants', weightKg: 0.45 },
          },
        } as any,
        {
          quantity: 12,
          itemType: {
            category: { id: 3, categoryName: 'Pinafore', weightKg: 0.333 },
          },
        } as any,
      ])

      const request = new NextRequest('http://localhost:3000/api/collection/overall-donations')
      const response = await GET(request, {
        params: Promise.resolve({ slug: 'overall-donations' }),
      })

      expect(response.status).toBe(200)
      const json = await response.json()

      // Total count = 15 + 8 + 12 = 35
      // Total weight = (15 * 0.255) + (8 * 0.45) + (12 * 0.333) = 3.825 + 3.6 + 3.996 = 11.421 -> rounded to 11.42
      expect(json.data.totalCount).toBe(35)
      expect(json.data.totalWeight).toBe(11.42)
    })

    it('returns zero totals when inventory is empty', async () => {
      vi.mocked(prisma.inventoryBalance.findMany).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/collection/overall-donations')
      const response = await GET(request, {
        params: Promise.resolve({ slug: 'overall-donations' }),
      })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.data).toEqual({
        totalCount: 0,
        totalWeight: 0,
      })
    })

    it('returns 500 when database query fails', async () => {
      vi.mocked(prisma.inventoryBalance.findMany).mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = new NextRequest('http://localhost:3000/api/collection/overall-donations')
      const response = await GET(request, {
        params: Promise.resolve({ slug: 'overall-donations' }),
      })

      expect(response.status).toBe(500)
      const json = await response.json()
      expect(json.error).toBe('database_error')
      expect(json.message).toBe('Database connection failed')
    })
  })

  describe('GET /api/collection/overall-donations-by-category', () => {
    it('groups inventory counts and weights by category and rounds each category weight', async () => {
      vi.mocked(prisma.inventoryBalance.findMany).mockResolvedValue([
        {
          quantity: 10,
          itemType: {
            category: { id: 1, categoryName: 'Shirts', weightKg: 0.255 },
          },
        } as any,
        {
          quantity: 5,
          itemType: {
            category: { id: 1, categoryName: 'Shirts', weightKg: 0.255 },
          },
        } as any,
        {
          quantity: 20,
          itemType: {
            category: { id: 2, categoryName: 'Pants', weightKg: 0.45 },
          },
        } as any,
      ])

      const request = new NextRequest(
        'http://localhost:3000/api/collection/overall-donations-by-category'
      )
      const response = await GET(request, {
        params: Promise.resolve({ slug: 'overall-donations-by-category' }),
      })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.message).toBe('Overall inventory count by category retrieved successfully')
      expect(json.data).toEqual([
        {
          categoryName: 'Shirts',
          totalCount: 15,
          totalWeight: 3.83, // 15 * 0.255 = 3.825 -> 3.83
        },
        {
          categoryName: 'Pants',
          totalCount: 20,
          totalWeight: 9, // 20 * 0.45 = 9.0
        },
      ])
    })
  })
})
