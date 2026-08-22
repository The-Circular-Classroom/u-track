'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  TextField,
  Button,
  InputAdornment,
  IconButton,
  Typography,
  Box,
  Paper,
  Stack,
  Alert,
} from '@mui/material'
import { Visibility, VisibilityOff, ArrowForward, LockRounded, ShieldRounded } from '@mui/icons-material'
import SnackbarAlert from '@/components/SnackbarAlert'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { setTokensInSession } from '@/utils/auth'

export default function ChangePasswordPage() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    password: '',
    confirmPassword: '',
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [severity, setSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('error')
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value })
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.currentPassword || !formData.password || !formData.confirmPassword) {
      setMessage('Current password, new password, and confirmation are required')
      setSeverity('warning')
      setOpen(true)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage('Passwords do not match')
      setSeverity('warning')
      setOpen(true)
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/set-new-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        if (data.access_token && data.refresh_token) {
          const supabase = createSupabaseBrowserClient()
          await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          })
          setTokensInSession(data.access_token, data.refresh_token)
        }

        setMessage('Password updated successfully! Redirecting...')
        setSeverity('success')
        setOpen(true)

        // Notify session listeners
        window.dispatchEvent(new Event('auth-changed'))

        setTimeout(() => {
          router.replace('/')
        }, 1200)
      } else {
        setMessage(data.message || 'Failed to update password.')
        setSeverity('error')
        setOpen(true)
      }
    } catch (error: any) {
      setMessage(error?.message || 'Something went wrong, please try again')
      setSeverity('error')
      setOpen(true)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <>
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2, py: 4 }}>
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
            <Box
              sx={{
                height: 6,
                background:
                  'linear-gradient(90deg, var(--color-main, #16a34a) 0%, rgba(59,130,246,0.9) 60%, rgba(236,72,153,0.9) 100%)',
              }}
            />

            <Box sx={{ p: { xs: 3, sm: 4 } }}>
              <Stack spacing={2} sx={{ mb: 3, textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    bgcolor: 'primary.50',
                    color: 'var(--color-main, #16a34a)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                  }}
                >
                  <ShieldRounded />
                </Box>
                <div>
                  <Typography variant="h5" component="h1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    Change Password
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    You are logged in with a temporary password. You must set a new password to continue.
                  </Typography>
                </div>
              </Stack>
              <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                Password must contain lowercase, uppercase letters, digits and special symbols
              </Alert>
              <Box component="form" onSubmit={handleChangePassword}>
                <Stack spacing={2.25}>
                  <TextField
                    id="currentPassword"
                    fullWidth
                    label="Current Password"
                    variant="outlined"
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={formData.currentPassword}
                    onChange={handleChange}
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
                              aria-label="toggle current password visibility"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              edge="end"
                            >
                              {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: 'white' },
                    }}
                  />

                  <TextField
                    id="password"
                    fullWidth
                    label="New Password"
                    variant="outlined"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={formData.password}
                    onChange={handleChange}
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
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: 'white' },
                    }}
                  />

                  <TextField
                    id="confirmPassword"
                    fullWidth
                    label="Confirm New Password"
                    variant="outlined"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
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
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              edge="end"
                            >
                              {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: 'white' },
                    }}
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={loading}
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
                    {loading ? 'Updating Password...' : 'Save & Continue'}
                  </Button>
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
