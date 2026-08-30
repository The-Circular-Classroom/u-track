import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/roles'
import { prisma } from '@/lib/prisma/client'

interface RouteParams {
  params: Promise<{ slug: string }>
}

function getYearRange(year: number) {
  return {
    start: new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0))
  }
}

function getMonthConstrainedRange(year: number, startMonth: number | null, endMonth: number | null) {
  const safeStartMonth = startMonth ?? 1
  const safeEndMonth = endMonth ?? 12

  return {
    start: new Date(Date.UTC(year, safeStartMonth - 1, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(year, safeEndMonth, 1, 0, 0, 0, 0))
  }
}

async function buildDrivePerformance({
  schoolId,
  activeOnly,
  year,
  startMonth,
  endMonth
}: {
  schoolId: number | null
  activeOnly: boolean
  year: number | null
  startMonth: number | null
  endMonth: number | null
}) {
  const driveWhere: any = {}
  if (schoolId) {
    driveWhere.schoolId = schoolId
  }
  if (activeOnly) {
    const now = new Date()
    driveWhere.startDate = { lte: now }
    driveWhere.endDate = { gte: now }
  }

  let drives = await prisma.donationDrive.findMany({
    where: driveWhere,
    include: {
      school: true
    },
    orderBy: { startDate: 'desc' }
  })

  const range = year ? getMonthConstrainedRange(year, startMonth, endMonth) : { start: null, end: null }
  if (year && range.start && range.end) {
    drives = drives.filter(
      (drive) => new Date(drive.startDate) < range.end! && new Date(drive.endDate) >= range.start!
    )
  }

  const txWhere: any = {
    transactionType: 'DonationIn',
    donationDriveId: { not: null }
  }
  if (schoolId) {
    txWhere.itemType = { schoolId }
  }
  if (activeOnly) {
    const now = new Date()
    txWhere.donationDrive = {
      startDate: { lte: now },
      endDate: { gte: now }
    }
  } else if (year && range.start && range.end) {
    txWhere.transactionDate = {
      gte: range.start,
      lt: range.end
    }
  }

  const transactions = await prisma.transaction.findMany({
    where: txWhere,
    include: {
      donationDrive: true,
      sizeOption: true,
      itemType: {
        include: { category: true }
      }
    }
  })

  const driveMap: Record<number, any> = {}
  for (const drive of drives) {
    driveMap[drive.id] = {
      driveId: drive.id,
      driveName: drive.driveName,
      schoolId: drive.school?.id ?? null,
      schoolName: drive.school?.schoolName ?? 'Unknown',
      location: drive.location,
      startDate: drive.startDate.toISOString(),
      endDate: drive.endDate.toISOString(),
      isActive: drive.startDate <= new Date() && drive.endDate >= new Date(),
      transactionCount: 0,
      totalQuantity: 0,
      totalEstimatedWeightKg: 0,
      categories: {},
      sizes: {}
    }
  }

  for (const tx of transactions) {
    const drive = tx.donationDrive
    const category = tx.itemType?.category
    const sizeOption = tx.sizeOption
    if (!drive || !driveMap[drive.id] || !category) continue

    const qty = tx.quantity ?? 0
    const weightKg = Number(category.weightKg || 0) * qty
    const driveEntry = driveMap[drive.id]

    driveEntry.transactionCount += 1
    driveEntry.totalQuantity += qty
    driveEntry.totalEstimatedWeightKg += weightKg

    if (!driveEntry.categories[category.id]) {
      driveEntry.categories[category.id] = {
        categoryId: category.id,
        categoryName: category.categoryName,
        totalQuantity: 0,
        totalEstimatedWeightKg: 0
      }
    }
    driveEntry.categories[category.id].totalQuantity += qty
    driveEntry.categories[category.id].totalEstimatedWeightKg += weightKg

    const sizeKey = sizeOption?.id ?? 'unknown'
    if (!driveEntry.sizes[sizeKey]) {
      driveEntry.sizes[sizeKey] = {
        sizeOptionId: sizeOption?.id ?? null,
        sizeName: sizeOption?.sizeName ?? 'Unknown',
        sizeClass: sizeOption?.sizeClass ?? null,
        totalQuantity: 0
      }
    }
    driveEntry.sizes[sizeKey].totalQuantity += qty
  }

  const now = new Date()
  return Object.values(driveMap)
    .map((drive: any) => {
      const driveStart = new Date(drive.startDate)
      const driveEnd = new Date(drive.endDate)
      const elapsedDays = Math.max(1, Math.ceil((Math.min(now.getTime(), driveEnd.getTime()) - driveStart.getTime()) / (1000 * 60 * 60 * 24)))
      const remainingDays = Math.max(0, Math.ceil((driveEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

      return {
        ...drive,
        totalEstimatedWeightKg: Number(drive.totalEstimatedWeightKg.toFixed(3)),
        averageDailyQuantity: Number((drive.totalQuantity / elapsedDays).toFixed(2)),
        averageDailyWeightKg: Number((drive.totalEstimatedWeightKg / elapsedDays).toFixed(3)),
        remainingDays,
        categories: Object.values(drive.categories)
          .map((cat: any) => ({
            ...cat,
            totalEstimatedWeightKg: Number(cat.totalEstimatedWeightKg.toFixed(3))
          }))
          .sort((a: any, b: any) => b.totalQuantity - a.totalQuantity),
        sizes: Object.values(drive.sizes)
          .sort((a: any, b: any) => b.totalQuantity - a.totalQuantity || String(a.sizeName).localeCompare(String(b.sizeName)))
      }
    })
    .sort((a: any, b: any) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const role = request.headers.get('x-user-role')

  // Public check for overall routes
  const isPublicRoute = slug === 'overall-donations' || slug === 'overall-donations-by-category'
  if (!isPublicRoute && !requireRole(role, 'PsgVolunteer')) {
    return NextResponse.json(
      { error: 'forbidden', message: 'PsgVolunteer access required' },
      { status: 403 }
    )
  }

  try {
    if (slug === 'donation-volume') {
      const schoolIdRaw = searchParams.get('school_id')
      if (!schoolIdRaw) {
        return NextResponse.json({ error: 'missing_field', message: 'Missing required field: school_id' }, { status: 400 })
      }
      const schoolId = parseInt(schoolIdRaw, 10)
      const users = await prisma.user.findMany({
        where: { schoolId },
        select: { id: true }
      })
      const userIds = users.map(u => u.id)

      const [transactions, drives] = await Promise.all([
        prisma.transaction.groupBy({
          by: ['donationDriveId', 'itemTypeId'],
          where: {
            transactionType: 'DonationIn',
            userId: { in: userIds }
          },
          _sum: { quantity: true },
          _count: { id: true }
        }),
        prisma.donationDrive.findMany({
          where: { schoolId },
          select: { id: true, driveName: true, startDate: true, endDate: true }
        })
      ])

      const itemTypeIds = Array.from(new Set(transactions.map(t => t.itemTypeId)))
      const itemTypes = await prisma.itemType.findMany({
        where: { id: { in: itemTypeIds } },
        select: {
          id: true,
          category: { select: { id: true, categoryName: true } }
        }
      })

      const itemTypeMap = Object.fromEntries(itemTypes.map(it => [it.id, it]))
      const driveMap = Object.fromEntries(drives.map(d => [d.id, d]))

      const driveAggMap: Record<number, any> = {}
      for (const t of transactions) {
        const driveId = t.donationDriveId
        if (!driveId) continue
        const itemType = itemTypeMap[t.itemTypeId]
        const category = itemType?.category
        if (!category) continue

        if (!driveAggMap[driveId]) {
          driveAggMap[driveId] = {
            drive: driveMap[driveId] ?? null,
            byCategory: {}
          }
        }

        if (!driveAggMap[driveId].byCategory[category.id]) {
          driveAggMap[driveId].byCategory[category.id] = {
            category,
            totalQuantityDonated: 0,
            transactionCount: 0
          }
        }

        driveAggMap[driveId].byCategory[category.id].totalQuantityDonated += t._sum.quantity ?? 0
        driveAggMap[driveId].byCategory[category.id].transactionCount += t._count.id ?? 0
      }

      const donationVolume = Object.values(driveAggMap).map((entry: any) => ({
        drive: entry.drive,
        byCategory: Object.values(entry.byCategory)
      }))

      return NextResponse.json({ success: true, data: donationVolume })
    }

    if (slug === 'inventory-count') {
      const inventory = await prisma.inventoryBalance.findMany({
        select: {
          quantity: true,
          itemStatus: true,
          storedAt: true,
          itemType: {
            select: {
              id: true,
              school: { select: { id: true, schoolName: true } },
              category: { select: { id: true, categoryName: true } }
            }
          },
          sizeOption: {
            select: {
              id: true,
              sizeName: true,
              sizeClass: true,
              sizeCategory: { select: { id: true, sizeType: true } }
            }
          }
        }
      })

      const grouped: Record<number, any> = {}
      for (const record of inventory) {
        const school = record.itemType?.school
        const category = record.itemType?.category
        const size = record.sizeOption
        if (!school) continue

        if (!grouped[school.id]) {
          grouped[school.id] = {
            schoolId: school.id,
            schoolName: school.schoolName,
            items: {}
          }
        }

        const categoryKey = category?.categoryName ?? 'Unknown'
        if (!grouped[school.id].items[categoryKey]) {
          grouped[school.id].items[categoryKey] = {}
        }

        const sizeKey = size?.sizeName ?? 'Unknown'
        if (!grouped[school.id].items[categoryKey][sizeKey]) {
          grouped[school.id].items[categoryKey][sizeKey] = {
            sizeClass: size?.sizeClass ?? null,
            forSale: 0,
            sold: 0,
            repurposed: 0,
            disposed: 0,
            generalOffice: 0,
            forRepurpose: 0,
            total: 0
          }
        }

        const entry = grouped[school.id].items[categoryKey][sizeKey]
        entry.total += record.quantity

        switch (record.itemStatus) {
          case 'ForSale': entry.forSale += record.quantity; break
          case 'Sold': entry.sold += record.quantity; break
          case 'Repurposed': entry.repurposed += record.quantity; break
          case 'Disposed': entry.disposed += record.quantity; break
          case 'ForRepurpose': entry.forRepurpose += record.quantity; break
          case 'GeneralOffice': entry.generalOffice += record.quantity; break
        }
      }

      return NextResponse.json({ success: true, data: Object.values(grouped) })
    }

    if (slug === 'school-rankings') {
      const yearParam = searchParams.get('year')
      if (!yearParam) {
        return NextResponse.json({ error: 'missing_field', message: 'Missing required field: year' }, { status: 400 })
      }
      const year = parseInt(yearParam, 10)
      const metric = searchParams.get('metric') || 'sellThrough'

      const { start, end } = getYearRange(year)
      const transactions = await prisma.transaction.findMany({
        where: {
          transactionDate: { gte: start, lt: end },
          transactionType: { in: ['DonationIn', 'Sale', 'Repurposing'] }
        },
        include: {
          itemType: {
            include: { school: true }
          }
        }
      })

      const schoolMap: Record<number, any> = {}
      for (const tx of transactions) {
        const school = tx.itemType?.school
        if (!school) continue

        if (!schoolMap[school.id]) {
          schoolMap[school.id] = {
            schoolId: school.id,
            schoolName: school.schoolName,
            totalDonated: 0,
            totalSold: 0,
            totalRepurposed: 0
          }
        }

        if (tx.transactionType === 'DonationIn') {
          schoolMap[school.id].totalDonated += tx.quantity
        } else if (tx.transactionType === 'Sale') {
          schoolMap[school.id].totalSold += tx.quantity
        } else if (tx.transactionType === 'Repurposing') {
          schoolMap[school.id].totalRepurposed += tx.quantity
        }
      }

      const schoolsList = Object.values(schoolMap).map((s: any) => ({
        ...s,
        redistributionRate: s.totalDonated > 0 ? parseFloat(((s.totalSold / s.totalDonated) * 100).toFixed(2)) : 0,
        recoveryRate: s.totalDonated > 0 ? parseFloat((((s.totalSold + s.totalRepurposed) / s.totalDonated) * 100).toFixed(2)) : 0
      }))

      const metricKey = metric === 'recovery' ? 'recoveryRate' : 'redistributionRate'
      const networkAverage =
        schoolsList.length > 0
          ? parseFloat((schoolsList.reduce((sum, s: any) => sum + s[metricKey], 0) / schoolsList.length).toFixed(2))
          : 0

      const ranked = schoolsList
        .map((s: any) => ({
          ...s,
          deviationFromAverage: parseFloat((s[metricKey] - networkAverage).toFixed(2))
        }))
        .sort((a, b) => b[metricKey] - a[metricKey])
        .map((s, idx) => ({ rank: idx + 1, ...s }))

      return NextResponse.json({
        success: true,
        data: {
          metricUsed: metricKey,
          networkAverage,
          lastUpdated: new Date().toISOString(),
          schools: ranked
        }
      })
    }

    if (slug === 'active-drives') {
      const schoolIdRaw = searchParams.get('schoolId')
      const schoolId = schoolIdRaw ? parseInt(schoolIdRaw, 10) : null
      const drives = await buildDrivePerformance({ schoolId, activeOnly: true, year: null, startMonth: null, endMonth: null })

      return NextResponse.json({
        success: true,
        data: {
          filters: { schoolId },
          drives
        }
      })
    }

    if (slug === 'drive-performance') {
      const schoolIdRaw = searchParams.get('schoolId')
      const schoolId = schoolIdRaw ? parseInt(schoolIdRaw, 10) : null
      const yearRaw = searchParams.get('year')
      const year = yearRaw ? parseInt(yearRaw, 10) : null
      const startMonthRaw = searchParams.get('startMonth')
      const startMonth = startMonthRaw ? parseInt(startMonthRaw, 10) : null
      const endMonthRaw = searchParams.get('endMonth')
      const endMonth = endMonthRaw ? parseInt(endMonthRaw, 10) : null
      const activeOnly = searchParams.get('activeOnly') === 'true'

      const drives = await buildDrivePerformance({ schoolId, activeOnly, year, startMonth, endMonth })

      return NextResponse.json({
        success: true,
        data: {
          filters: { schoolId, year, startMonth, endMonth, activeOnly },
          drives
        }
      })
    }

    if (slug === 'donation-breakdown') {
      const schoolIdRaw = searchParams.get('schoolId')
      const schoolId = schoolIdRaw ? parseInt(schoolIdRaw, 10) : null
      const yearRaw = searchParams.get('year')
      const year = yearRaw ? parseInt(yearRaw, 10) : null
      const startMonthRaw = searchParams.get('startMonth')
      const startMonth = startMonthRaw ? parseInt(startMonthRaw, 10) : null
      const endMonthRaw = searchParams.get('endMonth')
      const endMonth = endMonthRaw ? parseInt(endMonthRaw, 10) : null

      const range = year ? getMonthConstrainedRange(year, startMonth, endMonth) : { start: null, end: null }
      const txWhere: any = { transactionType: 'DonationIn' }
      if (schoolId) txWhere.itemType = { schoolId }
      if (range.start && range.end) {
        txWhere.transactionDate = { gte: range.start, lt: range.end }
      }

      const transactions = await prisma.transaction.findMany({
        where: txWhere,
        include: {
          itemType: {
            include: { school: true, category: true }
          },
          sizeOption: true
        }
      })

      const schoolMap: Record<number, any> = {}

      for (const tx of transactions) {
        const school = tx.itemType?.school
        const category = tx.itemType?.category
        const sizeOption = tx.sizeOption
        if (!school || !category) continue

        if (!schoolMap[school.id]) {
          schoolMap[school.id] = {
            schoolId: school.id,
            schoolName: school.schoolName,
            totalQuantity: 0,
            totalEstimatedWeightKg: 0,
            categories: {},
            sizes: {}
          }
        }

        const qty = tx.quantity ?? 0
        const weightKg = Number(category.weightKg || 0) * qty
        schoolMap[school.id].totalQuantity += qty
        schoolMap[school.id].totalEstimatedWeightKg += weightKg

        if (!schoolMap[school.id].categories[category.id]) {
          schoolMap[school.id].categories[category.id] = {
            categoryId: category.id,
            categoryName: category.categoryName,
            totalQuantity: 0,
            totalEstimatedWeightKg: 0
          }
        }
        schoolMap[school.id].categories[category.id].totalQuantity += qty
        schoolMap[school.id].categories[category.id].totalEstimatedWeightKg += weightKg

        const sizeKey = sizeOption?.id ?? 'unknown'
        if (!schoolMap[school.id].sizes[sizeKey]) {
          schoolMap[school.id].sizes[sizeKey] = {
            sizeOptionId: sizeOption?.id ?? null,
            sizeName: sizeOption?.sizeName ?? 'Unknown',
            sizeClass: sizeOption?.sizeClass ?? null,
            totalQuantity: 0
          }
        }
        schoolMap[school.id].sizes[sizeKey].totalQuantity += qty
      }

      const schools = Object.values(schoolMap).map((school: any) => ({
        schoolId: school.schoolId,
        schoolName: school.schoolName,
        totalQuantity: school.totalQuantity,
        totalEstimatedWeightKg: Number(school.totalEstimatedWeightKg.toFixed(3)),
        categories: Object.values(school.categories)
          .map((cat: any) => ({
            ...cat,
            totalEstimatedWeightKg: Number(cat.totalEstimatedWeightKg.toFixed(3))
          }))
          .sort((a: any, b: any) => b.totalQuantity - a.totalQuantity),
        sizes: Object.values(school.sizes)
          .sort((a: any, b: any) => b.totalQuantity - a.totalQuantity || String(a.sizeName).localeCompare(String(b.sizeName)))
      })).sort((a, b) => a.schoolName.localeCompare(b.schoolName))

      return NextResponse.json({
        success: true,
        data: {
          filters: { schoolId, year, startMonth, endMonth },
          schools
        }
      })
    }

    if (slug === 'stock-by-location') {
      const schoolIdRaw = searchParams.get('schoolId')
      const schoolId = schoolIdRaw ? parseInt(schoolIdRaw, 10) : null

      const balanceWhere: any = { quantity: { gt: 0 } }
      if (schoolId) {
        balanceWhere.itemType = { schoolId }
      }

      const balances = await prisma.inventoryBalance.findMany({
        where: balanceWhere,
        include: {
          itemType: {
            include: { school: true, category: true }
          }
        }
      })

      const schoolMap: Record<number, any> = {}

      for (const balance of balances) {
        const school = balance.itemType?.school
        const category = balance.itemType?.category
        if (!school || !category) continue

        if (!schoolMap[school.id]) {
          schoolMap[school.id] = {
            schoolId: school.id,
            schoolName: school.schoolName,
            locations: {}
          }
        }

        const locationKey = balance.storedAt
        if (!schoolMap[school.id].locations[locationKey]) {
          schoolMap[school.id].locations[locationKey] = {
            storedAt: locationKey,
            totalQuantity: 0,
            totalEstimatedWeightKg: 0,
            statuses: {}
          }
        }

        const locEntry = schoolMap[school.id].locations[locationKey]
        const qty = balance.quantity ?? 0
        const weightKg = Number(category.weightKg || 0) * qty

        locEntry.totalQuantity += qty
        locEntry.totalEstimatedWeightKg += weightKg

        const statusKey = balance.itemStatus
        if (!locEntry.statuses[statusKey]) {
          locEntry.statuses[statusKey] = {
            itemStatus: statusKey,
            quantity: 0,
            estimatedWeightKg: 0
          }
        }
        locEntry.statuses[statusKey].quantity += qty
        locEntry.statuses[statusKey].estimatedWeightKg += weightKg
      }

      const schools = Object.values(schoolMap).map((school: any) => ({
        schoolId: school.schoolId,
        schoolName: school.schoolName,
        locations: Object.values(school.locations)
          .map((loc: any) => ({
            storedAt: loc.storedAt,
            totalQuantity: loc.totalQuantity,
            totalEstimatedWeightKg: Number(loc.totalEstimatedWeightKg.toFixed(3)),
            statuses: Object.values(loc.statuses).map((st: any) => ({
              ...st,
              estimatedWeightKg: Number(st.estimatedWeightKg.toFixed(3))
            }))
          }))
          .sort((a: any, b: any) => b.totalQuantity - a.totalQuantity)
      })).sort((a, b) => a.schoolName.localeCompare(b.schoolName))

      return NextResponse.json({
        success: true,
        data: {
          filters: { schoolId },
          schools
        }
      })
    }

    if (slug === 'cooperation-analytics') {
      const yearParam = searchParams.get('year')
      if (!yearParam) {
        return NextResponse.json({ error: 'missing_field', message: 'Missing required field: year' }, { status: 400 })
      }
      const year = parseInt(yearParam, 10)

      const { start, end } = getYearRange(year)
      const transactions = await prisma.transaction.findMany({
        where: {
          transactionDate: { gte: start, lt: end },
          transactionType: { in: ['DonationIn', 'Sale', 'Repurposing', 'Disposal'] }
        },
        include: {
          itemType: {
            include: { school: true, category: true }
          }
        }
      })

      const groups = {
        cooperating: { label: 'Cooperating', schoolIds: new Set<number>(), donated: 0, sold: 0, repurposed: 0, disposed: 0, donatedKg: 0, soldKg: 0, repurposedKg: 0, disposedKg: 0 },
        nonCooperating: { label: 'Non-cooperating', schoolIds: new Set<number>(), donated: 0, sold: 0, repurposed: 0, disposed: 0, donatedKg: 0, soldKg: 0, repurposedKg: 0, disposedKg: 0 }
      }

      for (const tx of transactions) {
        const school = tx.itemType?.school
        const category = tx.itemType?.category
        if (!school || !category) continue

        const group = school.isCooperating ? groups.cooperating : groups.nonCooperating
        const qty = tx.quantity ?? 0
        const weightKg = Number(category.weightKg || 0) * qty
        group.schoolIds.add(school.id)

        if (tx.transactionType === 'DonationIn') {
          group.donated += qty
          group.donatedKg += weightKg
        } else if (tx.transactionType === 'Sale') {
          group.sold += qty
          group.soldKg += weightKg
        } else if (tx.transactionType === 'Repurposing') {
          group.repurposed += qty
          group.repurposedKg += weightKg
        } else if (tx.transactionType === 'Disposal') {
          group.disposed += qty
          group.disposedKg += weightKg
        }
      }

      const groupsData = Object.values(groups).map((group) => {
        const recovered = group.sold + group.repurposed
        const recoveredKg = group.soldKg + group.repurposedKg
        return {
          label: group.label,
          schoolCount: group.schoolIds.size,
          donated: group.donated,
          sold: group.sold,
          repurposed: group.repurposed,
          disposed: group.disposed,
          donatedKg: Number(group.donatedKg.toFixed(3)),
          soldKg: Number(group.soldKg.toFixed(3)),
          repurposedKg: Number(group.repurposedKg.toFixed(3)),
          disposedKg: Number(group.disposedKg.toFixed(3)),
          recovered,
          recoveredKg: Number(recoveredKg.toFixed(3)),
          sellThroughRate: group.donated > 0 ? Number(((group.sold / group.donated) * 100).toFixed(2)) : 0,
          recoveryRate: group.donated > 0 ? Number(((recovered / group.donated) * 100).toFixed(2)) : 0,
          disposalRate: recovered + group.disposed > 0 ? Number(((group.disposed / (recovered + group.disposed)) * 100).toFixed(2)) : 0
        }
      })

      return NextResponse.json({
        success: true,
        data: {
          filters: { year },
          groups: groupsData
        }
      })
    }

    if (slug === 'sustainability') {
      const yearParam = searchParams.get('year')
      if (!yearParam) {
        return NextResponse.json({ error: 'missing_field', message: 'Missing required field: year' }, { status: 400 })
      }
      const year = parseInt(yearParam, 10)
      const schoolIdRaw = searchParams.get('schoolId')
      const schoolId = schoolIdRaw ? parseInt(schoolIdRaw, 10) : null

      const { start, end } = getYearRange(year)
      const txWhere: any = {
        transactionDate: { gte: start, lt: end },
        transactionType: { in: ['DonationIn', 'Sale', 'Repurposing', 'Disposal'] }
      }
      if (schoolId) txWhere.itemType = { schoolId }

      const transactions = await prisma.transaction.findMany({
        where: txWhere,
        include: {
          itemType: {
            include: { category: true }
          }
        }
      })

      const summary = {
        donatedUnits: 0,
        soldUnits: 0,
        repurposedUnits: 0,
        disposedUnits: 0,
        donatedKg: 0,
        soldKg: 0,
        repurposedKg: 0,
        disposedKg: 0
      }
      const categories: Record<number, any> = {}

      for (const tx of transactions) {
        const category = tx.itemType?.category
        if (!category) continue

        const qty = tx.quantity ?? 0
        const weightKg = Number(category.weightKg || 0) * qty

        if (!categories[category.id]) {
          categories[category.id] = {
            categoryId: category.id,
            categoryName: category.categoryName,
            donatedUnits: 0,
            soldUnits: 0,
            repurposedUnits: 0,
            disposedUnits: 0,
            donatedKg: 0,
            soldKg: 0,
            repurposedKg: 0,
            disposedKg: 0
          }
        }

        const categoryEntry = categories[category.id]

        if (tx.transactionType === 'DonationIn') {
          summary.donatedUnits += qty
          summary.donatedKg += weightKg
          categoryEntry.donatedUnits += qty
          categoryEntry.donatedKg += weightKg
        } else if (tx.transactionType === 'Sale') {
          summary.soldUnits += qty
          summary.soldKg += weightKg
          categoryEntry.soldUnits += qty
          categoryEntry.soldKg += weightKg
        } else if (tx.transactionType === 'Repurposing') {
          summary.repurposedUnits += qty
          summary.repurposedKg += weightKg
          categoryEntry.repurposedUnits += qty
          categoryEntry.repurposedKg += weightKg
        } else if (tx.transactionType === 'Disposal') {
          summary.disposedUnits += qty
          summary.disposedKg += weightKg
          categoryEntry.disposedUnits += qty
          categoryEntry.disposedKg += weightKg
        }
      }

      const divertedUnits = summary.soldUnits + summary.repurposedUnits
      const divertedKg = summary.soldKg + summary.repurposedKg

      return NextResponse.json({
        success: true,
        data: {
          filters: { year, schoolId },
          summary: {
            ...summary,
            donatedKg: Number(summary.donatedKg.toFixed(3)),
            soldKg: Number(summary.soldKg.toFixed(3)),
            repurposedKg: Number(summary.repurposedKg.toFixed(3)),
            disposedKg: Number(summary.disposedKg.toFixed(3)),
            divertedUnits,
            divertedKg: Number(divertedKg.toFixed(3)),
            diversionRate: summary.donatedUnits > 0 ? Number(((divertedUnits / summary.donatedUnits) * 100).toFixed(2)) : 0
          },
          categories: Object.values(categories)
            .map((cat: any) => ({
              ...cat,
              donatedKg: Number(cat.donatedKg.toFixed(3)),
              soldKg: Number(cat.soldKg.toFixed(3)),
              repurposedKg: Number(cat.repurposedKg.toFixed(3)),
              disposedKg: Number(cat.disposedKg.toFixed(3))
            }))
            .sort((a: any, b: any) => b.donatedKg - a.donatedKg)
        }
      })
    }

    if (slug === 'funnel') {
      const yearParam = searchParams.get('year')
      if (!yearParam) {
        return NextResponse.json({ error: 'missing_field', message: 'Missing required field: year' }, { status: 400 })
      }
      const year = parseInt(yearParam, 10)
      const schoolIdRaw = searchParams.get('schoolId')
      const schoolId = schoolIdRaw ? parseInt(schoolIdRaw, 10) : null

      const { start, end } = getYearRange(year)
      const txWhere: any = {
        transactionType: { in: ['DonationIn', 'Sale', 'Repurposing', 'Disposal'] },
        transactionDate: { gte: start, lt: end }
      }
      if (schoolId) txWhere.itemType = { schoolId }

      const balanceWhere: any = {}
      if (schoolId) balanceWhere.itemType = { schoolId }

      const [transactions, inventoryBalances] = await Promise.all([
        prisma.transaction.findMany({
          where: txWhere,
          include: {
            itemType: {
              include: { school: true, category: true }
            }
          }
        }),
        prisma.inventoryBalance.findMany({
          where: balanceWhere,
          include: {
            itemType: {
              include: { school: true, category: true }
            }
          }
        })
      ])

      const schoolMap: Record<number, any> = {}

      const ensureSchoolCategory = (schoolIdValue: number, schoolName: string, categoryName: string) => {
        if (!schoolMap[schoolIdValue]) {
          schoolMap[schoolIdValue] = {
            schoolId: schoolIdValue,
            schoolName,
            totals: {
              donated: 0,
              sold: 0,
              repurposed: 0,
              disposed: 0,
              currentForSale: 0,
              currentForRepurpose: 0
            },
            categories: {}
          }
        }

        if (!schoolMap[schoolIdValue].categories[categoryName]) {
          schoolMap[schoolIdValue].categories[categoryName] = {
            categoryName,
            donated: 0,
            sold: 0,
            repurposed: 0,
            disposed: 0,
            currentForSale: 0,
            currentForRepurpose: 0
          }
        }

        return schoolMap[schoolIdValue].categories[categoryName]
      }

      for (const tx of transactions) {
        const school = tx.itemType?.school
        const category = tx.itemType?.category
        if (!school || !category) continue

        const entry = ensureSchoolCategory(school.id, school.schoolName, category.categoryName)
        const qty = tx.quantity ?? 0

        switch (tx.transactionType) {
          case 'DonationIn':
            entry.donated += qty
            schoolMap[school.id].totals.donated += qty
            break
          case 'Sale':
            entry.sold += qty
            schoolMap[school.id].totals.sold += qty
            break
          case 'Repurposing':
            entry.repurposed += qty
            schoolMap[school.id].totals.repurposed += qty
            break
          case 'Disposal':
            entry.disposed += qty
            schoolMap[school.id].totals.disposed += qty
            break
        }
      }

      for (const balance of inventoryBalances) {
        const school = balance.itemType?.school
        const category = balance.itemType?.category
        if (!school || !category) continue

        const entry = ensureSchoolCategory(school.id, school.schoolName, category.categoryName)
        const qty = balance.quantity ?? 0

        if (balance.itemStatus === 'ForSale') {
          entry.currentForSale += qty
          schoolMap[school.id].totals.currentForSale += qty
        } else if (balance.itemStatus === 'ForRepurpose') {
          entry.currentForRepurpose += qty
          schoolMap[school.id].totals.currentForRepurpose += qty
        }
      }

      const schools = Object.values(schoolMap).map((school: any) => {
        const totals = school.totals
        const processed = totals.sold + totals.repurposed + totals.disposed
        const sellThroughRate = totals.donated > 0 ? Number(((totals.sold / totals.donated) * 100).toFixed(2)) : 0
        const recoveryRate = totals.donated > 0 ? Number((((totals.sold + totals.repurposed) / totals.donated) * 100).toFixed(2)) : 0
        const disposalRate = processed > 0 ? Number(((totals.disposed / processed) * 100).toFixed(2)) : 0

        const categories = Object.values(school.categories)
          .map((cat: any) => {
            const catProcessed = cat.sold + cat.repurposed + cat.disposed
            return {
              ...cat,
              sellThroughRate: cat.donated > 0 ? Number(((cat.sold / cat.donated) * 100).toFixed(2)) : 0,
              recoveryRate: cat.donated > 0 ? Number((((cat.sold + cat.repurposed) / cat.donated) * 100).toFixed(2)) : 0,
              disposalRate: catProcessed > 0 ? Number(((cat.disposed / catProcessed) * 100).toFixed(2)) : 0
            }
          })
          .sort((a: any, b: any) => b.donated - a.donated || a.categoryName.localeCompare(b.categoryName))

        return {
          schoolId: school.schoolId,
          schoolName: school.schoolName,
          totals: {
            ...totals,
            sellThroughRate,
            recoveryRate,
            disposalRate
          },
          categories
        }
      }).sort((a, b) => a.schoolName.localeCompare(b.schoolName))

      return NextResponse.json({
        success: true,
        data: {
          filters: { year, schoolId },
          schools
        }
      })
    }

    if (slug === 'monthly-trends') {
      const yearParam = searchParams.get('year')
      if (!yearParam) {
        return NextResponse.json({ error: 'missing_field', message: 'Missing required field: year' }, { status: 400 })
      }
      const year = parseInt(yearParam, 10)
      const schoolIdRaw = searchParams.get('schoolId')
      const schoolId = schoolIdRaw ? parseInt(schoolIdRaw, 10) : null

      const { start, end } = getYearRange(year)
      const txWhere: any = {
        transactionType: { in: ['DonationIn', 'Sale', 'Repurposing', 'Disposal', 'Transfer', 'StatusChange'] },
        transactionDate: { gte: start, lt: end }
      }
      if (schoolId) txWhere.itemType = { schoolId }

      const transactions = await prisma.transaction.findMany({
        where: txWhere,
        include: {
          itemType: {
            include: { school: true, category: true }
          }
        }
      })

      const createMonthlyEntry = (month: number) => ({
        month,
        donated: 0,
        sold: 0,
        repurposed: 0,
        disposed: 0,
        donatedKg: 0,
        soldKg: 0,
        repurposedKg: 0,
        disposedKg: 0,
        transferred: 0,
        statusChanged: 0
      })

      const roundMonthlyWeights = (entry: any) => ({
        ...entry,
        donatedKg: Number(entry.donatedKg.toFixed(3)),
        soldKg: Number(entry.soldKg.toFixed(3)),
        repurposedKg: Number(entry.repurposedKg.toFixed(3)),
        disposedKg: Number(entry.disposedKg.toFixed(3))
      })

      const monthly = Array.from({ length: 12 }, (_, index) => createMonthlyEntry(index + 1))
      const schoolBreakdown: Record<number, any> = {}

      for (const tx of transactions) {
        const monthIndex = new Date(tx.transactionDate).getUTCMonth()
        const school = tx.itemType?.school
        const category = tx.itemType?.category
        if (!school || monthIndex < 0 || monthIndex > 11) continue

        const qty = tx.quantity ?? 0
        const weightKg = Number(category?.weightKg || 0) * qty
        const monthEntry = monthly[monthIndex]

        if (!schoolBreakdown[school.id]) {
          schoolBreakdown[school.id] = {
            schoolId: school.id,
            schoolName: school.schoolName,
            months: Array.from({ length: 12 }, (_, index) => createMonthlyEntry(index + 1))
          }
        }

        const schoolMonthEntry = schoolBreakdown[school.id].months[monthIndex]

        switch (tx.transactionType) {
          case 'DonationIn':
            monthEntry.donated += qty
            monthEntry.donatedKg += weightKg
            schoolMonthEntry.donated += qty
            schoolMonthEntry.donatedKg += weightKg
            break
          case 'Sale':
            monthEntry.sold += qty
            monthEntry.soldKg += weightKg
            schoolMonthEntry.sold += qty
            schoolMonthEntry.soldKg += weightKg
            break
          case 'Repurposing':
            monthEntry.repurposed += qty
            monthEntry.repurposedKg += weightKg
            schoolMonthEntry.repurposed += qty
            schoolMonthEntry.repurposedKg += weightKg
            break
          case 'Disposal':
            monthEntry.disposed += qty
            monthEntry.disposedKg += weightKg
            schoolMonthEntry.disposed += qty
            schoolMonthEntry.disposedKg += weightKg
            break
          case 'Transfer':
            monthEntry.transferred += qty
            schoolMonthEntry.transferred += qty
            break
          case 'StatusChange':
            monthEntry.statusChanged += qty
            schoolMonthEntry.statusChanged += qty
            break
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          filters: { year, schoolId },
          monthly: monthly.map(roundMonthlyWeights),
          schools: Object.values(schoolBreakdown)
            .map((school: any) => ({
              ...school,
              months: school.months.map(roundMonthlyWeights)
            }))
            .sort((a, b) => a.schoolName.localeCompare(b.schoolName))
        }
      })
    }

    if (slug === 'school') {
      const inventory = await prisma.inventoryBalance.findMany({
        include: {
          itemType: {
            include: { school: true }
          }
        }
      })

      const schoolMap: Record<number, any> = {}

      for (const record of inventory) {
        const school = record.itemType?.school
        if (!school) continue

        if (!schoolMap[school.id]) {
          schoolMap[school.id] = {
            schoolId: school.id,
            schoolName: school.schoolName,
            totalItems: 0
          }
        }

        schoolMap[school.id].totalItems += record.quantity
      }

      const result = Object.values(schoolMap).sort((a: any, b: any) => b.totalItems - a.totalItems)

      return NextResponse.json({
        success: true,
        data: result
      })
    }

    if (slug === 'overall-donations') {
      const inventory = await prisma.inventoryBalance.findMany({
        where: {
          quantity: { gt: 0 }
        },
        include: {
          itemType: {
            include: { category: true }
          }
        }
      })

      let totalCount = 0
      let totalWeight = 0

      for (const record of inventory) {
        const category = record.itemType?.category
        if (category) {
          totalCount += record.quantity
          totalWeight += record.quantity * Number(category.weightKg || 0)
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Overall inventory count retrieved successfully',
        data: {
          totalCount,
          totalWeight: Math.round(totalWeight * 100) / 100
        }
      })
    }

    if (slug === 'overall-donations-by-category') {
      const inventory = await prisma.inventoryBalance.findMany({
        where: {
          quantity: { gt: 0 }
        },
        include: {
          itemType: {
            include: { category: true }
          }
        }
      })

      const responseMap: Record<string, any> = {}

      for (const record of inventory) {
        const category = record.itemType?.category
        if (!category) continue

        const name = category.categoryName
        const qty = record.quantity
        const wt = qty * Number(category.weightKg || 0)

        if (!responseMap[name]) {
          responseMap[name] = {
            categoryName: name,
            totalCount: 0,
            totalWeight: 0
          }
        }

        responseMap[name].totalCount += qty
        responseMap[name].totalWeight += wt
      }

      const responseData = Object.values(responseMap).map((cat: any) => ({
        ...cat,
        totalWeight: Math.round(cat.totalWeight * 100) / 100
      }))

      return NextResponse.json({
        success: true,
        message: 'Overall inventory count by category retrieved successfully',
        data: responseData
      })
    }

    return NextResponse.json({ error: 'not_found', message: 'Endpoint not found' }, { status: 404 })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'database_error', message: error?.message || 'Failed to process request' },
      { status: 500 }
    )
  }
}
