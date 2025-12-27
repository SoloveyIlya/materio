'use client'

import { useState, useEffect } from 'react'
import { Box, Typography, Tabs, Tab, Grid } from '@mui/material'
import api from '@/lib/api'

// Component Imports
import UserListTable from '@/views/apps/user/list/UserListTable'
import UserListCards from '@/views/apps/user/list/UserListCards'

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [administrators, setAdministrators] = useState([])
  const [activeTab, setActiveTab] = useState(0) // Default to Moderators (0 - first tab)
  const [filterOnline, setFilterOnline] = useState(false)
  const [filterRole, setFilterRole] = useState('')
  const [filterMy, setFilterMy] = useState(false)
  const [filterAdministrator, setFilterAdministrator] = useState('')
  const [loading, setLoading] = useState(true)

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

  const handleSendTest = async (userId) => {
    try {
      await api.post(`/admin/users/${userId}/send-test-task`)
      alert('Test task sent')
      loadUsers()
    } catch (error) {
      alert('Error sending test task')
    }
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

  return (
    <Box sx={{ p: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant='h4'>{activeTab === 0 ? 'Moderators' : 'Users'}</Typography>
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
            onSendTest={handleSendTest}
            administrators={administrators}
            selectedAdministrator={filterAdministrator}
            onAdministratorChange={setFilterAdministrator}
            onAssignAdministrator={handleAssignAdministrator}
          />
        </Grid>
      </Grid>
    </Box>
  )
}
