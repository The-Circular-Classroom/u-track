'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getRoleFromSession } from '@/utils/auth'
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
} from '@mui/material'

import LoadingSpinner from '@/components/ui/LoadingSpinner'
import CustomErrorButton from '@/components/ui/CustomErrorButton'
import { parseApiResponse } from '@/utils/apiResponse'

export default function InventoryPage() {
  const [role, setRole] = useState('UNKNOWN')
  const isAdmin = role === 'TCC_ADMIN'
  const router = useRouter()

  const [schools, setSchools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

      // Sort schools alphabetically
      schoolsArray.sort((a, b) => String(a?.schoolName || '').localeCompare(String(b?.schoolName || '')))
      setSchools(schoolsArray)
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
            <InputLabel id="school-label">School</InputLabel>
            <Select
              labelId="school-label"
              label="School"
              value="All"
              onChange={(e) => {
                if (e.target.value !== 'All') {
                  const school = schools.find((s) => s.id === e.target.value)
                  if (school) handleSchoolClick(school)
                }
              }}
            >
              <MenuItem value="All"><em>All</em></MenuItem>
              {schools.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.schoolName}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
      </div>
    </Box>
  )
}
