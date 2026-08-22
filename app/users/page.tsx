'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { DataGrid, GridToolbar } from '@mui/x-data-grid'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Checkbox,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import KeyIcon from '@mui/icons-material/Key'
import CheckIcon from '@mui/icons-material/Check'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import CustomErrorButton from '@/components/ui/CustomErrorButton'
import SnackbarAlert from '@/components/SnackbarAlert'
import CreateUserModal from '@/components/CreateUserModal'
import StyledConfirmDialog from '@/components/StyledConfirmDialog'
import { getErrorMessage, parseApiResponse, withFallbackMessage } from '@/utils/apiResponse'

const ROLE_OPTIONS = ['SchoolStaff', 'Admin', 'PsgVolunteer', 'Parent']

function RoleChip({ role }: { role: string }) {
  return (
    <Chip
      label={role || '-'}
      size="small"
      variant="outlined"
      sx={{ fontWeight: 600 }}
    />
  )
}

function ActiveChip({ isActive }: { isActive: boolean }) {
  return (
    <Chip
      size="small"
      label={isActive ? 'Active' : 'Inactive'}
      color={isActive ? 'success' : 'default'}
      variant={isActive ? 'filled' : 'outlined'}
      sx={{ fontWeight: 600 }}
    />
  )
}

function formatDateTime(dateValue: any) {
  if (!dateValue) return '-'

  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return '-'

  const dateText = date.toLocaleDateString('en-SG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  const timeText = date.toLocaleTimeString('en-SG', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  return `${dateText}, ${timeText}`
}

function normalizeUserRow(user: any) {
  const firstName = user.firstName || ''
  const lastName = user.lastName || ''
  const fullName = user.fullName || `${firstName} ${lastName}`.trim()

  return {
    id: user.id,
    supabaseAuthId: user.supabaseAuthId,
    firstName,
    lastName,
    fullName: fullName || '-',
    email: user.email || '-',
    phoneNumber: user.phoneNumber || '',
    role: user.role || '-',
    isActive: Boolean(user.isActive),
    schoolId: user.schoolId ?? '',
    lastLogin: user.lastLogin || null,
    createdDate: user.createdDate || null,
  }
}

function mapUserToForm(user: any) {
  return {
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    phoneNumber: user.phoneNumber || '',
    role: user.role || '',
    schoolId: user.schoolId === '' ? '' : String(user.schoolId ?? ''),
    isActive: Boolean(user.isActive),
  }
}

const buildColumns = (): any[] => [
  {
    field: 'fullName',
    headerName: 'Full Name',
    flex: 1,
    minWidth: 180,
  },
  {
    field: 'email',
    headerName: 'Email',
    flex: 1.3,
    minWidth: 220,
  },
  {
    field: 'role',
    headerName: 'Role',
    width: 160,
    renderCell: ({ value }: any) => <RoleChip role={value} />,
  },
  {
    field: 'isActive',
    headerName: 'Active Status',
    width: 140,
    type: 'boolean',
    renderCell: ({ value }: any) => <ActiveChip isActive={Boolean(value)} />,
  },
  {
    field: 'createdDate',
    headerName: 'Created Date',
    width: 200,
    type: 'dateTime',
    valueGetter: (value: any) => (value ? new Date(value) : null),
    renderCell: ({ row }: any) => formatDateTime(row.createdDate),
  },
  {
    field: 'lastLogin',
    headerName: 'Last Login',
    width: 200,
    type: 'dateTime',
    valueGetter: (value: any) => (value ? new Date(value) : null),
    renderCell: ({ row }: any) => formatDateTime(row.lastLogin),
  },
]

function NoRowsOverlay() {
  return (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <Typography color="text.secondary">No users found.</Typography>
    </Box>
  )
}

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [schools, setSchools] = useState<any[]>([])
  const [loadingSchools, setLoadingSchools] = useState(true)
  const [currentUserProfile, setCurrentUserProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rowCount, setRowCount] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [syncingUsers, setSyncingUsers] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [formValues, setFormValues] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [settingTempPassword, setSettingTempPassword] = useState(false)
  const [sendTempEmailOption, setSendTempEmailOption] = useState(true)
  const [tempPasswordResult, setTempPasswordResult] = useState<{ tempPassword: string; emailSent: boolean } | null>(null)
  const [tempPasswordModalOpen, setTempPasswordModalOpen] = useState(false)
  const [copiedPassword, setCopiedPassword] = useState(false)
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('success')
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchQuery])

  const columns = useMemo(() => buildColumns(), [])

  const fetchUsers = useCallback(async (page: number, pageSize: number, search: string = '') => {
    try {
      setLoading(true)
      const searchParam = search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ''
      const response = await fetch(`/api/users?page=${page + 1}&pageSize=${pageSize}${searchParam}`)

      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const result = await response.json()
      const userArray = Array.isArray(result?.users) ? result.users : []

      setUsers(userArray.map(normalizeUserRow))
      setRowCount(result?.pagination?.total ?? userArray.length)
      setError(null)
    } catch (err: any) {
      console.error('Error fetching users:', err)
      setError(err.message || 'Unable to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers(paginationModel.page, paginationModel.pageSize, debouncedSearch)
  }, [fetchUsers, paginationModel.page, paginationModel.pageSize, debouncedSearch])

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const response = await fetch('/api/users/me')
        if (response.ok) {
          const profile = await response.json()
          setCurrentUserProfile(profile)
        }
      } catch (err) {
        console.error('Error loading current user details:', err)
      }
    }
    loadCurrentUser()
  }, [])

  const isEditingOwnAccount = useMemo(() => {
    if (!selectedUser || !currentUserProfile) return false
    return String(selectedUser.id) === String(currentUserProfile.id)
  }, [currentUserProfile, selectedUser])

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const response = await fetch('/api/schools')
        const result = await response.json()
        const schoolArray = result.schools || result.data || []
        setSchools(schoolArray)
      } catch (err) {
        console.error('Error fetching schools:', err)
      } finally {
        setLoadingSchools(false)
      }
    }

    fetchSchools()
  }, [])

  const handleOpenDrawer = useCallback((user: any) => {
    setSelectedUser(user)
    setFormValues(mapUserToForm(user))
    setDrawerOpen(true)
  }, [])

  const handleCloseDrawer = useCallback(() => {
    if (saving || deleting) return
    setDrawerOpen(false)
    setSelectedUser(null)
    setFormValues(null)
  }, [deleting, saving])

  const handleFieldChange = useCallback((field: string, value: any) => {
    setFormValues((prev: any) => {
      if (field === 'role') {
        const isRoleAdmin = `${value || ''}`.toLowerCase() === 'admin'
        return {
          ...prev,
          role: value,
          schoolId: isRoleAdmin ? '' : prev.schoolId,
        }
      }

      return {
        ...prev,
        [field]: value,
      }
    })
  }, [])

  const handleUpdateUser = useCallback(async () => {
    if (!selectedUser || !formValues) return

    if (isEditingOwnAccount) {
      setSnackbarMessage('Your account can only be edited via the settings page')
      setSnackbarSeverity('error')
      setSnackbarOpen(true)
      return
    }

    const isEditedUserAdmin = `${formValues.role || ''}`.toLowerCase() === 'admin'
    if (!isEditedUserAdmin && !formValues.schoolId) {
      setSnackbarMessage('School is required for non-admin users')
      setSnackbarSeverity('error')
      setSnackbarOpen(true)
      return
    }

    try {
      setSaving(true)

      const original = mapUserToForm(selectedUser)
      const payload: Record<string, any> = {}

      const trimmedFirstName = formValues.firstName.trim()
      const trimmedLastName = formValues.lastName.trim()

      if (trimmedFirstName !== (original.firstName || '').trim()) {
        payload.firstName = trimmedFirstName
      }
      if (trimmedLastName !== (original.lastName || '').trim()) {
        payload.lastName = trimmedLastName
      }
      if (payload.firstName !== undefined || payload.lastName !== undefined) {
        payload.fullName = `${trimmedFirstName} ${trimmedLastName}`.trim()
      }
      if (formValues.email.trim() !== (original.email || '').trim()) {
        payload.email = formValues.email.trim()
      }

      const trimmedPhone = formValues.phoneNumber.trim() || null
      const originalPhone = (original.phoneNumber || '').trim() || null
      if (trimmedPhone !== originalPhone) {
        payload.phoneNumber = trimmedPhone
      }
      if (formValues.role !== original.role) {
        payload.role = formValues.role
      }
      if (formValues.isActive !== original.isActive) {
        payload.isActive = Boolean(formValues.isActive)
      }

      const newSchoolId = isEditedUserAdmin ? null : (formValues.schoolId ? Number(formValues.schoolId) : null)
      const originalSchoolId = original.schoolId ? Number(original.schoolId) : null
      if (newSchoolId !== originalSchoolId) {
        payload.schoolId = newSchoolId
      }

      if (Object.keys(payload).length === 0) {
        setSnackbarMessage('No changes detected')
        setSnackbarSeverity('info')
        setSnackbarOpen(true)
        setSaving(false)
        return
      }

      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      })

      const { message: responseMessage } = await parseApiResponse(response)
      if (!response.ok) {
        throw new Error(withFallbackMessage(responseMessage, 'Failed to update user'))
      }

      await fetchUsers(paginationModel.page, paginationModel.pageSize)
      setSnackbarMessage(withFallbackMessage(responseMessage, 'User updated successfully'))
      setSnackbarSeverity('success')
      setSnackbarOpen(true)
      handleCloseDrawer()
    } catch (err: any) {
      setSnackbarMessage(getErrorMessage(err, 'Failed to update user'))
      setSnackbarSeverity('error')
      setSnackbarOpen(true)
    } finally {
      setSaving(false)
    }
  }, [fetchUsers, formValues, handleCloseDrawer, isEditingOwnAccount, paginationModel.page, paginationModel.pageSize, selectedUser])

  const handleSetTempPassword = useCallback(async () => {
    if (!selectedUser) return

    if (isEditingOwnAccount) {
      setSnackbarMessage('You cannot set a temporary password for your own account')
      setSnackbarSeverity('error')
      setSnackbarOpen(true)
      return
    }

    try {
      setSettingTempPassword(true)
      const response = await fetch(`/api/users/${selectedUser.id}/set-temp-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sendEmail: sendTempEmailOption,
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to set temporary password')
      }

      setTempPasswordResult({
        tempPassword: data.tempPassword,
        emailSent: Boolean(data.emailSent),
      })
      setTempPasswordModalOpen(true)
      setCopiedPassword(false)
      setSnackbarMessage('Temporary password generated successfully')
      setSnackbarSeverity('success')
      setSnackbarOpen(true)
    } catch (err: any) {
      setSnackbarMessage(getErrorMessage(err, 'Failed to set temporary password'))
      setSnackbarSeverity('error')
      setSnackbarOpen(true)
    } finally {
      setSettingTempPassword(false)
    }
  }, [isEditingOwnAccount, selectedUser, sendTempEmailOption])

  const handleDeleteUser = useCallback(async () => {
    if (!selectedUser) return

    if (isEditingOwnAccount) {
      setSnackbarMessage('Another admin must delete your account')
      setSnackbarSeverity('error')
      setSnackbarOpen(true)
      return
    }

    setDeleteConfirmOpen(true)
  }, [isEditingOwnAccount, selectedUser])

  const handleConfirmDeleteUser = useCallback(async () => {
    if (!selectedUser) return

    try {
      setDeleting(true)

      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'DELETE'
      })

      const { message: responseMessage } = await parseApiResponse(response)
      if (!response.ok) {
        throw new Error(withFallbackMessage(responseMessage, 'Failed to delete user'))
      }

      await fetchUsers(paginationModel.page, paginationModel.pageSize)
      setSnackbarMessage(withFallbackMessage(responseMessage, 'User deleted successfully'))
      setSnackbarSeverity('success')
      setSnackbarOpen(true)
      setDeleteConfirmOpen(false)
      handleCloseDrawer()
    } catch (err: any) {
      setSnackbarMessage(getErrorMessage(err, 'Failed to delete user'))
      setSnackbarSeverity('error')
      setSnackbarOpen(true)
    } finally {
      setDeleting(false)
    }
  }, [fetchUsers, handleCloseDrawer, paginationModel.page, paginationModel.pageSize, selectedUser])

  const handleCreateUserClose = useCallback(async (result: any) => {
    setCreateModalOpen(false)

    if (!result) return

    setSnackbarMessage(withFallbackMessage(result.message, result.success ? 'User created successfully' : 'Failed to create user'))
    setSnackbarSeverity(result.success ? 'success' : 'error')
    setSnackbarOpen(true)

    if (result.success) {
      await fetchUsers(paginationModel.page, paginationModel.pageSize)
    }
  }, [fetchUsers, paginationModel.page, paginationModel.pageSize])

  const handleSyncUsersFromCognito = useCallback(async () => {
    try {
      setSyncingUsers(true)

      const response = await fetch('/api/users/sync', {
        method: 'POST'
      })

      const { message: responseMessage } = await parseApiResponse(response)
      if (!response.ok) {
        throw new Error(withFallbackMessage(responseMessage, 'Failed to sync users'))
      }

      await fetchUsers(paginationModel.page, paginationModel.pageSize)
      setSnackbarMessage(withFallbackMessage(responseMessage, 'Users synced successfully'))
      setSnackbarSeverity('success')
      setSnackbarOpen(true)
    } catch (err: any) {
      setSnackbarMessage(getErrorMessage(err, 'Failed to sync users'))
      setSnackbarSeverity('error')
      setSnackbarOpen(true)
    } finally {
      setSyncingUsers(false)
    }
  }, [fetchUsers, paginationModel.page, paginationModel.pageSize])

  if (loading) {
    return <LoadingSpinner message="Loading users..." />
  }

  if (error) {
    return (
      <CustomErrorButton
        title="Error Loading Users Page"
        message={error}
        onRetry={() => fetchUsers(paginationModel.page, paginationModel.pageSize)}
      />
    )
  }

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--color-darker)' }}>
            Users
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {rowCount} total user record{rowCount !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search by name, email, or phone..."
            size="small"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setPaginationModel((prev) => ({ ...prev, page: 0 }))
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSearchQuery('')
                        setPaginationModel((prev) => ({ ...prev, page: 0 }))
                      }}
                      edge="end"
                    >
                      <CloseOutlinedIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
            sx={{
              minWidth: { xs: 240, sm: 320 },
              backgroundColor: 'white',
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
          <Button
            variant="outlined"
            onClick={handleSyncUsersFromCognito}
            disabled={syncingUsers}
            startIcon={syncingUsers ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{
              borderColor: 'var(--color-main)',
              color: 'var(--color-main)',
              '&:hover': { borderColor: 'var(--color-main-hover)', bgcolor: 'rgba(105, 170, 86, 0.08)' },
            }}
          >
            {syncingUsers ? 'Syncing...' : 'Sync Users'}
          </Button>
          <Button
            variant="contained"
            onClick={() => setCreateModalOpen(true)}
            sx={{ bgcolor: 'var(--button-bg)', '&:hover': { bgcolor: 'var(--button-hover)' } }}
          >
            Add User
          </Button>
        </Box>
      </Box>

      <Box
        sx={{
          height: 680,
          width: '100%',
          backgroundColor: '#px',
          bgcolor: 'white',
          borderRadius: 2,
          boxShadow: 1,
          overflow: 'hidden',
        }}
      >
        <DataGrid
          rows={users}
          columns={columns}
          getRowId={(row) => row.id}
          onRowClick={(params) => handleOpenDrawer(params.row)}
          slots={{
            toolbar: GridToolbar,
            noRowsOverlay: NoRowsOverlay,
          }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 300 },
              printOptions: { disableToolbarButton: true },
            },
          }}
          paginationMode="server"
          rowCount={rowCount}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
          density="comfortable"
          sx={{
            border: 'none',
            cursor: 'pointer',
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: 'var(--color-bg-light)',
              fontWeight: 600,
            },
            '& .MuiDataGrid-cell': {
              alignItems: 'center',
            },
          }}
        />
      </Box>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleCloseDrawer}
        slotProps={{ paper: { sx: { width: { xs: '100%', sm: 460 } } } }}
      >
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Edit User
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Update user details and submit changes.
          </Typography>

          <Divider sx={{ my: 2 }} />

          {formValues ? (
            <Stack spacing={2.25}>
              <TextField
                label="First Name"
                value={formValues.firstName}
                onChange={(event) => handleFieldChange('firstName', event.target.value)}
                fullWidth
              />
              <TextField
                label="Last Name"
                value={formValues.lastName}
                onChange={(event) => handleFieldChange('lastName', event.target.value)}
                fullWidth
              />
              <TextField
                label="Full Name (Preview)"
                value={`${(formValues.firstName || '').trim()} ${(formValues.lastName || '').trim()}`.trim()}
                slotProps={{
                  input: { readOnly: true }
                }}
                fullWidth
                helperText="Populated automatically from First Name and Last Name"
              />
              <TextField
                label="Email"
                type="email"
                value={formValues.email}
                onChange={(event) => handleFieldChange('email', event.target.value)}
                fullWidth
              />
              <TextField
                label="Phone Number"
                value={formValues.phoneNumber}
                onChange={(event) => handleFieldChange('phoneNumber', event.target.value)}
                fullWidth
              />
              <TextField
                select
                label="Role"
                value={formValues.role}
                onChange={(event) => handleFieldChange('role', event.target.value)}
                fullWidth
              >
                {ROLE_OPTIONS.map((role) => (
                  <MenuItem key={role} value={role}>
                    {role}
                  </MenuItem>
                ))}
              </TextField>
              {`${formValues.role || ''}`.toLowerCase() !== 'admin' && (
                <TextField
                  select
                  label="Assigned School"
                  value={formValues.schoolId}
                  onChange={(event) => handleFieldChange('schoolId', event.target.value)}
                  disabled={loadingSchools}
                  fullWidth
                >
                  <MenuItem value="">
                    <em>No school assigned</em>
                  </MenuItem>
                  {schools.map((school) => (
                    <MenuItem key={school.id} value={String(school.id)}>
                      {school.schoolName || school.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              <FormControlLabel
                control={(
                  <Switch
                    checked={formValues.isActive}
                    onChange={(event) => handleFieldChange('isActive', event.target.checked)}
                  />
                )}
                label="User is active"
              />

              <Divider sx={{ my: 1 }} />

              <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Temporary Password Action
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Set a temporary password. The user will be required to change it upon next login.
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={sendTempEmailOption}
                      onChange={(e) => setSendTempEmailOption(e.target.checked)}
                    />
                  }
                  label={<Typography variant="body2">Send password to user via email</Typography>}
                  sx={{ mb: 1.5, display: 'block' }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={settingTempPassword ? <CircularProgress size={14} /> : <KeyIcon fontSize="small" />}
                  onClick={handleSetTempPassword}
                  disabled={settingTempPassword || isEditingOwnAccount || saving || deleting}
                  fullWidth
                  sx={{
                    borderColor: 'var(--color-main, #16a34a)',
                    color: 'var(--color-main, #16a34a)',
                    '&:hover': {
                      borderColor: 'var(--color-main, #16a34a)',
                      bgcolor: 'rgba(22, 163, 74, 0.04)',
                    },
                  }}
                >
                  {settingTempPassword ? 'Generating Password...' : 'Set Temporary Password'}
                </Button>
              </Box>

              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Last login: {formatDateTime(selectedUser?.lastLogin)}
                </Typography>
              </Box>
            </Stack>
          ) : null}

          <Box sx={{ mt: 'auto', pt: 3, display: 'flex', gap: 1.5, justifySelf: 'flex-end', justifyContent: 'flex-end' }}>
            {isEditingOwnAccount ? (
              <Tooltip title="Another admin must delete your account">
                <span>
                  <Button variant="contained" color="error" disabled>
                    Delete
                  </Button>
                </span>
              </Tooltip>
            ) : (
              <Button
                variant="contained"
                color="error"
                onClick={handleDeleteUser}
                disabled={saving || deleting || !selectedUser}
                startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}

            <Button onClick={handleCloseDrawer} disabled={saving || deleting}>
              Cancel
            </Button>

            {isEditingOwnAccount ? (
              <Tooltip title="Your account can only be edited via the settings page">
                <span>
                  <Button variant="contained" disabled>
                    Save Changes
                  </Button>
                </span>
              </Tooltip>
            ) : (
              <Button
                variant="contained"
                onClick={handleUpdateUser}
                disabled={saving || deleting || !formValues}
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
                sx={{ bgcolor: 'var(--button-bg)', '&:hover': { bgcolor: 'var(--button-hover)' } }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </Box>
        </Box>
      </Drawer>

      <SnackbarAlert
        open={snackbarOpen}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        severity={snackbarSeverity}
      />

      <Dialog
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent sx={{ p: 0 }}>
          <CreateUserModal
            onClose={handleCreateUserClose}
          />
        </DialogContent>
      </Dialog>

      {/* Temporary Password Result Dialog */}
      <Dialog
        open={tempPasswordModalOpen}
        onClose={() => setTempPasswordModalOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Temporary Password Created</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              The temporary password for <strong>{selectedUser?.fullName || selectedUser?.email}</strong> has been generated:
            </Typography>
            <TextField
              value={tempPasswordResult?.tempPassword || ''}
              fullWidth
              slotProps={{
                input: {
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => {
                          if (tempPasswordResult?.tempPassword) {
                            navigator.clipboard.writeText(tempPasswordResult.tempPassword)
                            setCopiedPassword(true)
                            setTimeout(() => setCopiedPassword(false), 2000)
                          }
                        }}
                        edge="end"
                      >
                        {copiedPassword ? <CheckIcon color="success" /> : <ContentCopyIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontWeight: 700, fontSize: '1.05rem' } }}
            />
            {tempPasswordResult?.emailSent ? (
              <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>
                ✓ An email containing this temporary password has been sent to {selectedUser?.email}.
              </Typography>
            ) : (
              <Typography variant="caption" color="text.secondary">
                Please securely copy and share this temporary password with the user.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            variant="contained"
            onClick={() => setTempPasswordModalOpen(false)}
            sx={{ bgcolor: 'var(--button-bg)', '&:hover': { bgcolor: 'var(--button-hover)' } }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>

      <StyledConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => {
          if (!deleting) setDeleteConfirmOpen(false)
        }}
        onConfirm={handleConfirmDeleteUser}
        title="Delete User"
        description={`Are you sure you want to delete ${selectedUser?.fullName || selectedUser?.email || 'this user'}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmColor="danger"
        loading={deleting}
      />
    </Box>
  )
}
