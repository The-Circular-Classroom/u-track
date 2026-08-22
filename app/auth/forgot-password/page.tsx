'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  TextField,
  Button,
  InputAdornment,
  Divider,
  Typography,
  Box,
  Paper,
  Stack
} from '@mui/material'
import { ArrowForward, EmailRounded } from '@mui/icons-material'
import SnackbarAlert from '@/components/SnackbarAlert'

export default function ForgotPasswordPage() {
  const [formData, setFormData] = useState({
    email: ''
  })
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [severity, setSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('error')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value })
  }

  const handleForgetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.email) {
      setMessage('Email is required')
      setSeverity('error')
      setOpen(true)
      return
    }

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage('Password reset email sent. Please check your inbox.')
        setSeverity('success')
        setOpen(true)
      } else {
        setMessage(data.message || 'Something went wrong, please try again')
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
                  Forget Password
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Enter your email to receive a password reset link.
                </Typography>
              </Stack>

              <Box component="form" onSubmit={handleForgetPassword}>
                <Stack spacing={2.25}>
                  <TextField
                    id="email"
                    fullWidth
                    label="Email"
                    variant="outlined"
                    type="email"
                    placeholder="johndoe@email.com"
                    value={formData.email}
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
                    Send Reset Link
                  </Button>

                  <Divider sx={{ my: 0.5 }} />

                  <Typography variant="body2" color="text.secondary" align="center">
                    Remember your password?{' '}
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
