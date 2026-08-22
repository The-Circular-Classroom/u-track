'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box, Typography, List, ListItem, ListItemIcon, ListItemText, Divider, ListItemButton,
  Accordion, AccordionSummary, AccordionDetails, TextField, Button, Paper, Container, Grid, CircularProgress
} from '@mui/material'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import ModeEditOutlineOutlinedIcon from '@mui/icons-material/ModeEditOutlineOutlined'
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined'
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined'
import LaptopMacOutlinedIcon from '@mui/icons-material/LaptopMacOutlined'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SnackbarAlert from '@/components/SnackbarAlert'
import StyledConfirmDialog from '@/components/StyledConfirmDialog'
import { getErrorMessage, parseApiResponse, withFallbackMessage } from '@/utils/apiResponse'
import { clearAuthSession } from '@/utils/auth'

export default function Settings() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('general')
  const [expanded, setExpanded] = useState<string | false>(false)
  const [loading, setLoading] = useState(true)
  const [openDeactivateConfirm, setOpenDeactivateConfirm] = useState(false)
  const [isDeactivatingAccount, setIsDeactivatingAccount] = useState(false)

  // Snackbar states
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [severity, setSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('success')

  // Form states
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false)
  const [emailConfirmationCode, setEmailConfirmationCode] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const fullName = `${firstName} ${lastName}`.trim()

  const handleClose = () => {
    setOpen(false)
  }

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const { payload, message: responseMessage } = await parseApiResponse(response)

      if (!response.ok) {
        setMessage(withFallbackMessage(responseMessage, 'Failed to fetch your data'))
        setSeverity('error')
        setOpen(true)
        setLoading(false)
        return
      }
      const responseData = payload || {}
      setFirstName(responseData.firstName || '')
      setLastName(responseData.lastName || '')
      setEmail(responseData.email || '')
      setLoading(false)
    } catch (error) {
      setMessage(getErrorMessage(error, 'Failed to fetch user data'))
      setSeverity('error')
      setOpen(true)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCancel = () => {
    setExpanded(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    fetchData()
  }

  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false)
  }

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName,
          lastName,
          fullName
        })
      })
      const { message: responseMessage } = await parseApiResponse(response)

      if (!response.ok) {
        setMessage(withFallbackMessage(responseMessage, 'Failed to update name'))
        setSeverity('error')
        setOpen(true)
        return
      }
      setMessage(withFallbackMessage(responseMessage, 'Name updated successfully'))
      setSeverity('success')
      setOpen(true)
      setExpanded(false)
      fetchData()
    } catch (error) {
      setMessage(getErrorMessage(error, 'Failed to update name'))
      setSeverity('error')
      setOpen(true)
      fetchData()
    }
  }

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email
        })
      })
      const { payload, message: responseMessage } = await parseApiResponse(response)

      if (!response.ok) {
        setMessage(withFallbackMessage(responseMessage, 'Failed to update email'))
        setSeverity('error')
        setOpen(true)
        return
      }
      setMessage(withFallbackMessage(responseMessage, 'Please check your email address for a verification link.'))
      setSeverity('success')
      setOpen(true)
      setExpanded(false)
    } catch (error) {
      setMessage(getErrorMessage(error, 'Failed to update email'))
      setSeverity('error')
      setOpen(true)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match')
      setSeverity('error')
      setOpen(true)
      return
    }
    try {
      const response = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword,
          password: newPassword
        })
      })
      const { message: responseMessage } = await parseApiResponse(response)

      if (!response.ok) {
        setMessage(withFallbackMessage(responseMessage, 'Failed to update password'))
        setSeverity('error')
        setOpen(true)
        return
      }
      setMessage(withFallbackMessage(responseMessage, 'Password updated successfully'))
      setSeverity('success')
      setOpen(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setExpanded(false)
    } catch (error) {
      setMessage(getErrorMessage(error, 'Failed to update password'))
      setSeverity('error')
      setOpen(true)
    }
  }

  const handleDeactivateAccount = async () => {
    try {
      setIsDeactivatingAccount(true)
      const response = await fetch('/api/auth/me', {
        method: 'DELETE'
      })
      const { message: responseMessage } = await parseApiResponse(response)

      if (!response.ok) {
        setMessage(withFallbackMessage(responseMessage, 'Failed to deactivate account'))
        setSeverity('error')
        setOpen(true)
        return
      }

      await clearAuthSession()
      setOpenDeactivateConfirm(false)
      router.replace('/auth/login')
    } catch (error) {
      setMessage(getErrorMessage(error, 'Failed to deactivate account'))
      setSeverity('error')
      setOpen(true)
    } finally {
      setIsDeactivatingAccount(false)
    }
  }

  const navItems = [
    { id: 'general', label: 'General', icon: <SettingsOutlinedIcon /> },
    { id: 'personalisation', label: 'Personalisation', icon: <ModeEditOutlineOutlinedIcon /> },
    { id: 'notifications', label: 'Notifications', icon: <NotificationsNoneOutlinedIcon /> },
  ]

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color: '#111827', mb: 4 }}>
        Settings
      </Typography>
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
            <List disablePadding>
              {navItems.map((item, index) => (
                <Box key={item.id}>
                  <ListItem disablePadding>
                    <ListItemButton
                      selected={activeTab === item.id}
                      onClick={() => setActiveTab(item.id)}
                      sx={{
                        py: 2,
                        px: 3,
                        '&.Mui-selected': {
                          backgroundColor: '#f3f4f6',
                          borderLeft: '4px solid #69aa56',
                          '&:hover': {
                            backgroundColor: '#e5e7eb',
                          }
                        },
                        borderLeft: '4px solid transparent',
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40, color: activeTab === item.id ? '#69aa56' : '#6b7280' }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        slotProps={{
                          primary: {
                            sx: {
                              fontWeight: activeTab === item.id ? 600 : 500,
                              color: activeTab === item.id ? '#111827' : '#4b5563',
                            },
                          },
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                  {index < navItems.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 9 }}>
          {activeTab === 'general' && (
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827', mb: 1 }}>
                General Settings
              </Typography>
              <Typography variant="body1" sx={{ color: '#6b7280', mb: 4 }}>
                Manage your account information and settings.
              </Typography>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress sx={{ color: '#69aa56' }} />
                </Box>
              ) : (
                <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                  <Accordion
                    expanded={expanded === 'panel1'}
                    onChange={handleChange('panel1')}
                    disableGutters
                    elevation={0}
                    sx={{ '&:before': { display: 'none' } }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ py: 1.5, px: 4 }}>
                      <ListItemIcon sx={{ minWidth: 48, mt: 0.5 }}>
                        <PersonOutlineOutlinedIcon fontSize="large" sx={{ color: '#69aa56' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Name"
                        secondary={fullName}
                        slotProps={{
                          primary: { sx: { fontWeight: 600, color: '#374151', fontSize: '1.05rem' } },
                          secondary: { sx: { color: '#6b7280', mt: 0.5, fontWeight: 500 } },
                        }}
                      />
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: { xs: 3, sm: 4, md: 10 }, pb: 4, pt: 0 }}>
                      <form onSubmit={handleUpdateName}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <TextField
                            fullWidth
                            id="firstName"
                            label="First Name"
                            variant="outlined"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            size="medium"
                            required
                          />
                          <TextField
                            fullWidth
                            id="lastName"
                            label="Last Name"
                            variant="outlined"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            size="medium"
                            required
                          />
                          <TextField
                            fullWidth
                            label="Full Name"
                            variant="outlined"
                            value={fullName}
                            size="medium"
                            slotProps={{
                              input: { readOnly: true }
                            }}
                            helperText="Full Name is automatically generated from First and Last Name."
                          />
                          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                            <Button variant="outlined" color="inherit" onClick={handleCancel}>
                              Cancel
                            </Button>
                            <Button type="submit" variant="contained" disableElevation sx={{ backgroundColor: '#69aa56', '&:hover': { backgroundColor: '#5a9448' } }}>
                              Update Name
                            </Button>
                          </Box>
                        </Box>
                      </form>
                    </AccordionDetails>
                  </Accordion>
                  <Divider />
                  {/* Email Accordion */}
                  <Accordion
                    expanded={expanded === 'panel2'}
                    onChange={handleChange('panel2')}
                    disableGutters
                    elevation={0}
                    sx={{ '&:before': { display: 'none' } }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ py: 1.5, px: 4 }}>
                      <ListItemIcon sx={{ minWidth: 48, mt: 0.5 }}>
                        <LaptopMacOutlinedIcon fontSize="large" sx={{ color: '#69aa56' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Email Address"
                        secondary={email}
                        slotProps={{
                          primary: { sx: { fontWeight: 600, color: '#374151', fontSize: '1.05rem' } },
                          secondary: { sx: { color: '#6b7280', mt: 0.5, fontWeight: 500 } },
                        }}
                      />
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: { xs: 3, sm: 4, md: 10 }, pb: 4, pt: 0 }}>
                      <form onSubmit={handleUpdateEmail}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <TextField
                            fullWidth
                            id="email"
                            label="Email Address"
                            type="email"
                            variant="outlined"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            size="medium"
                            required
                            helperText="You will need to verify your new email address."
                          />
                          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                            <Button variant="outlined" color="inherit" onClick={handleCancel}>
                              Cancel
                            </Button>
                            <Button type="submit" variant="contained" disableElevation sx={{ backgroundColor: '#69aa56', '&:hover': { backgroundColor: '#5a9448' } }}>
                              Update Email
                            </Button>
                          </Box>
                        </Box>
                      </form>
                    </AccordionDetails>
                  </Accordion>
                  <Divider />
                  {/* Password Accordion */}
                  <Accordion
                    expanded={expanded === 'panel3'}
                    onChange={handleChange('panel3')}
                    disableGutters
                    elevation={0}
                    sx={{ '&:before': { display: 'none' } }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ py: 1.5, px: 4 }}>
                      <ListItemIcon sx={{ minWidth: 48, mt: 0.5 }}>
                        <ShieldOutlinedIcon fontSize="large" sx={{ color: '#69aa56' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Password"
                        secondary="Change your account password"
                        slotProps={{
                          primary: { sx: { fontWeight: 600, color: '#374151', fontSize: '1.05rem' } },
                          secondary: { sx: { color: '#6b7280', mt: 0.5, fontWeight: 500 } },
                        }}
                      />
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: { xs: 3, sm: 4, md: 10 }, pb: 4, pt: 0 }}>
                      <form onSubmit={handleUpdatePassword}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <TextField
                            fullWidth
                            id="currentPassword"
                            label="Current Password"
                            type="password"
                            variant="outlined"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            size="medium"
                            required
                          />
                          <TextField
                            fullWidth
                            id="newPassword"
                            label="New Password"
                            type="password"
                            variant="outlined"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            size="medium"
                            required
                          />
                          <TextField
                            fullWidth
                            id="confirmPassword"
                            label="Confirm New Password"
                            type="password"
                            variant="outlined"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            size="medium"
                            required
                          />
                          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                            <Button variant="outlined" color="inherit" onClick={() => setExpanded(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" variant="contained" disableElevation sx={{ backgroundColor: '#69aa56', '&:hover': { backgroundColor: '#5a9448' } }}>
                              Update Password
                            </Button>
                          </Box>
                        </Box>
                      </form>
                    </AccordionDetails>
                  </Accordion>
                  <Divider />
                  <Accordion
                    expanded={expanded === 'panel4'}
                    onChange={handleChange('panel4')}
                    disableGutters
                    elevation={0}
                    sx={{ '&:before': { display: 'none' } }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ py: 1.5, px: 4 }}>
                      <ListItemIcon sx={{ minWidth: 48, mt: 0.5 }}>
                        <PersonOffOutlinedIcon fontSize="large" sx={{ color: '#dc2626' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Deactivate Account"
                        secondary="Permanently disable your account and remove active sessions"
                        slotProps={{
                          primary: { sx: { fontWeight: 600, color: '#b91c1c', fontSize: '1.05rem' } },
                          secondary: { sx: { color: '#6b7280', mt: 0.5, fontWeight: 500 } },
                        }}
                      />
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: { xs: 3, sm: 4, md: 10 }, pb: 4, pt: 0 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>
                          This action will deactivate your account. You will be signed out immediately.
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <Button
                            type="button"
                            variant="contained"
                            disableElevation
                            onClick={() => setOpenDeactivateConfirm(true)}
                            sx={{ backgroundColor: '#dc2626', '&:hover': { backgroundColor: '#b91c1c' } }}
                          >
                            Deactivate Account
                          </Button>
                        </Box>
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                </Paper>
              )}
            </Box>
          )}

          {activeTab === 'personalisation' && (
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827', mb: 1 }}>
                Personalisation
              </Typography>
              <Typography variant="body1" sx={{ color: '#6b7280', mb: 4 }}>
                Customize your interface features and viewing preferences.
              </Typography>
              <Paper elevation={0} sx={{ p: 8, border: '1px solid #e5e7eb', borderRadius: 3, textAlign: 'center' }}>
                <Typography variant="body1" sx={{ color: '#6b7280' }}>
                  Personalisation options are coming soon.
                </Typography>
              </Paper>
            </Box>
          )}

          {activeTab === 'notifications' && (
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827', mb: 1 }}>
                Notifications
              </Typography>
              <Typography variant="body1" sx={{ color: '#6b7280', mb: 4 }}>
                Manage when and how you are notified.
              </Typography>
              <Paper elevation={0} sx={{ p: 8, border: '1px solid #e5e7eb', borderRadius: 3, textAlign: 'center' }}>
                <Typography variant="body1" sx={{ color: '#6b7280' }}>
                  Notification settings are coming soon.
                </Typography>
              </Paper>
            </Box>
          )}
        </Grid>
      </Grid>

      <SnackbarAlert open={open} onClose={handleClose} message={message} severity={severity} />
      <StyledConfirmDialog
        open={openDeactivateConfirm}
        onClose={() => !isDeactivatingAccount && setOpenDeactivateConfirm(false)}
        onConfirm={handleDeactivateAccount}
        title="Deactivate account?"
        description="This will deactivate your account, clear this browser session, and sign you out. This action cannot be undone from this screen."
        confirmLabel="Deactivate"
        cancelLabel="Cancel"
        confirmColor="danger"
        loading={isDeactivatingAccount}
      />
    </Container>
  )
}
