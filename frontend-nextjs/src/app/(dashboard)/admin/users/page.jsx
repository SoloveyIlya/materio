'use client'

import { useState, useEffect } from 'react'
import { Box, Typography, Tabs, Tab, Grid } from '@mui/material'
import api from '@/lib/api'

// Component Imports
import UserListTable from '@/views/apps/user/list/UserListTable'
import UserListCards from '@/views/apps/user/list/UserListCards'

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [activeTab, setActiveTab] = useState(0)
  const [filterOnline, setFilterOnline] = useState(false)
  const [filterRole, setFilterRole] = useState('')
  const [filterMy, setFilterMy] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsers()
  }, [activeTab, filterOnline, filterRole, filterMy])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (activeTab === 1) params.append('role', 'moderator')
      if (filterOnline) params.append('online_only', 'true')
      if (filterMy) params.append('administrator_id', 'my')
      if (filterRole) params.append('role', filterRole)

      const endpoint = activeTab === 0 ? '/admin/users' : '/admin/moderators'
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

  return (
    <Box sx={{ p: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant='h4'>{activeTab === 0 ? 'Users' : 'Moderators'}</Typography>
      </Box>

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 6 }}>
        <Tab label='Users' />
        <Tab label='Moderators' />
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
          />
        </Grid>
      </Grid>
    </Box>
  )
}
