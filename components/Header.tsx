'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import SnackbarAlert from './SnackbarAlert'
import { getRoleFromSession, clearAuthSession, fetchUserProfile, mapRoleFromLegacy } from '@/utils/auth'

const APPS = [
  {
    key: 'school-dashboard',
    label: 'School Dashboard',
    shortLabel: 'Dashboard',
    href: '/analytics/school',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M4 10v10h16V10M9 20v-6h6v6" />
      </svg>
    ),
  },
  {
    key: 'inventory',
    label: 'Uniform Tracker',
    shortLabel: 'Uniform Tracker',
    href: '/inventory',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    key: 'donation-drives',
    label: 'Donation Drives',
    shortLabel: 'Donations',
    href: '/donation-drives',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  {
    key: 'collaborations',
    label: 'Collaborations & Products',
    shortLabel: 'Collaborations',
    href: '/analytics/configuration/products',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
]

const AUTH_ROUTES = ['/auth/login', '/auth/signup', '/auth/forgot-password', '/auth/reset-password']

export default function Header() {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const [role, setRole] = useState('UNKNOWN')
  const [mounted, setMounted] = useState(false)

  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('Something went wrong')
  const [severity, setSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('error')
  const [userFullName, setUserFullName] = useState('Guest')
  const [schoolLogoUrl, setSchoolLogoUrl] = useState<string | null>(null)
  const [schoolName, setSchoolName] = useState('')

  useEffect(() => {
    setMounted(true)
    setRole(getRoleFromSession())
  }, [])

  const hideHeaderUI = useMemo(() => {
    if (!pathname) return false
    if (AUTH_ROUTES.some((p) => pathname.startsWith(p))) return true
    // Show full header UI only on inventory and analytics pages
    if (pathname.startsWith('/inventory') || pathname.startsWith('/analytics') || pathname.startsWith('/transaction') || pathname.startsWith('/update-item-condition') || pathname.startsWith('/file-approval') || pathname.startsWith('/donation-drives') || pathname.startsWith('/configuration') || pathname.startsWith('/school')) return false
    return true
  }, [pathname])

  const currentApp = useMemo(() => {
    if (pathname?.startsWith('/analytics/configuration/products')) return APPS[3] // Collaborations
    if (pathname?.startsWith('/analytics')) return APPS[0] // School Dashboard
    if (pathname?.startsWith('/inventory') || pathname?.startsWith('/update-item-condition') || pathname?.startsWith('/file-approval') || pathname?.startsWith('/transaction') || pathname?.startsWith('/configuration')) return APPS[1] // Uniform Tracker
    if (pathname?.startsWith('/donation-drives')) return APPS[2] // Donation Drives
    return APPS[0]
  }, [pathname])

  const handleClose = () => {
    setOpen(false)
  }

  const handleLogout = useCallback(async () => {
    setDropdownOpen(false)
    try {
      await clearAuthSession()
      setUserFullName('Guest')
      setSchoolLogoUrl(null)
      setSchoolName('')
      setRole('UNKNOWN')
      router.push('/auth/login')
    } catch (error: any) {
      setMessage(error?.message || 'Failed to logout')
      setSeverity('error')
      setOpen(true)
    }
  }, [router])

  const retrieveUserDetails = useCallback(async () => {
    try {
      const profile = await fetchUserProfile()
      if (profile) {
        setUserFullName(profile.fullName || 'User')
        if (profile.school) {
          setSchoolName(profile.school.name || '')
          setSchoolLogoUrl(`/api/school/${profile.school.id}/logo`)
        }
        setRole(getRoleFromSession())
      } else {
        setUserFullName('Guest')
        setRole('UNKNOWN')
        if (!pathname?.startsWith('/auth') && pathname !== '/') {
          router.push('/auth/login')
        }
      }
    } catch (error: any) {
      setUserFullName('Guest')
      setRole('UNKNOWN')
      setMessage(error?.message || 'Failed to load user session')
      setSeverity('error')
      setOpen(true)
    }
  }, [router, pathname, hideHeaderUI])

  useEffect(() => {
    retrieveUserDetails()
  }, [retrieveUserDetails])

  useEffect(() => {
    const onSchoolChanged = (e: any) => {
      setSchoolLogoUrl(e.detail?.logoUrl || null)
      setSchoolName(e.detail?.schoolName || '')
    }
    window.addEventListener('school-changed', onSchoolChanged)
    return () => window.removeEventListener('school-changed', onSchoolChanged)
  }, [])

  useEffect(() => {
    const onAuthChanged = () => {
      retrieveUserDetails()
    }
    window.addEventListener('auth-changed', onAuthChanged)
    return () => window.removeEventListener('auth-changed', onAuthChanged)
  }, [retrieveUserDetails])

  return (
    <>
      <header className="bg-white border-b border-gray-200 shadow-sm relative z-30">
        <div className="flex justify-between w-full px-8">
          <div className="flex w-full items-center justify-between h-16">
            {/* Logo + Module Switcher */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center shrink-0">
                {mounted && role !== 'UNKNOWN' ? (
                  <Link href="/">
                    <Image
                      src="/images/Logo-Symbol-green.png"
                      alt="Logo"
                      width={40}
                      height={40}
                      className="object-contain cursor-pointer"
                    />
                  </Link>
                ) : (
                  <Image
                    src="/images/Logo-Symbol-green.png"
                    alt="Logo"
                    width={40}
                    height={40}
                    className="object-contain"
                  />
                )}
              </div>

              {mounted && !hideHeaderUI && (role === 'TCC_ADMIN' || role === 'SCHOOL_STAFF') && (
                <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-0.5">
                  {APPS.map((app) => {
                    const isActive = app.key === currentApp.key
                    return (
                      <Link
                        key={app.key}
                        href={app.href}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${isActive
                          ? 'bg-white text-[var(--color-main)] shadow-sm'
                          : 'text-gray-500 hover:text-[var(--color-main)] hover:bg-[var(--header-hover)]'
                          }`}
                      >
                        {app.icon}
                        {app.shortLabel}
                      </Link>
                    )
                  })}
                </div>
              )}

            </div>

            {/* Profile Dropdown */}
            {(!hideHeaderUI || pathname === '/' || pathname.startsWith('/users') || pathname.startsWith('/settings')) && (
              <div className="relative ml-auto">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                    <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{userFullName}</span>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                      <Link
                        href="/"
                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M4 10v10h16V10M9 20v-6h6v6" />
                        </svg>
                        <span className="text-sm text-gray-700">Dashboard</span>
                      </Link>

                      <Link
                        href="/faq"
                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-gray-700">FAQ</span>
                      </Link>

                      <Link
                        href="/settings"
                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-sm text-gray-700">Settings</span>
                      </Link>

                      <hr className="my-1 border-gray-200" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors w-full text-left cursor-pointer"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="text-sm text-gray-700">Logout</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <SnackbarAlert open={open} onClose={handleClose} message={message} severity={severity} />
    </>
  )
}
