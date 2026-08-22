'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  TextField,
  Button,
  InputAdornment,
  IconButton,
  Divider,
  Typography,
  Box,
  Paper,
  Stack
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
  ArrowForward,
  EmailRounded,
  LockRounded,
  PersonRounded,
  BadgeRounded,
  PhoneRounded
} from '@mui/icons-material'
import SnackbarAlert from '@/components/SnackbarAlert'

export default function SignupPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    firstName: '',
    lastName: '',
    emailAddress: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('Something went wrong')
  const [severity, setSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('error')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value })
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !formData.fullName ||
      !formData.firstName ||
      !formData.lastName ||
      !formData.emailAddress ||
      !formData.password ||
      !formData.confirmPassword ||
      !formData.phoneNumber
    ) {
      setMessage('Please fill in all fields')
      setSeverity('error')
      setOpen(true)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage('Passwords do not match')
      setSeverity('error')
      setOpen(true)
      return
    }

    // Format phone number
    let formattedPhone = formData.phoneNumber.trim()
    if (!formattedPhone.startsWith('+65')) {
      formattedPhone = '+65' + formattedPhone
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.emailAddress,
          password: formData.password,
          phoneNumber: formattedPhone,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage(data.message || 'Signup successful! Please check your email to verify your account.')
        setSeverity('success')
        setOpen(true)
        setTimeout(() => {
          router.push('/auth/login')
        }, 3000)
      } else {
        setMessage(data.message || 'Something went wrong')
        setSeverity('error')
        setOpen(true)
      }
    } catch (error: any) {
      setMessage(error?.message || 'Something went wrong')
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
            {/* Top accent */}
            <Box sx={{ height: 6, background: 'linear-gradient(90deg, var(--color-main, #16a34a) 0%, rgba(59,130,246,0.9) 60%, rgba(236,72,153,0.9) 100%)' }} />

            <Box sx={{ p: { xs: 3, sm: 4 } }}>
              <Stack spacing={1} sx={{ mb: 3, textAlign: 'center' }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  Create Account
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Fill in the details to get started.
                </Typography>
              </Stack>

              <Box component="form" onSubmit={handleSignup}>
                <Stack spacing={2.25}>
                  <TextField
                    id="fullName"
                    fullWidth
                    label="Full Name"
                    variant="outlined"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={handleChange}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonRounded fontSize="small" />
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: 'white' },
                    }}
                  />
                  <TextField
                    id="firstName"
                    fullWidth
                    label="First Name"
                    variant="outlined"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={handleChange}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <BadgeRounded fontSize="small" />
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: 'white' },
                    }}
                  />
                  <TextField
                    id="lastName"
                    fullWidth
                    label="Last Name"
                    variant="outlined"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={handleChange}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <BadgeRounded fontSize="small" />
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: 'white' },
                    }}
                  />
                  <TextField
                    id="emailAddress"
                    fullWidth
                    label="Email"
                    variant="outlined"
                    type="email"
                    placeholder="johndoe@email.com"
                    value={formData.emailAddress}
                    onChange={handleChange}
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
                      '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: 'white' },
                    }}
                  />
                  <TextField
                    id="phoneNumber"
                    fullWidth
                    label="Phone Number"
                    variant="outlined"
                    placeholder="12345678"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <PhoneRounded fontSize="small" />
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
                    label="Password"
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
                    label="Re-enter Password"
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
                    Get Started
                  </Button>

                  <Divider sx={{ my: 0.5 }} />

                  <Typography variant="body2" color="text.secondary" align="center">
                    Already have an account?{' '}
                    <Link href="/auth/login" style={{ color: '#2563eb', fontWeight: 700 }}>
                      Sign In
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
