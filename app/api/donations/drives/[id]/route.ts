import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/roles'
import { prisma } from '@/lib/prisma/client'
import { createApiLogger } from '@/lib/logger'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/donations/drives/[id] - Get a single donation drive.
 * Scoped to PsgVolunteer+
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const role = request.headers.get('x-user-role')
  const { id } = await params

  if (!requireRole(role, 'PsgVolunteer')) {
    return NextResponse.json(
      { error: 'forbidden', message: 'PsgVolunteer access required' },
      { status: 403 }
    )
  }

  const driveId = parseInt(id, 10)
  if (isNaN(driveId)) {
    return NextResponse.json(
      { error: 'invalid_id', message: 'Drive ID must be a valid integer' },
      { status: 400 }
    )
  }

  const drive = await prisma.donationDrive.findUnique({
    where: { id: driveId },
    include: {
      school: { select: { id: true, schoolName: true } },
      createdBy: { select: { id: true, fullName: true, email: true } }
    }
  })

  if (!drive) {
    return NextResponse.json(
      { error: 'not_found', message: 'Donation drive not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true, data: drive })
}

/**
 * PATCH /api/donations/drives/[id] - Update a donation drive.
 * Scoped to SchoolStaff+
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const role = request.headers.get('x-user-role')
  const { id } = await params

  if (!requireRole(role, 'PsgVolunteer')) {
    return NextResponse.json(
      { error: 'forbidden', message: 'PsgVolunteer access required' },
      { status: 403 }
    )
  }

  const driveId = parseInt(id, 10)
  if (isNaN(driveId)) {
    return NextResponse.json(
      { error: 'invalid_id', message: 'Drive ID must be a valid integer' },
      { status: 400 }
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
  const locationVal = body.location as string | undefined
  const schoolIdVal = (body.schoolId ?? body.school_id) as number | null | undefined
  const startDateStr = (body.startDate ?? body.start_date) as string | undefined
  const endDateStr = (body.endDate ?? body.end_date) as string | undefined

  const updates: Record<string, unknown> = {}
  if (driveName !== undefined) updates.driveName = driveName
  if (locationVal !== undefined) updates.location = locationVal
  if (schoolIdVal !== undefined) updates.schoolId = schoolIdVal

  if (startDateStr !== undefined) {
    const start = new Date(startDateStr)
    if (isNaN(start.getTime())) {
      return NextResponse.json({ error: 'invalid_date', message: 'startDate must be a valid date' }, { status: 400 })
    }
    updates.startDate = start
  }

  if (endDateStr !== undefined) {
    const end = new Date(endDateStr)
    if (isNaN(end.getTime())) {
      return NextResponse.json({ error: 'invalid_date', message: 'endDate must be a valid date' }, { status: 400 })
    }
    updates.endDate = end
  }

  try {
    const updated = await prisma.donationDrive.update({
      where: { id: driveId },
      data: updates,
      include: {
        school: { select: { id: true, schoolName: true } },
        createdBy: { select: { id: true, fullName: true, email: true } }
      }
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return NextResponse.json(
      { error: 'database_error', message: 'Failed to update donation drive' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/donations/drives/[id] - Delete a donation drive.
 * Scoped to PsgVolunteer+
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const role = request.headers.get('x-user-role')
  const { id } = await params

  if (!requireRole(role, 'PsgVolunteer')) {
    return NextResponse.json(
      { error: 'forbidden', message: 'PsgVolunteer access required' },
      { status: 403 }
    )
  }

  const driveId = parseInt(id, 10)
  if (isNaN(driveId)) {
    return NextResponse.json(
      { error: 'invalid_id', message: 'Drive ID must be a valid integer' },
      { status: 400 }
    )
  }

  try {
    await prisma.donationDrive.delete({
      where: { id: driveId }
    })

    return NextResponse.json({ success: true, message: 'Donation drive deleted successfully' })
  } catch (error) {
    return NextResponse.json(
      { error: 'database_error', message: 'Failed to delete donation drive' },
      { status: 500 }
    )
  }
}
