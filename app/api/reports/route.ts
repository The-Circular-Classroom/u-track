import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/roles'
import { prisma } from '@/lib/prisma/client'
import PDFDocument from 'pdfkit'

/**
 * GET /api/reports - PDF report generation endpoint.
 * Generates a PDF report containing:
 * - Current inventory totals
 * - Inventory breakdown by school and by category
 * - Yearly donation trends
 * - School performance rankings
 * - Sustainability metrics (weight diverted from landfill)
 *
 * Query params: year (optional, defaults to current year)
 * SchoolStaff+ role required.
 * Requirements: 9.4
 */
export async function GET(request: NextRequest) {
  const role = request.headers.get('x-user-role')
  if (!requireRole(role, 'SchoolStaff')) {
    return NextResponse.json(
      { error: 'forbidden', message: 'SchoolStaff access required' },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const yearParam = searchParams.get('year')
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear()

  if (isNaN(year) || year < 1) {
    return NextResponse.json(
      { error: 'validation_error', message: 'year must be a positive integer' },
      { status: 400 }
    )
  }

  // Fetch report data in parallel
  const [
    inventoryTotals,
    inventoryBySchool,
    inventoryByCategory,
    yearlyTrends,
    schoolRankings,
    sustainability,
  ] = await Promise.all([
    fetchInventoryTotals(),
    fetchInventoryBySchool(),
    fetchInventoryByCategory(),
    fetchYearlyTrends(year),
    fetchSchoolRankings(year),
    fetchSustainability(year),
  ])

  // Generate PDF
  const pdfBuffer = await generatePdf({
    year,
    inventoryTotals,
    inventoryBySchool,
    inventoryByCategory,
    yearlyTrends,
    schoolRankings,
    sustainability,
  })

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="u-track-report-${year}.pdf"`,
      'Content-Length': String(pdfBuffer.length),
    },
  })
}

// ─── Data fetchers ────────────────────────────────────────────────────────────

interface InventoryTotals {
  totalItems: number
  totalWeightKg: number
}

async function fetchInventoryTotals(): Promise<InventoryTotals> {
  const balances = await prisma.inventoryBalance.findMany({
    where: { quantity: { gt: 0 } },
    select: {
      quantity: true,
      itemType: {
        select: { category: { select: { weightKg: true } } },
      },
    },
  })

  let totalItems = 0
  let totalWeightKg = 0

  for (const b of balances) {
    const qty = b.quantity
    totalItems += qty
    totalWeightKg += Number(b.itemType?.category?.weightKg ?? 0) * qty
  }

  return { totalItems, totalWeightKg: Number(totalWeightKg.toFixed(3)) }
}

interface SchoolBreakdown {
  schoolName: string
  totalItems: number
  totalWeightKg: number
}

async function fetchInventoryBySchool(): Promise<SchoolBreakdown[]> {
  const balances = await prisma.inventoryBalance.findMany({
    where: { quantity: { gt: 0 } },
    select: {
      quantity: true,
      itemType: {
        select: {
          school: { select: { schoolName: true } },
          category: { select: { weightKg: true } },
        },
      },
    },
  })

  const schoolMap: Record<string, SchoolBreakdown> = {}

  for (const b of balances) {
    const schoolName = b.itemType?.school?.schoolName
    if (!schoolName) continue
    const qty = b.quantity
    const weightKg = Number(b.itemType?.category?.weightKg ?? 0) * qty

    if (!schoolMap[schoolName]) {
      schoolMap[schoolName] = { schoolName, totalItems: 0, totalWeightKg: 0 }
    }
    schoolMap[schoolName].totalItems += qty
    schoolMap[schoolName].totalWeightKg += weightKg
  }

  return Object.values(schoolMap)
    .map((s) => ({ ...s, totalWeightKg: Number(s.totalWeightKg.toFixed(3)) }))
    .sort((a, b) => b.totalItems - a.totalItems)
}

interface CategoryBreakdown {
  categoryName: string
  totalItems: number
  totalWeightKg: number
}

async function fetchInventoryByCategory(): Promise<CategoryBreakdown[]> {
  const balances = await prisma.inventoryBalance.findMany({
    where: { quantity: { gt: 0 } },
    select: {
      quantity: true,
      itemType: {
        select: { category: { select: { categoryName: true, weightKg: true } } },
      },
    },
  })

  const categoryMap: Record<string, CategoryBreakdown> = {}

  for (const b of balances) {
    const categoryName = b.itemType?.category?.categoryName
    if (!categoryName) continue
    const qty = b.quantity
    const weightKg = Number(b.itemType?.category?.weightKg ?? 0) * qty

    if (!categoryMap[categoryName]) {
      categoryMap[categoryName] = { categoryName, totalItems: 0, totalWeightKg: 0 }
    }
    categoryMap[categoryName].totalItems += qty
    categoryMap[categoryName].totalWeightKg += weightKg
  }

  return Object.values(categoryMap)
    .map((c) => ({ ...c, totalWeightKg: Number(c.totalWeightKg.toFixed(3)) }))
    .sort((a, b) => b.totalItems - a.totalItems)
}

interface YearTrend {
  year: number
  donated: number
  sold: number
  repurposed: number
  disposed: number
}

async function fetchYearlyTrends(year: number): Promise<YearTrend[]> {
  const startYear = year - 4
  const endYear = year

  const transactions = await prisma.transaction.findMany({
    where: {
      transactionDate: {
        gte: new Date(Date.UTC(startYear, 0, 1)),
        lt: new Date(Date.UTC(endYear + 1, 0, 1)),
      },
      transactionType: { in: ['DonationIn', 'Sale', 'Repurposing', 'Disposal'] },
    },
    select: {
      transactionType: true,
      quantity: true,
      transactionDate: true,
    },
  })

  const yearMap: Record<number, YearTrend> = {}
  for (let y = startYear; y <= endYear; y++) {
    yearMap[y] = { year: y, donated: 0, sold: 0, repurposed: 0, disposed: 0 }
  }

  for (const tx of transactions) {
    const y = new Date(tx.transactionDate).getUTCFullYear()
    if (!yearMap[y]) continue
    const qty = tx.quantity ?? 0
    switch (tx.transactionType) {
      case 'DonationIn': yearMap[y].donated += qty; break
      case 'Sale': yearMap[y].sold += qty; break
      case 'Repurposing': yearMap[y].repurposed += qty; break
      case 'Disposal': yearMap[y].disposed += qty; break
    }
  }

  return Object.values(yearMap).sort((a, b) => a.year - b.year)
}

interface SchoolRanking {
  schoolName: string
  totalDonated: number
  totalSold: number
  totalRepurposed: number
  redistributionRate: number
}

async function fetchSchoolRankings(year: number): Promise<SchoolRanking[]> {
  const start = new Date(Date.UTC(year, 0, 1))
  const end = new Date(Date.UTC(year + 1, 0, 1))

  const transactions = await prisma.transaction.findMany({
    where: {
      transactionDate: { gte: start, lt: end },
      transactionType: { in: ['DonationIn', 'Sale', 'Repurposing'] },
    },
    select: {
      transactionType: true,
      quantity: true,
      itemType: { select: { school: { select: { schoolName: true } } } },
    },
  })

  const schoolMap: Record<string, SchoolRanking> = {}

  for (const tx of transactions) {
    const schoolName = tx.itemType?.school?.schoolName
    if (!schoolName) continue
    const qty = tx.quantity ?? 0

    if (!schoolMap[schoolName]) {
      schoolMap[schoolName] = { schoolName, totalDonated: 0, totalSold: 0, totalRepurposed: 0, redistributionRate: 0 }
    }

    switch (tx.transactionType) {
      case 'DonationIn': schoolMap[schoolName].totalDonated += qty; break
      case 'Sale': schoolMap[schoolName].totalSold += qty; break
      case 'Repurposing': schoolMap[schoolName].totalRepurposed += qty; break
    }
  }

  return Object.values(schoolMap)
    .map((s) => ({
      ...s,
      redistributionRate: s.totalDonated > 0
        ? Number(((s.totalSold / s.totalDonated) * 100).toFixed(1))
        : 0,
    }))
    .sort((a, b) => b.redistributionRate - a.redistributionRate)
}

interface SustainabilityMetrics {
  donatedKg: number
  soldKg: number
  repurposedKg: number
  disposedKg: number
  divertedKg: number
  diversionRate: number
}

async function fetchSustainability(year: number): Promise<SustainabilityMetrics> {
  const start = new Date(Date.UTC(year, 0, 1))
  const end = new Date(Date.UTC(year + 1, 0, 1))

  const transactions = await prisma.transaction.findMany({
    where: {
      transactionDate: { gte: start, lt: end },
      transactionType: { in: ['DonationIn', 'Sale', 'Repurposing', 'Disposal'] },
    },
    select: {
      transactionType: true,
      quantity: true,
      itemType: { select: { category: { select: { weightKg: true } } } },
    },
  })

  const metrics: SustainabilityMetrics = {
    donatedKg: 0,
    soldKg: 0,
    repurposedKg: 0,
    disposedKg: 0,
    divertedKg: 0,
    diversionRate: 0,
  }

  for (const tx of transactions) {
    const qty = tx.quantity ?? 0
    const weightKg = Number(tx.itemType?.category?.weightKg ?? 0) * qty

    switch (tx.transactionType) {
      case 'DonationIn': metrics.donatedKg += weightKg; break
      case 'Sale': metrics.soldKg += weightKg; break
      case 'Repurposing': metrics.repurposedKg += weightKg; break
      case 'Disposal': metrics.disposedKg += weightKg; break
    }
  }

  metrics.divertedKg = metrics.soldKg + metrics.repurposedKg
  const processed = metrics.soldKg + metrics.repurposedKg + metrics.disposedKg
  metrics.diversionRate = processed > 0
    ? Number(((metrics.divertedKg / processed) * 100).toFixed(1))
    : 0

  // Round all kg values
  metrics.donatedKg = Number(metrics.donatedKg.toFixed(3))
  metrics.soldKg = Number(metrics.soldKg.toFixed(3))
  metrics.repurposedKg = Number(metrics.repurposedKg.toFixed(3))
  metrics.disposedKg = Number(metrics.disposedKg.toFixed(3))
  metrics.divertedKg = Number(metrics.divertedKg.toFixed(3))

  return metrics
}

// ─── PDF Generation ───────────────────────────────────────────────────────────

interface ReportData {
  year: number
  inventoryTotals: InventoryTotals
  inventoryBySchool: SchoolBreakdown[]
  inventoryByCategory: CategoryBreakdown[]
  yearlyTrends: YearTrend[]
  schoolRankings: SchoolRanking[]
  sustainability: SustainabilityMetrics
}

async function generatePdf(data: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `U-Track Report ${data.year}`,
        Author: 'U-Track Platform',
        Subject: 'Inventory and Sustainability Report',
      },
    })

    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // ─── Title Page ─────────────────────────────────────────────────────────
    doc.fontSize(24).font('Helvetica-Bold').fillColor('#213c2d')
    doc.text('U-Track Platform Report', { align: 'center' })
    doc.moveDown(0.5)
    doc.fontSize(14).font('Helvetica').fillColor('#6b7280')
    doc.text(`Year: ${data.year}`, { align: 'center' })
    doc.text(`Generated: ${new Date().toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' })}`, { align: 'center' })
    doc.moveDown(2)

    // ─── Inventory Totals ───────────────────────────────────────────────────
    sectionTitle(doc, 'Inventory Totals')
    doc.fontSize(10).font('Helvetica').fillColor('#111827')
    doc.text(`Total Items on Hand: ${fmtNum(data.inventoryTotals.totalItems)}`)
    doc.text(`Total Estimated Weight: ${fmtWeight(data.inventoryTotals.totalWeightKg)}`)
    doc.moveDown(1)

    // ─── Inventory Breakdown by School ──────────────────────────────────────
    sectionTitle(doc, 'Inventory by School')
    if (data.inventoryBySchool.length === 0) {
      doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
      doc.text('No inventory data available.')
    } else {
      // Table header
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#213c2d')
      doc.text('School', 50, doc.y, { continued: true, width: 200 })
      doc.text('Items', 260, doc.y, { continued: true, width: 80, align: 'right' })
      doc.text('Weight (kg)', 350, doc.y, { width: 80, align: 'right' })
      doc.moveDown(0.3)
      drawLine(doc)

      for (const school of data.inventoryBySchool.slice(0, 20)) {
        doc.fontSize(8).font('Helvetica').fillColor('#111827')
        doc.text(school.schoolName, 50, doc.y, { continued: true, width: 200 })
        doc.text(fmtNum(school.totalItems), 260, doc.y, { continued: true, width: 80, align: 'right' })
        doc.text(fmtWeight(school.totalWeightKg), 350, doc.y, { width: 80, align: 'right' })
      }
    }
    doc.moveDown(1)

    // ─── Inventory Breakdown by Category ────────────────────────────────────
    sectionTitle(doc, 'Inventory by Category')
    if (data.inventoryByCategory.length === 0) {
      doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
      doc.text('No inventory data available.')
    } else {
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#213c2d')
      doc.text('Category', 50, doc.y, { continued: true, width: 200 })
      doc.text('Items', 260, doc.y, { continued: true, width: 80, align: 'right' })
      doc.text('Weight (kg)', 350, doc.y, { width: 80, align: 'right' })
      doc.moveDown(0.3)
      drawLine(doc)

      for (const cat of data.inventoryByCategory.slice(0, 20)) {
        doc.fontSize(8).font('Helvetica').fillColor('#111827')
        doc.text(cat.categoryName, 50, doc.y, { continued: true, width: 200 })
        doc.text(fmtNum(cat.totalItems), 260, doc.y, { continued: true, width: 80, align: 'right' })
        doc.text(fmtWeight(cat.totalWeightKg), 350, doc.y, { width: 80, align: 'right' })
      }
    }
    doc.moveDown(1)

    // ─── Yearly Trends ──────────────────────────────────────────────────────
    sectionTitle(doc, 'Yearly Donation Trends')
    if (data.yearlyTrends.length === 0) {
      doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
      doc.text('No trend data available.')
    } else {
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#213c2d')
      doc.text('Year', 50, doc.y, { continued: true, width: 60 })
      doc.text('Donated', 120, doc.y, { continued: true, width: 70, align: 'right' })
      doc.text('Sold', 200, doc.y, { continued: true, width: 70, align: 'right' })
      doc.text('Repurposed', 280, doc.y, { continued: true, width: 80, align: 'right' })
      doc.text('Disposed', 370, doc.y, { width: 70, align: 'right' })
      doc.moveDown(0.3)
      drawLine(doc)

      for (const trend of data.yearlyTrends) {
        doc.fontSize(8).font('Helvetica').fillColor('#111827')
        doc.text(String(trend.year), 50, doc.y, { continued: true, width: 60 })
        doc.text(fmtNum(trend.donated), 120, doc.y, { continued: true, width: 70, align: 'right' })
        doc.text(fmtNum(trend.sold), 200, doc.y, { continued: true, width: 70, align: 'right' })
        doc.text(fmtNum(trend.repurposed), 280, doc.y, { continued: true, width: 80, align: 'right' })
        doc.text(fmtNum(trend.disposed), 370, doc.y, { width: 70, align: 'right' })
      }
    }
    doc.moveDown(1)

    // ─── School Rankings ────────────────────────────────────────────────────
    sectionTitle(doc, `School Performance Rankings (${data.year})`)
    if (data.schoolRankings.length === 0) {
      doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
      doc.text('No ranking data available for this year.')
    } else {
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#213c2d')
      doc.text('#', 50, doc.y, { continued: true, width: 25 })
      doc.text('School', 75, doc.y, { continued: true, width: 170 })
      doc.text('Donated', 250, doc.y, { continued: true, width: 65, align: 'right' })
      doc.text('Sold', 320, doc.y, { continued: true, width: 60, align: 'right' })
      doc.text('Rate', 390, doc.y, { width: 55, align: 'right' })
      doc.moveDown(0.3)
      drawLine(doc)

      for (let i = 0; i < Math.min(data.schoolRankings.length, 20); i++) {
        const school = data.schoolRankings[i]
        doc.fontSize(8).font('Helvetica').fillColor('#111827')
        doc.text(String(i + 1), 50, doc.y, { continued: true, width: 25 })
        doc.text(school.schoolName, 75, doc.y, { continued: true, width: 170 })
        doc.text(fmtNum(school.totalDonated), 250, doc.y, { continued: true, width: 65, align: 'right' })
        doc.text(fmtNum(school.totalSold), 320, doc.y, { continued: true, width: 60, align: 'right' })
        doc.text(`${school.redistributionRate}%`, 390, doc.y, { width: 55, align: 'right' })
      }
    }
    doc.moveDown(1)

    // ─── Sustainability Metrics ─────────────────────────────────────────────
    sectionTitle(doc, `Sustainability Metrics (${data.year})`)
    doc.fontSize(10).font('Helvetica').fillColor('#111827')
    doc.text(`Weight Donated: ${fmtWeight(data.sustainability.donatedKg)}`)
    doc.text(`Weight Sold (Redistributed): ${fmtWeight(data.sustainability.soldKg)}`)
    doc.text(`Weight Repurposed: ${fmtWeight(data.sustainability.repurposedKg)}`)
    doc.text(`Weight Disposed: ${fmtWeight(data.sustainability.disposedKg)}`)
    doc.moveDown(0.5)
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#69aa56')
    doc.text(`Total Weight Diverted from Landfill: ${fmtWeight(data.sustainability.divertedKg)}`)
    doc.text(`Diversion Rate: ${data.sustainability.diversionRate}%`)

    // ─── Footer ─────────────────────────────────────────────────────────────
    doc.moveDown(2)
    doc.fontSize(7).font('Helvetica').fillColor('#9ca3af')
    doc.text('Generated by U-Track Platform • The Circular Classroom', { align: 'center' })

    doc.end()
  })
}

// ─── PDF Helpers ──────────────────────────────────────────────────────────────

function sectionTitle(doc: PDFKit.PDFDocument, text: string) {
  doc.moveDown(0.8)
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#213c2d')
  doc.text(text)
  doc.moveDown(0.3)
}

function drawLine(doc: PDFKit.PDFDocument) {
  const y = doc.y
  doc.moveTo(50, y).lineTo(545, y).lineWidth(0.5).strokeColor('#e5e7eb').stroke()
  doc.y = y + 4
}

function fmtNum(n: number): string {
  return n.toLocaleString('en-SG')
}

function fmtWeight(kg: number): string {
  return `${kg.toLocaleString('en-SG', { minimumFractionDigits: 1, maximumFractionDigits: 3 })} kg`
}
