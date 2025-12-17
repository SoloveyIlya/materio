'use client'

import { useState, useEffect } from 'react'
import { Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, TextField, FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab } from '@mui/material'
import api from '@/lib/api'
import { useRouter } from 'next/navigation'

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [activeTab, setActiveTab] = useState(0)
  const [filterOnline, setFilterOnline] = useState(false)
  const [filterRole, setFilterRole] = useState('')
  const [filterMy, setFilterMy] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [activeTab, filterOnline, filterRole, filterMy])

  const loadUsers = async () => {
    try {
      const params = new URLSearchParams()
      if (activeTab === 1) params.append('role', 'moderator')
      if (filterOnline) params.append('online_only', 'true')
      if (filterMy) params.append('administrator_id', 'my')
      if (filterRole) params.append('role', filterRole)

      const endpoint = activeTab === 0 ? '/admin/users' : '/admin/moderators'
      const response = await api.get(`${endpoint}?${params}`)
      setUsers(response.data)
    } catch (error) {
      console.error('Error loading users:', error)
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
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">{activeTab === 0 ? 'Users' : 'Moderators'}</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant={filterOnline ? 'contained' : 'outlined'}
            onClick={() => setFilterOnline(!filterOnline)}
            startIcon={<i className="ri-filter-line" />}
          >
            Online
          </Button>
          {activeTab === 1 && (
            <Button
              variant={filterMy ? 'contained' : 'outlined'}
              onClick={() => setFilterMy(!filterMy)}
            >
              My Moderators
            </Button>
          )}
        </Box>
      </Box>

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Users" />
        <Tab label="Moderators" />
      </Tabs>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Administrator</TableCell>
              <TableCell>Registered</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Platform</TableCell>
              <TableCell>IP</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.id}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.name}</TableCell>
                <TableCell>
                  {user.roles?.map((role) => (
                    <Chip key={role.id} label={role.name} size="small" sx={{ mr: 0.5 }} />
                  ))}
                </TableCell>
                <TableCell>
                  {user.administrator ? (
                    <Chip label={user.administrator.name} size="small" color="primary" />
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                <TableCell>{user.location || '—'}</TableCell>
                <TableCell>{user.platform || '—'}</TableCell>
                <TableCell>{user.ip_address || '—'}</TableCell>
                <TableCell>
                  {user.is_online ? (
                    <Chip label="Online" color="success" size="small" />
                  ) : (
                    <Chip label="Offline" size="small" />
                  )}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => router.push(`/admin/users/${user.id}`)}
                  >
                    <i className="ri-eye-line" />
                  </IconButton>
                  {activeTab === 1 && (
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleSendTest(user.id)}
                    >
                      <i className="ri-send-plane-line" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
