'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getRoleFromSession } from '@/utils/auth'
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

import SchoolCard from '@/components/SchoolCard'
import Pagination from '@/components/ui/Pagination'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import CustomErrorButton from '@/components/ui/CustomErrorButton'
import { parseApiResponse } from '@/utils/apiResponse'

const CARDS_PER_PAGE = 12

function getSchoolMainLevelValue(school: any) {
  if (!school) return ''
  const rawValue =
    school.mainLevel || school.mainlevelCode || school.mainlevel_code || school.main_level || ''
  if (typeof rawValue === 'string') return rawValue.trim()
  if (typeof rawValue === 'object') {
    return (
      rawValue.code || rawValue.mainlevelCode || rawValue.mainlevel_code ||
      rawValue.label || rawValue.name || ''
    )
  }
  return String(rawValue || '').trim()
}

export default function InventoryPage() {
  const [role, setRole] = useState('UNKNOWN')
  const isAdmin = role === 'TCC_ADMIN'
  const router = useRouter()

  const [schools, setSchools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mainlevelFilter, setMainlevelFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [schoolsPage, setSchoolsPage] = useState(1)

  useEffect(() => {
    setRole(getRoleFromSession())
  }, [])

  const initNonAdmin = useCallback(async () => {
    try {
      const response = await fetch('/api/inventory/balance')
      if (!response.ok) throw new Error('Failed to fetch inventory data')

      const { payload } = await parseApiResponse(response)
      const balances = payload.balances || payload.data || []
      const school = balances?.[0]?.itemType?.school || null

      if (school?.id) {
        const logoUrl = school.logoUrl || `/api/school/${school.id}/logo`
        sessionStorage.setItem('_invSelectedSchool', JSON.stringify({
          id: school.id,
          schoolName: school.schoolName,
          logoUrl,
        }))
        window.dispatchEvent(new CustomEvent('school-changed', {
          detail: { logoUrl, schoolName: school.schoolName },
        }))
      }
      router.replace('/inventory/items/school')
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize school scope')
      setLoading(false)
    }
  }, [router])

  const fetchSchools = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/inventory/balance')
      if (!response.ok) throw new Error('Failed to fetch inventory data')

      const { payload } = await parseApiResponse(response)
      const items = payload.balances || payload.data || []

      const schoolMap = new Map<number, any>()
      items.forEach((item: any) => {
        if (item.itemType?.school) {
          const s = item.itemType.school
          if (!schoolMap.has(s.id)) {
            schoolMap.set(s.id, { ...s, itemTypeCount: new Set(), totalQuantity: 0 })
          }
          const entry = schoolMap.get(s.id)
          entry.itemTypeCount.add(item.itemTypeId)
          entry.totalQuantity += item.quantity
        }
      })
      const schoolsArray = Array.from(schoolMap.values()).map((s) => ({
        ...s,
        itemTypeCount: s.itemTypeCount.size,
      }))

      // Load school profile codes
      const profiles = await Promise.allSettled(
        schoolsArray.map(async (school) => {
          const r = await fetch(`/api/school/${school.id}/profile`)
          if (!r.ok) throw new Error(`Failed to fetch school profile ${school.id}`)
          const profileResult = await r.json()
          return {
            id: school.id,
            mainlevelCode: profileResult?.mainlevelCode || profileResult?.data?.mainlevelCode || '',
          }
        })
      )
      const profileMap = new Map(
        profiles.filter((r) => r.status === 'fulfilled').map((r: any) => [r.value.id, r.value.mainlevelCode])
      )
      setSchools(schoolsArray.map((s) => {
        const code = profileMap.get(s.id) || ''
        return { ...s, mainlevelCode: code, mainLevel: code }
      }))
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch schools')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (role === 'UNKNOWN') return
    if (!isAdmin) {
      initNonAdmin()
    } else {
      fetchSchools()
    }
  }, [role, isAdmin, fetchSchools, initNonAdmin])

  const handleSchoolClick = (school: any) => {
    sessionStorage.setItem('_invSelectedSchool', JSON.stringify(school))
    router.push('/inventory/items/school')
  }

  const mainlevelOptions = useMemo(() => {
    const values = new Set<string>()
    schools.forEach((s) => {
      const code = getSchoolMainLevelValue(s)
      if (code) values.add(code)
    })
    return Array.from(values).sort((a, b) => String(a).localeCompare(String(b)))
  }, [schools])

  const filteredSchools = useMemo(() => {
    const q = search.trim().toLowerCase()
    return schools
      .filter((s) => {
        const code = getSchoolMainLevelValue(s)
        const matchesSearch = !q || String(s?.schoolName || '').toLowerCase().includes(q)
        const matchesMainlevel = mainlevelFilter === 'All' || String(code || '') === String(mainlevelFilter)
        return matchesSearch && matchesMainlevel
      })
      .sort((a, b) => String(a?.schoolName || '').localeCompare(String(b?.schoolName || '')))
  }, [schools, search, mainlevelFilter])

  useEffect(() => {
    setSchoolsPage(1)
  }, [search, mainlevelFilter])

  const schoolsTotalPages = Math.max(1, Math.ceil(filteredSchools.length / CARDS_PER_PAGE))
  const paginatedSchools = filteredSchools.slice(
    (schoolsPage - 1) * CARDS_PER_PAGE,
    schoolsPage * CARDS_PER_PAGE
  )

  const handleMainlevelChange = (e: SelectChangeEvent) => {
    setMainlevelFilter(e.target.value)
  }

  if (loading) return <LoadingSpinner message="Loading items..." />

  if (error) {
    return (
      <CustomErrorButton
        title="Error Loading Inventory"
        message={error}
        onRetry={() => {
          setError(null)
          setLoading(true)
          if (!isAdmin) initNonAdmin()
          else fetchSchools()
        }}
      />
    )
  }

  if (!isAdmin) return <LoadingSpinner message="Redirecting..." />

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--color-darker)' }}>
          Inventory by Items
        </Typography>
      </Box>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <nav className="flex items-center gap-2 text-sm whitespace-nowrap">
          <span className="text-gray-900 font-semibold">Schools</span>
        </nav>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="mainlevel-label">Main Level</InputLabel>
            <Select
              labelId="mainlevel-label"
              label="Main Level"
              value={mainlevelFilter}
              onChange={handleMainlevelChange}
            >
              <MenuItem value="All"><em>All</em></MenuItem>
              {mainlevelOptions.map((v) => (
                <MenuItem key={v} value={v}>{v}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <div className="w-full sm:w-[320px]">
            <TextField
              size="small"
              fullWidth
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search schools..."
            />
          </div>
        </div>
      </div>

      {filteredSchools.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {paginatedSchools.map((school) => (
              <SchoolCard key={school.id} school={school} onClick={() => handleSchoolClick(school)} />
            ))}
          </div>
          <Pagination
            currentPage={schoolsPage}
            totalPages={schoolsTotalPages}
            onPageChange={setSchoolsPage}
          />
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">No schools found.</Typography>
      )}
    </Box>
  )
}
