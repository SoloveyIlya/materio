'use client'

import { useState, useEffect } from 'react'
import { Box, Typography, Tabs, Tab, Grid, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material'
import api from '@/lib/api'
import { showToast } from '@/utils/toast'

// Component Imports
import UserListTable from '@/views/apps/user/list/UserListTable'
import UserListCards from '@/views/apps/user/list/UserListCards'
import SendTasksDialog from '@/views/apps/user/list/SendTasksDialog'

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [administrators, setAdministrators] = useState([])
  const [activeTab, setActiveTab] = useState(0) // Default to Moderators (0 - first tab)
  const [filterOnline, setFilterOnline] = useState(false)
  const [filterRole, setFilterRole] = useState('')
  const [filterMy, setFilterMy] = useState(false)
  const [filterAdministrator, setFilterAdministrator] = useState('')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', password: '', administrator_id: '' })
  
  // Send Tasks Dialog
  const [sendTasksDialogOpen, setSendTasksDialogOpen] = useState(false)
  const [selectedUserForTasks, setSelectedUserForTasks] = useState(null)

  useEffect(() => {
    loadAdministrators()
  }, [])

  useEffect(() => {
    loadUsers()
  }, [activeTab, filterOnline, filterRole, filterMy, filterAdministrator])

  const loadAdministrators = async () => {
    try {
      const response = await api.get('/admin/users?role=admin')
      setAdministrators(response.data || [])
    } catch (error) {
      console.error('Error loading administrators:', error)
      setAdministrators([])
    }
  }

  const loadUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (activeTab === 0) params.append('role', 'moderator') // activeTab 0 is now Moderators
      if (filterOnline) params.append('online_only', 'true')
      if (filterMy) params.append('administrator_id', 'my')
      if (filterRole) params.append('role', filterRole)
      if (filterAdministrator) {
        if (filterAdministrator === 'unassigned') {
          params.append('administrator_id', 'null')
        } else {
          params.append('administrator_id', filterAdministrator)
        }
      }

      const endpoint = activeTab === 0 ? '/admin/moderators' : '/admin/users' // Swapped
      const response = await api.get(`${endpoint}?${params}`)
      setUsers(response.data || [])
    } catch (error) {
      console.error('Error loading users:', error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const handleSendTasks = async (userId) => {
    // Находим пользователя и открываем диалог
    const user = users.find(u => u.id === userId)
    if (user) {
      setSelectedUserForTasks(user)
      setSendTasksDialogOpen(true)
    }
  }

  const handleSendTasksSuccess = () => {
    loadUsers()
  }

  const handleAssignAdministrator = async (userId, administratorId) => {
    try {
      await api.put(`/admin/users/${userId}`, {
        administrator_id: administratorId || null
      })
      loadUsers()
    } catch (error) {
      console.error('Error assigning administrator:', error)
      alert('Error assigning administrator: ' + (error.response?.data?.message || error.message))
    }
  }

  const handleCreateModerator = async () => {
    try {
      const dataToSend = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        administrator_id: formData.administrator_id || null
      }

      await api.post('/admin/moderators', dataToSend)
      setDialogOpen(false)
      setFormData({ name: '', email: '', password: '', administrator_id: '' })
      loadUsers()
      showToast.success('Moderator created successfully')
    } catch (error) {
      console.error('Error creating moderator:', error)
      const errorMessage = error.response?.data?.message || 
                          (error.response?.data?.errors ? JSON.stringify(error.response.data.errors) : error.message) ||
                          'Error creating moderator'
      showToast.error(errorMessage)
    }
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setFormData({ name: '', email: '', password: '', administrator_id: '' })
  }

  return (
    <Box sx={{ p: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant='h4'>{activeTab === 0 ? 'Moderators' : 'Users'}</Typography>
        {activeTab === 0 && (
          <Button variant='contained' startIcon={<i className='ri-add-line' />} onClick={() => setDialogOpen(true)}>
            Add Moderator
          </Button>
        )}
      </Box>

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 6 }}>
        <Tab label='Moderators' />
        <Tab label='Users' />
      </Tabs>

      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <UserListCards activeTab={activeTab} />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <UserListTable
            tableData={users}
            activeTab={activeTab}
            onSendTasks={handleSendTasks}
            administrators={administrators}
            selectedAdministrator={filterAdministrator}
            onAdministratorChange={setFilterAdministrator}
            onAssignAdministrator={handleAssignAdministrator}
          />
        </Grid>
      </Grid>

      {/* Create Moderator Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add Moderator</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            sx={{ mt: 2 }}
            helperText="Minimum 8 characters"
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Administrator</InputLabel>
            <Select
              value={formData.administrator_id || ''}
              label="Administrator"
              onChange={(e) => setFormData({ ...formData, administrator_id: e.target.value })}
            >
              <MenuItem value="">Current admin (default)</MenuItem>
              {administrators.map((admin) => (
                <MenuItem key={admin.id} value={admin.id.toString()}>
                  {admin.name} ({admin.email})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleCreateModerator} 
            variant="contained" 
            disabled={!formData.name || !formData.email || !formData.password || formData.password.length < 8}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Send Tasks Dialog */}
      <SendTasksDialog
        open={sendTasksDialogOpen}
        onClose={() => {
          setSendTasksDialogOpen(false)
          setSelectedUserForTasks(null)
        }}
        user={selectedUserForTasks}
        onSuccess={handleSendTasksSuccess}
      />
    </Box>
  )
}
