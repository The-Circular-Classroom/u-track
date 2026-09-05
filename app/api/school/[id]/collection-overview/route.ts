import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/roles'
import { prisma } from '@/lib/prisma/client'
import { createApiLogger } from '@/lib/logger'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const logger = createApiLogger('GET /api/school/[id]/collection-overview')
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

  try {
    const balances = await prisma.inventoryBalance.findMany({
      where: {
        ...(isAll ? {} : { itemType: { schoolId } }),
        quantity: { gt: 0 }
      },
      include: {
        itemType: {
          include: {
            category: true
          }
        }
      }
    })

    const totals = {
      totalPieces: 0,
      schoolStock: 0,
      psg: 0,
      repurposing: 0,
      waste: 0,
      totalWeightKg: 0,
    }

    for (const balance of balances) {
      const qty = balance.quantity ?? 0
      const categoryWeight = Number(balance.itemType?.category?.weightKg || 0)
      const weightKg = categoryWeight * qty
      const status = balance.itemStatus

      totals.totalPieces += qty
      totals.totalWeightKg += weightKg

      if (status === 'GeneralOffice' && balance.storedAt === 'School') {
        totals.schoolStock += qty
      } else if (status === 'ForSale' && balance.storedAt === 'School') {
        totals.psg += qty
      } else if (status === 'ForRepurpose' && balance.storedAt === 'TCC') {
        totals.repurposing += qty
      } else if (status === 'Disposed' && balance.storedAt === 'Exited') {
        totals.waste += qty
      }
    }

    totals.totalWeightKg = Number(totals.totalWeightKg.toFixed(3))

    const percentages = {
      schoolStock: totals.totalPieces > 0 ? Number(((totals.schoolStock / totals.totalPieces) * 100).toFixed(1)) : 0,
      psg: totals.totalPieces > 0 ? Number(((totals.psg / totals.totalPieces) * 100).toFixed(1)) : 0,
      repurposing: totals.totalPieces > 0 ? Number(((totals.repurposing / totals.totalPieces) * 100).toFixed(1)) : 0,
      waste: totals.totalPieces > 0 ? Number(((totals.waste / totals.totalPieces) * 100).toFixed(1)) : 0,
    }

    return NextResponse.json({
      success: true,
      message: 'School collection overview retrieved successfully',
      data: {
        schoolId,
        ...totals,
        percentages,
      },
    })
  } catch (error: any) {
    logger.error('Database error fetching collection overview', { error: error?.message })
    return NextResponse.json(
      { error: 'database_error', message: 'Failed to fetch collection overview' },
      { status: 500 }
    )
  }
}
