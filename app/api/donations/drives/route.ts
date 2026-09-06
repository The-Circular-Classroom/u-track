import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/roles'
import { clampPageSize } from '@/lib/pagination'
import { prisma } from '@/lib/prisma/client'

/**
 * GET /api/donations/drives - List donation drives with active filter and pagination.
 * Scoped to school (via query param or user's school).
 * PsgVolunteer+ role required for read.
 * Requirements: 8.2
 */
export async function GET(request: NextRequest) {
  const role = request.headers.get('x-user-role')
  if (!requireRole(role, 'PsgVolunteer')) {
    return NextResponse.json(
      { error: 'forbidden', message: 'PsgVolunteer access required' },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const rawPageSize = parseInt(searchParams.get('pageSize') || '', 10)
  const pageSize = clampPageSize(isNaN(rawPageSize) ? null : rawPageSize)
  const schoolId = searchParams.get('schoolId')
    ? parseInt(searchParams.get('schoolId')!, 10)
    : undefined
  const active = searchParams.get('active')

  // Build filter
  const where: Record<string, unknown> = {}

  if (schoolId) {
    where.schoolId = schoolId
  }

  // Active filter: drives where current date is between startDate and endDate
  if (active === 'true') {
    const now = new Date()
    where.startDate = { lte: now }
    where.endDate = { gte: now }
  } else if (active === 'false') {
    const now = new Date()
    where.OR = [
      { startDate: { gt: now } },
      { endDate: { lt: now } },
    ]
  }

  const [drives, total] = await Promise.all([
    prisma.donationDrive.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { startDate: 'desc' },
      include: {
        school: { select: { id: true, schoolName: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    }),
    prisma.donationDrive.count({ where }),
  ])

  return NextResponse.json({
    drives,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  })
}

/**
 * POST /api/donations/drives - Create a new donation drive.
 * SchoolStaff+ role required for write.
 * Requirements: 8.2
 */
export async function POST(request: NextRequest) {
  const role = request.headers.get('x-user-role')
  if (!requireRole(role, 'PsgVolunteer')) {
    return NextResponse.json(
      { error: 'forbidden', message: 'PsgVolunteer access required' },
      { status: 403 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'invalid_body', message: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  // Support both camelCase and snake_case field names
  const driveName = (body.driveName ?? body.drive_name) as string | undefined
  const startDate = (body.startDate ?? body.start_date) as string | undefined
  const endDate = (body.endDate ?? body.end_date) as string | undefined
  const location = body.location as string | undefined
  const schoolId = (body.schoolId ?? body.school_id) as number | undefined
  const createdByUserId = (body.createdByUserId ?? body.created_by_user_id) as number | undefined

  if (!driveName || !startDate || !endDate || !location || !createdByUserId) {
    return NextResponse.json(
      {
        error: 'missing_field',
        message: 'driveName, startDate, endDate, location, and createdByUserId are required',
      },
      { status: 400 }
    )
  }

  const start = new Date(startDate)
  const end = new Date(endDate)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json(
      { error: 'invalid_date', message: 'startDate and endDate must be valid dates' },
      { status: 400 }
    )
  }

  if (start > end) {
    return NextResponse.json(
      { error: 'invalid_date_range', message: 'startDate must be before or equal to endDate' },
      { status: 400 }
    )
  }

  try {
    const drive = await prisma.donationDrive.create({
      data: {
        driveName,
        startDate: start,
        endDate: end,
        location,
        schoolId: schoolId ?? null,
        createdByUserId,
      },
      include: {
        school: { select: { id: true, schoolName: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    })

    return NextResponse.json({ drive }, { status: 201 })
  } catch (error: unknown) {
    const prismaError = error as { code?: string }
    if (prismaError.code === 'P2003') {
      return NextResponse.json(
        { error: 'invalid_reference', message: 'Referenced school or user does not exist' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'database_error', message: 'Failed to create donation drive' },
      { status: 500 }
    )
  }
}
