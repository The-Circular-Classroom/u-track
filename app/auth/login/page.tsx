'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Box,
  Paper,
  Stack,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  Typography,
  Divider,
} from '@mui/material'
import { Visibility, VisibilityOff, ArrowForward, LockRounded, EmailRounded } from '@mui/icons-material'
import SnackbarAlert from '@/components/SnackbarAlert'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { fetchUserProfile, setTokensInSession } from '@/utils/auth'

function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const continuePath = searchParams ? searchParams.get('continue') : null

  // Redirect already-authenticated users
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createSupabaseBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setTokensInSession(session.access_token, session.refresh_token)
        const forcePasswordChange = session.user?.app_metadata?.force_password_change === true
        if (forcePasswordChange) {
          router.replace('/auth/change-password')
        } else if (continuePath) {
          router.replace(continuePath)
        } else {
          router.replace('/')
        }
      }
    }
    checkSession()
  }, [router, continuePath])

  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('Invalid email or password')
  const [severity, setSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('error')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      setMessage('Please provide both email address and password')
      setSeverity('warning')
      setOpen(true)
      return
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username, password }),
      })

      const loginResData = await response.json()

      if (!response.ok) {
        setMessage(loginResData.message || 'Invalid email or password')
        setSeverity('error')
        setOpen(true)
        return
      }

      const supabase = createSupabaseBrowserClient()
      if (loginResData.access_token && loginResData.refresh_token) {
        await supabase.auth.setSession({
          access_token: loginResData.access_token,
          refresh_token: loginResData.refresh_token,
        })
        setTokensInSession(loginResData.access_token, loginResData.refresh_token)
      }

      const forcePasswordChange = loginResData.user?.mustChangePassword === true
      // Resolve profile and roles using users/me API
      const profile = await fetchUserProfile()
      const mustChangePassword = forcePasswordChange || profile?.mustChangePassword === true

      if (profile || forcePasswordChange) {
        if (mustChangePassword) {
          setMessage('Please change your password to continue')
          setSeverity('warning')
        } else {
          setMessage('Login successful')
          setSeverity('success')
        }
        setOpen(true)

        // Notify other components about auth change
        window.dispatchEvent(new Event('auth-changed'))

        setTimeout(() => {
          if (mustChangePassword) {
            router.replace('/auth/change-password')
          } else if (continuePath) {
            router.replace(continuePath)
          } else {
            router.replace('/')
          }
        }, 800)
      } else {
        setMessage('Failed to load user profile')
        setSeverity('error')
        setOpen(true)
      }
    } catch (error: any) {
      setMessage(error?.message || 'Something went wrong, please try again')
      setSeverity('error')
      setOpen(true)
    }
  }

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          px: 2,
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 460 }}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 4,
              border: '1px solid',
              borderColor: 'grey.200',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
            }}
          >
            {/* Top accent */}
            <Box
              sx={{
                height: 6,
                background:
                  'linear-gradient(90deg, var(--color-main, #16a34a) 0%, rgba(59,130,246,0.9) 60%, rgba(236,72,153,0.9) 100%)',
              }}
            />

            <Box sx={{ p: { xs: 3, sm: 4 } }}>
              <Stack spacing={1} sx={{ mb: 3 }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  Welcome Back
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sign in to continue to your account.
                </Typography>
              </Stack>

              <Box component="form" onSubmit={handleLogin}>
                <Stack spacing={2.25}>
                  <TextField
                    id="username"
                    fullWidth
                    label="Email"
                    variant="outlined"
                    type="email"
                    placeholder="someone@example.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="email"
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailRounded fontSize="small" />
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2.5,
                        bgcolor: 'white',
                      },
                    }}
                  />

                  <TextField
                    id="password"
                    fullWidth
                    label="Password"
                    variant="outlined"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockRounded fontSize="small" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label="toggle password visibility"
                              onClick={() => setShowPassword((v) => !v)}
                              edge="end"
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2.5,
                        bgcolor: 'white',
                      },
                    }}
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    endIcon={<ArrowForward />}
                    sx={{
                      py: 1.35,
                      borderRadius: 2.5,
                      fontWeight: 800,
                      textTransform: 'none',
                      bgcolor: 'var(--color-main, #16a34a)',
                      '&:hover': { opacity: 0.92, bgcolor: 'var(--color-main, #16a34a)' },
                    }}
                  >
                    Sign in
                  </Button>

                  <Divider sx={{ my: 0.5 }} />
                  <Typography variant="body2" color="text.secondary" align="center">
                    Need an account?{' '}
                    <Link href={`/auth/signup${continuePath ? `?continue=${continuePath}` : ''}`} style={{ color: '#2563eb', fontWeight: 700 }}>
                      Sign up
                    </Link>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" align="center">
                    Forgot password?{' '}
                    <Link href={`/auth/forgot-password${continuePath ? `?continue=${continuePath}` : ''}`} style={{ color: '#2563eb', fontWeight: 700 }}>
                      Reset password
                    </Link>
                  </Typography>
                </Stack>
              </Box>
            </Box>
          </Paper>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
            © {new Date().getFullYear()} The Circular Classroom
          </Typography>
        </Box>
      </Box>

      <SnackbarAlert open={open} onClose={handleClose} message={message} severity={severity} />
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
