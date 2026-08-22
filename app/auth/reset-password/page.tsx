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
  Stack
} from '@mui/material'
import { Visibility, VisibilityOff, ArrowForward, LockRounded } from '@mui/icons-material'
import SnackbarAlert from '@/components/SnackbarAlert'

export default function ResetPasswordPage() {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [severity, setSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('error')
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value })
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.password || !formData.confirmPassword) {
      setMessage('Password and confirmation are required')
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

    try {
      // Check if legacy admin flow details are in session
      const username = typeof window !== 'undefined' ? sessionStorage.getItem('username') : null
      const session = typeof window !== 'undefined' ? sessionStorage.getItem('session') : null

      const response = await fetch('/api/auth/set-new-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: username || undefined,
          session: session || undefined,
          password: formData.password,
          confirmPassword: formData.confirmPassword
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage('Password reset successfully')
        setSeverity('success')
        setOpen(true)
        setTimeout(() => {
          router.push('/auth/login')
        }, 1500)
      } else {
        setMessage(data.message || 'Failed to reset password. Please check link validity.')
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
            <Box sx={{ height: 6, background: 'linear-gradient(90deg, var(--color-main, #16a34a) 0%, rgba(59,130,246,0.9) 60%, rgba(236,72,153,0.9) 100%)' }} />

            <Box sx={{ p: { xs: 3, sm: 4 } }}>
              <Stack spacing={1} sx={{ mb: 3, textAlign: 'center' }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  Reset Password
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Enter your new password below.
                </Typography>
              </Stack>

              <Box component="form" onSubmit={handleResetPassword}>
                <Stack spacing={2.25}>
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
                    Reset Password
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
