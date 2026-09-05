'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getRoleFromSession } from '@/utils/auth'

import LoadingSpinner from '@/components/ui/LoadingSpinner'
import CustomErrorButton from '@/components/ui/CustomErrorButton'
import { parseApiResponse } from '@/utils/apiResponse'

export default function InventoryPage() {
  const [role, setRole] = useState('UNKNOWN')
  const isAdmin = role === 'TCC_ADMIN'
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRole(getRoleFromSession())
  }, [])

  const initInventory = useCallback(async () => {
    try {
      setLoading(true)
      const stored = sessionStorage.getItem('_invSelectedSchool')
      if (stored) {
        router.replace('/inventory/items/school')
        return
      }

      const response = await fetch('/api/inventory/balance')
      if (!response.ok) throw new Error('Failed to fetch inventory data')

      const { payload } = await parseApiResponse(response)
      const balances = payload.balances || payload.data || []

      if (isAdmin) {
        const schoolMap = new Map<number, any>()
        balances.forEach((item: any) => {
          if (item.itemType?.school) {
            const s = item.itemType.school
            if (!schoolMap.has(s.id)) {
              schoolMap.set(s.id, {
                id: s.id,
                schoolName: s.schoolName,
                logoUrl: s.logoUrl || `/api/school/${s.id}/logo`,
              })
            }
          }
        })
        const schoolsArray = Array.from(schoolMap.values()).sort((a, b) =>
          String(a?.schoolName || '').localeCompare(String(b?.schoolName || ''))
        )
        if (schoolsArray.length > 0) {
          sessionStorage.setItem('_invSelectedSchool', JSON.stringify(schoolsArray[0]))
          window.dispatchEvent(new CustomEvent('school-changed', {
            detail: { logoUrl: schoolsArray[0].logoUrl, schoolName: schoolsArray[0].schoolName },
          }))
        }
      } else {
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
      }
      router.replace('/inventory/items/school')
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize inventory')
      setLoading(false)
    }
  }, [isAdmin, router])

  useEffect(() => {
    if (role === 'UNKNOWN') return
    initInventory()
  }, [role, initInventory])

  if (error) {
    return (
      <CustomErrorButton
        title="Error Loading Inventory"
        message={error}
        onRetry={() => {
          setError(null)
          initInventory()
        }}
      />
    )
  }

  return <LoadingSpinner message="Loading inventory items..." />
}
