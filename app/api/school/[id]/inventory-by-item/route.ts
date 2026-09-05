import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/roles'
import { prisma } from '@/lib/prisma/client'
import { createApiLogger } from '@/lib/logger'

interface RouteParams {
  params: Promise<{ id: string }>
}

const CATEGORY_ORDER = [
  'Uniform Shirt', 'Uniform Shorts', 'Uniform Pants',
  'Uniform Skirt', 'Skort', 'Pinafore', 'Polo Shirt',
  'PE Shirt', 'PE Shorts', 'House Shirt', 'Tie', 'Belt'
]

export async function GET(request: NextRequest, { params }: RouteParams) {
  const logger = createApiLogger('GET /api/school/[id]/inventory-by-item')
  const role = request.headers.get('x-user-role')
  const { id: schoolIdRaw } = await params

  if (!requireRole(role, 'PsgVolunteer')) {
    return NextResponse.json(
      { error: 'forbidden', message: 'PsgVolunteer access required' },
      { status: 403 }
    )
  }

  const isAll = schoolIdRaw === 'all'
  const schoolId = isAll ? undefined : parseInt(schoolIdRaw, 10)
  if (!isAll && isNaN(schoolId!)) {
    return NextResponse.json(
      { error: 'invalid_id', message: 'School ID must be a valid integer' },
      { status: 400 }
    )
  }

  const { searchParams } = new URL(request.url)
  const isAdmin = searchParams.get('isAdmin') === 'true' || role === 'Admin'

  try {
    const balances = await prisma.inventoryBalance.findMany({
      where: {
        ...(isAll ? {} : { itemType: { schoolId } }),
        quantity: { gt: 0 }
      },
      include: {
        itemType: {
          include: {
            category: true,
            primaryColour: true,
            secondaryColour: true
          }
        },
        sizeOption: true
      }
    })

    const itemMap: Record<number, any> = {}

    for (const balance of balances) {
      const itemType = balance.itemType
      if (!itemType) continue

      const qty = balance.quantity ?? 0
      const status = balance.itemStatus

      let group = ''
      if (status === 'GeneralOffice' && balance.storedAt === 'School') group = 'schoolStock'
      else if (status === 'ForSale' && balance.storedAt === 'School') group = 'psg'
      else if (status === 'ForRepurpose' && balance.storedAt === 'TCC') group = 'repurposing'
      else if (status === 'Disposed' && balance.storedAt === 'Exited') group = 'waste'

      if (!isAdmin && (group === 'repurposing' || group === 'waste')) continue

      if (!itemMap[itemType.id]) {
        itemMap[itemType.id] = {
          itemTypeId: itemType.id,
          categoryId: itemType.category?.id ?? null,
          categoryName: itemType.category?.categoryName ?? 'Unknown',
          gender: itemType.gender,
          imageUrl: itemType.imageUrl,
          primaryColour: itemType.primaryColour ?? null,
          secondaryColour: itemType.secondaryColour ?? null,
          weightKg: Number(itemType.category?.weightKg || 0),
          totalPieces: 0,
          schoolStock: 0,
          psg: 0,
          repurposing: 0,
          waste: 0,
          sizes: {}
        }
      }

      const entry = itemMap[itemType.id]
      entry.totalPieces += qty
      if (group === 'schoolStock') entry.schoolStock += qty
      else if (group === 'psg') entry.psg += qty
      else if (group === 'repurposing') entry.repurposing += qty
      else if (group === 'waste') entry.waste += qty

      if (balance.sizeOption && (isAdmin || group === 'schoolStock' || group === 'psg')) {
        const sizeKey = balance.sizeOption.id
        if (!entry.sizes[sizeKey]) {
          entry.sizes[sizeKey] = {
            sizeOptionId: balance.sizeOption.id,
            sizeName: balance.sizeOption.sizeName,
            sizeClass: balance.sizeOption.sizeClass,
            sortOrder: balance.sizeOption.sortOrder,
            schoolStock: 0,
            psg: 0,
            repurposing: 0,
            waste: 0,
            total: 0
          }
        }

        entry.sizes[sizeKey].total += qty
        if (group === 'schoolStock') entry.sizes[sizeKey].schoolStock += qty
        else if (group === 'psg') entry.sizes[sizeKey].psg += qty
        else if (group === 'repurposing') entry.sizes[sizeKey].repurposing += qty
        else if (group === 'waste') entry.sizes[sizeKey].waste += qty
      }
    }

    const result = Object.values(itemMap)
      .map((item: any) => ({
        ...item,
        sizes: Object.values(item.sizes).sort((a: any, b: any) => a.sortOrder - b.sortOrder),
        estimatedWeightKg: Number((item.totalPieces * item.weightKg).toFixed(3))
      }))
      .sort((a: any, b: any) => {
        const ai = CATEGORY_ORDER.indexOf(a.categoryName)
        const bi = CATEGORY_ORDER.indexOf(b.categoryName)
        if (ai === -1 && bi === -1) return a.categoryName.localeCompare(b.categoryName)
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      })

    return NextResponse.json({
      success: true,
      message: 'School inventory by item retrieved successfully',
      data: {
        schoolId,
        isAdmin,
        items: result
      }
    })
  } catch (error: any) {
    logger.error('Database error fetching inventory by item', { error: error?.message })
    return NextResponse.json(
      { error: 'database_error', message: 'Failed to fetch inventory' },
      { status: 500 }
    )
  }
}
