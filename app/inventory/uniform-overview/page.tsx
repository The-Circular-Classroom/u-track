'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { getRoleFromSession, getUserSchoolFromSession } from '@/utils/auth'
import { groupCategoryName, byCategoryOrder, CATEGORY_DISPLAY_LABELS, getSubCategoryOrder, CATEGORY_ROWS } from '@/utils/categoryOrder'
import { getColourDisplayName } from '@/utils/colourDisplayName'
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Typography,
  SelectChangeEvent
} from '@mui/material'

import UniformOverviewCard from '@/components/UniformOverviewCard'
import ColorCard from '@/components/ColorCard'
import InventoryOverviewCard from '@/components/InventoryOverviewCard'
import InventoryBreakdownCard from '@/components/InventoryBreakdownCard'
import InventorySection from '@/components/InventorySection'
import InventoryBalancePreviewModal from '@/components/InventoryBalancePreviewModal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import CustomErrorButton from '@/components/ui/CustomErrorButton'
import { parseApiResponse } from '@/utils/apiResponse'
import { getUniformImageUrl } from '@/lib/inventory/uniformImageUrl'
import { resolveSchoolLogoUrl } from '@/lib/school/logo'

const toTitleCase = (str: string) => {
  if (!str) return str
  return str.replace(
    /\w\S*/g,
    (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  )
}

function groupByCategoryGroup(rows: any[], isAdmin: boolean = false) {
  const groupMap = new Map<string, any>()

  rows.forEach((row) => {
    const category = row?.itemType?.category
    const rawName = category?.categoryName || ''
    const groupKey = groupCategoryName(rawName)

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        id: groupKey,
        groupKey,
        displayLabel: (CATEGORY_DISPLAY_LABELS as Record<string, string>)[groupKey] || rawName,
        category: category,
        rawNameSet: new Map<string, any>(),
        schoolStock: 0,
        psgActivities: 0,
        forRepurposing: 0,
        recyclingDisposal: 0,
        items: [],
        colors: new Map<string, any>(),
      })
    }

    const entry = groupMap.get(groupKey)

    if (!entry.rawNameSet.has(rawName)) {
      entry.rawNameSet.set(rawName, { category, items: [] })
    }
    entry.rawNameSet.get(rawName).items.push(row)

    if (row.itemStatus === 'GeneralOffice' && row.storedAt === 'School')
      entry.schoolStock += row.quantity
    if (row.itemStatus === 'ForSale' && row.storedAt === 'School')
      entry.psgActivities += row.quantity
    if (row.itemStatus === 'ForRepurpose' && row.storedAt === 'TCC')
      entry.forRepurposing += row.quantity
    if (row.itemStatus === 'Disposed' && row.storedAt === 'Exited')
      entry.recyclingDisposal += row.quantity

    entry.items.push(row)

    const colorName = row?.itemType?.primaryColour?.colourName
    const colorHex =
      row?.itemType?.primaryColour?.hexcode ||
      row?.itemType?.primaryColour?.hexCode ||
      row?.itemType?.primaryColour?.colourHex ||
      row?.itemType?.primaryColour?.hex

    if (colorName && !entry.colors.has(colorName)) {
      entry.colors.set(colorName, { colorName, colorHex })
    }
  })

  return Array.from(groupMap.values()).map((g) => {
    const subCategories = (Array.from(g.rawNameSet.entries()) as [string, any][])
      .sort(([a], [b]) => getSubCategoryOrder(a) - getSubCategoryOrder(b))
      .map(([rawName, sub]: [string, any]) => ({
        rawName,
        category: sub.category,
        items: sub.items,
        imageUrl: sub.items[0]?.itemType?.imageUrl || null,
      }))

    const isMulti = subCategories.length > 1

    return {
      ...g,
      subCategories,
      isMulti,
      imageUrl: isMulti ? null : (subCategories[0]?.imageUrl || null),
      totalQuantity: isAdmin
        ? g.schoolStock + g.psgActivities + g.forRepurposing
        : g.schoolStock + g.psgActivities,
      colorOptions: Array.from(g.colors.values()),
      colorCount: g.colors.size,
    }
  })
}

function expandByGender(groupedCards: any[], isAdmin: boolean = false) {
  const result: any[] = []

  groupedCards.forEach((card) => {
    const hasF = card.items.some((r: any) => r.itemType?.gender === 'Female')
    const hasM = card.items.some((r: any) => r.itemType?.gender === 'Male')

    if (!hasF || !hasM) {
      result.push(card)
      return
    }

    const makeGenderCard = (gender: 'Female' | 'Male', suffix: string) => {
      const filteredItems = card.items.filter((r: any) => r.itemType?.gender === gender)
      const schoolStock = filteredItems.filter((r: any) => r.itemStatus === 'GeneralOffice' && r.storedAt === 'School').reduce((s: number, r: any) => s + (r.quantity || 0), 0)
      const psgActivities = filteredItems.filter((r: any) => r.itemStatus === 'ForSale' && r.storedAt === 'School').reduce((s: number, r: any) => s + (r.quantity || 0), 0)
      const forRepurposing = filteredItems.filter((r: any) => r.itemStatus === 'ForRepurpose' && r.storedAt === 'TCC').reduce((s: number, r: any) => s + (r.quantity || 0), 0)
      const recyclingDisposal = filteredItems.filter((r: any) => r.itemStatus === 'Disposed' && r.storedAt === 'Exited').reduce((s: number, r: any) => s + (r.quantity || 0), 0)

      const colorMap = new Map<string, any>()
      filteredItems.forEach((r: any) => {
        const colorName = r?.itemType?.primaryColour?.colourName
        const colorHex = r?.itemType?.primaryColour?.hexcode || r?.itemType?.primaryColour?.hexCode ||
          r?.itemType?.primaryColour?.colourHex || r?.itemType?.primaryColour?.hex
        if (colorName && !colorMap.has(colorName)) colorMap.set(colorName, { colorName, colorHex })
      })

      const subRawMap = new Map<string, any>()
      filteredItems.forEach((r: any) => {
        const rawName = r?.itemType?.category?.categoryName || ''
        if (!subRawMap.has(rawName)) subRawMap.set(rawName, { category: r?.itemType?.category, items: [] })
        subRawMap.get(rawName).items.push(r)
      })
      const subCategories = (Array.from(subRawMap.entries()) as [string, any][])
        .sort(([a], [b]) => getSubCategoryOrder(a) - getSubCategoryOrder(b))
        .map(([rawName, sub]: [string, any]) => ({
          rawName,
          category: sub.category,
          items: sub.items,
          imageUrl: sub.items[0]?.itemType?.imageUrl || null,
        }))
      const isMulti = subCategories.length > 1

      return {
        ...card,
        id: `${card.id}_${gender.toLowerCase()}`,
        displayLabel: `${card.displayLabel} (${suffix})`,
        items: filteredItems,
        schoolStock,
        psgActivities,
        forRepurposing,
        recyclingDisposal,
        totalQuantity: isAdmin
          ? schoolStock + psgActivities + forRepurposing
          : schoolStock + psgActivities,
        colorOptions: Array.from(colorMap.values()),
        colorCount: colorMap.size,
        colors: colorMap,
        subCategories,
        isMulti,
        imageUrl: isMulti ? null : (subCategories[0]?.imageUrl || null),
        _gender: gender,
      }
    }

    result.push(makeGenderCard('Female', 'Female'))
    result.push(makeGenderCard('Male', 'Male'))
  })

  return result
}

function buildColors(items: any[], isAdmin: boolean = false) {
  const colorMap = new Map<string, any>()

  items.forEach((item) => {
    const colorName = item?.itemType?.primaryColour?.colourName
    if (!colorName) return

    if (!colorMap.has(colorName)) {
      colorMap.set(colorName, {
        colorName,
        displayName: getColourDisplayName(colorName, isAdmin),
        colorHex:
          item?.itemType?.primaryColour?.hexcode ||
          item?.itemType?.primaryColour?.hexCode ||
          item?.itemType?.primaryColour?.colourHex ||
          item?.itemType?.primaryColour?.hex ||
          null,
        totalQuantity: 0,
        items: [],
      })
    }

    const colorData = colorMap.get(colorName)
    colorData.totalQuantity += item.quantity
    colorData.items.push(item)
  })

  return Array.from(colorMap.values())
}

export default function UniformOverviewPage() {
  const [role, setRole] = useState('UNKNOWN')
  const isAdmin = role === 'TCC_ADMIN'

  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedSchoolId, setSelectedSchoolId] = useState('')
  const [search, setSearch] = useState('')

  const [viewLevel, setViewLevel] = useState<'cards' | 'colors' | 'items'>('cards')
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null)
  const [colors, setColors] = useState<any[]>([])
  const [selectedColor, setSelectedColor] = useState<any | null>(null)

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewItem, setPreviewItem] = useState<any | null>(null)

  const isSingleColor = colors.length === 1

  const openPreview = useCallback((item: any) => {
    setPreviewItem(item)
    setPreviewOpen(true)
  }, [])

  const closePreview = useCallback(() => {
    setPreviewOpen(false)
    setPreviewItem(null)
  }, [])

  useEffect(() => {
    setRole(getRoleFromSession())
  }, [])

  const fetchBalances = useCallback(async () => {
    try {
      setLoading(true)
      const userSchool = getUserSchoolFromSession()
      const url = (!isAdmin && userSchool?.id)
        ? `/api/inventory/balance?schoolId=${userSchool.id}`
        : '/api/inventory/balance'
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch inventory data')

      const { payload } = await parseApiResponse(response)
      const balances = payload.balances || []

      // Client-side fallback: enrich imageUrl if the API didn't set it
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      balances.forEach((balance: any) => {
        const itemType = balance?.itemType
        if (itemType) {
          const categoryName = itemType.category?.categoryName ?? null
          const colourName = itemType.primaryColour?.colourName ?? null
          itemType.imageUrl = getUniformImageUrl(supabaseUrl, categoryName, colourName, itemType.imageUrl)
        }
      })

      setRows(balances)
      setError(null)
    } catch (err: any) {
      console.error('Error fetching uniform overview:', err)
      setError(err.message || 'Error fetching uniform overview')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBalances()
  }, [fetchBalances])

  const schools = useMemo(() => {
    const map = new Map<number, any>()
    rows.forEach((row) => {
      const school = row?.itemType?.school
      if (school?.id && !map.has(school.id)) {
        map.set(school.id, {
          id: school.id,
          schoolName: school.schoolName,
          logoUrl: resolveSchoolLogoUrl(school.logoUrl, school.id),
        })
      }
    })
    return Array.from(map.values()).sort((a, b) =>
      String(a.schoolName || '').localeCompare(String(b.schoolName || ''))
    )
  }, [rows])

  useEffect(() => {
    if (!isAdmin) {
      const userSchool = getUserSchoolFromSession()
      if (userSchool?.id) {
        if (selectedSchoolId !== String(userSchool.id)) {
          setSelectedSchoolId(String(userSchool.id))
        }
        return
      }
    }
    if (
      schools.length > 0 &&
      (!selectedSchoolId || (selectedSchoolId !== 'all' && !schools.some((s) => String(s.id) === String(selectedSchoolId))))
    ) {
      setSelectedSchoolId(String(schools[0].id))
    }
  }, [schools, selectedSchoolId, isAdmin])

  const showSchoolSelector = isAdmin && schools.length > 1

  const cards = useMemo(() => {
    if (!selectedSchoolId) return []
    const scoped = selectedSchoolId === 'all'
      ? rows
      : rows.filter(
          (row) => String(row?.itemType?.school?.id) === String(selectedSchoolId)
        )
    const sorted = groupByCategoryGroup(scoped, isAdmin).sort(
      byCategoryOrder((c: any) => c?.groupKey)
    )
    return expandByGender(sorted, isAdmin).filter((card: any) => card.totalQuantity > 0)
  }, [rows, selectedSchoolId, isAdmin])

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return cards
    return cards.filter((c) => {
      const name = String(c?.category?.categoryName || '').toLowerCase()
      const label = String(c?.displayLabel || '').toLowerCase()
      return name.includes(q) || label.includes(q)
    })
  }, [cards, search])

  const rowCards = useMemo(() => {
    return CATEGORY_ROWS.map((rowKeys) => {
      return rowKeys.flatMap((key) => {
        return filteredCards.filter((c: any) => c?.groupKey === key)
      })
    }).filter((row) => row.length > 0)
  }, [filteredCards])

  const filteredColors = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return colors
    return colors.filter((c) =>
      String(c?.displayName || c?.colorName || '')
        .toLowerCase()
        .includes(q)
    )
  }, [colors, search])

  const baseInventoryData = useMemo(() => {
    if (!selectedColor) return []
    return selectedColor.items || []
  }, [selectedColor])

  const selectedSchool = useMemo(() => {
    const found = schools.find((s) => String(s.id) === String(selectedSchoolId))
    if (found) return found
    if (!isAdmin) {
      const userSchool = getUserSchoolFromSession()
      if (userSchool?.id) {
        return {
          id: userSchool.id,
          schoolName: userSchool.name,
          logoUrl: resolveSchoolLogoUrl(userSchool.logoUrl, userSchool.id),
        }
      }
    }
    return null
  }, [schools, selectedSchoolId, isAdmin])

  const handleCardClick = (card: any) => {
    const cols = buildColors(card.items, isAdmin)
    setSelectedCategory(card)
    setColors(cols)
    setSearch('')

    if (cols.length === 1) {
      setSelectedColor(cols[0])
      setViewLevel('items')
    } else {
      setSelectedColor(null)
      setViewLevel('colors')
    }
  }

  const handleColorClick = (color: any) => {
    setSelectedColor(color)
    setSearch('')
    setViewLevel('items')
  }

  const handleBackToCards = () => {
    setSelectedCategory(null)
    setSelectedColor(null)
    setColors([])
    setSearch('')
    setViewLevel('cards')
  }

  const handleBackToColors = () => {
    setSelectedColor(null)
    setSearch('')
    setViewLevel('colors')
  }

  const handleSchoolChange = (e: SelectChangeEvent) => {
    setSelectedSchoolId(e.target.value)
  }

  if (loading) {
    return <LoadingSpinner message="Loading uniforms..." />
  }

  if (error) {
    return (
      <CustomErrorButton
        title="Error Loading Uniforms"
        message={error}
        onRetry={() => {
          setError(null)
          fetchBalances()
        }}
      />
    )
  }

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="h4"
          sx={{ fontWeight: 700, color: 'var(--color-darker)' }}
        >
          Uniform Overview
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1 }}>
          View the uniforms from your school
        </Typography>
      </Box>

      <div className="flex items-center gap-3 mb-4">
        {selectedSchoolId !== 'all' && selectedSchool?.logoUrl && (
          <img src={resolveSchoolLogoUrl(selectedSchool.logoUrl, selectedSchool.id)} alt="School Logo" className="h-8 w-auto object-contain" />
        )}
        <h2 className="text-xl font-bold text-gray-900">
          {selectedSchoolId === 'all' ? 'All Schools' : toTitleCase(selectedSchool?.schoolName)}
        </h2>
      </div>

      {viewLevel !== 'cards' && selectedCategory && (
        <div className="mb-4 overflow-x-auto">
          <nav className="flex items-center gap-2 text-sm whitespace-nowrap">
            <button
              type="button"
              onClick={handleBackToCards}
              className="cursor-pointer text-[var(--color-main)] hover:underline"
            >
              Uniforms
            </button>

            <span className="text-gray-400">/</span>

            {viewLevel === 'items' && isSingleColor ? (
              <span className="text-gray-900 font-semibold">
                {`${selectedColor?.displayName || getColourDisplayName(selectedColor?.colorName, isAdmin)} ${selectedCategory?.category?.categoryName || ''}`.trim()}
              </span>
            ) : (
              <button
                type="button"
                onClick={handleBackToColors}
                className={`cursor-pointer ${
                  viewLevel === 'colors'
                    ? 'text-gray-900 font-semibold'
                    : 'text-[var(--color-main)] hover:underline'
                }`}
              >
                {selectedCategory?.category?.categoryName}
              </button>
            )}

            {viewLevel === 'items' && !isSingleColor && (
              <>
                <span className="text-gray-400">/</span>
                <span className="text-gray-900 font-semibold">
                  {selectedColor?.displayName || getColourDisplayName(selectedColor?.colorName, isAdmin)}
                </span>
              </>
            )}
          </nav>
        </div>
      )}

      {viewLevel !== 'items' && (
        <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:items-center">
          {viewLevel === 'cards' && showSchoolSelector && (
            <FormControl size="small" sx={{ minWidth: 260 }}>
              <InputLabel id="school-label">School</InputLabel>
              <Select
                labelId="school-label"
                label="School"
                value={selectedSchoolId}
                onChange={handleSchoolChange}
              >
                <MenuItem value="all">All Schools</MenuItem>
                {schools.map((s) => (
                  <MenuItem key={s.id} value={String(s.id)}>
                    {toTitleCase(s.schoolName)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {(viewLevel === 'colors' || selectedSchoolId) && isAdmin && (
            <div className="w-full sm:w-[320px]">
              <TextField
                size="small"
                fullWidth
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  viewLevel === 'colors'
                    ? 'Search colours...'
                    : 'Search uniforms...'
                }
              />
            </div>
          )}
        </div>
      )}

      {viewLevel === 'cards' && (
        <>
          {filteredCards.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              {showSchoolSelector && !selectedSchoolId
                ? 'Select a school to view its uniforms.'
                : 'No uniforms found.'}
            </Typography>
          )}

          {rowCards.length > 0 && (
            <div className="space-y-6">
              {rowCards.map((row, rowIdx) => (
                <div key={rowIdx} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {row.map((itemType, index) => (
                    <UniformOverviewCard
                      key={itemType.id || `${rowIdx}-${index}`}
                      itemType={itemType}
                      onClick={() => handleCardClick(itemType)}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {viewLevel === 'colors' && (
        <>
          {filteredColors.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No colours found.
            </Typography>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {filteredColors.map((color, index) => (
                <ColorCard
                  key={`${color.colorName}-${index}`}
                  color={color}
                  onClick={() => handleColorClick(color)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {viewLevel === 'items' && (
        <>
          <InventoryOverviewCard
            items={baseInventoryData}
            selectedItemType={selectedCategory}
            selectedColor={selectedColor}
            isAdmin={isAdmin}
          />
          <InventoryBreakdownCard items={baseInventoryData} isAdmin={isAdmin} schoolLogoUrl={null} />

          <InventorySection
            title="Available for School Stock"
            items={baseInventoryData.filter(
              (r: any) => r.itemStatus === 'GeneralOffice' && r.storedAt === 'School'
            )}
            onRowClick={(item: any) => openPreview(item)}
          />

          <Box sx={{ mt: 3 }}>
            <InventorySection
              title="Reserved for PSG Activities"
              items={baseInventoryData.filter(
                (r: any) => r.itemStatus === 'ForSale' && r.storedAt === 'School'
              )}
              onRowClick={(item: any) => openPreview(item)}
            />
          </Box>

          {isAdmin && (
            <Box sx={{ mt: 3 }}>
              <InventorySection
                title="For Repurposing"
                items={baseInventoryData.filter(
                  (r: any) => r.itemStatus === 'ForRepurpose' && r.storedAt === 'TCC'
                )}
                onRowClick={(item: any) => openPreview(item)}
              />
            </Box>
          )}
        </>
      )}

      <InventoryBalancePreviewModal
        isOpen={previewOpen}
        onClose={closePreview}
        item={previewItem}
      />
    </Box>
  )
}
