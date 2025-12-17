'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Box, Typography, Paper, Grid, Chip, Card, CardContent, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import api from '@/lib/api'

export default function UserOverviewPage() {
  const params = useParams()
  const userId = params.id
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState(null)
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    loadUser()
  }, [userId])

  const loadUser = async () => {
    try {
      const response = await api.get(`/admin/users/${userId}`)
      setUser(response.data.user)
      setStats(response.data.stats)
    } catch (error) {
      console.error('Error loading user:', error)
    }
  }

  if (!user) return <Box sx={{ p: 3 }}>Loading...</Box>

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>{user.name}</Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>{user.email}</Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Basic Information</Typography>
              <Box sx={{ mt: 2 }}>
                <Typography><strong>ID:</strong> {user.id}</Typography>
                <Typography><strong>Timezone:</strong> {user.timezone || 'UTC'}</Typography>
                <Typography><strong>Work Start Date:</strong> {user.work_start_date ? new Date(user.work_start_date).toLocaleDateString() : '—'}</Typography>
                <Typography><strong>IP Address:</strong> {user.ip_address || '—'}</Typography>
                <Typography><strong>Platform:</strong> {user.platform || '—'}</Typography>
                <Typography><strong>Location:</strong> {user.location || '—'}</Typography>
                <Typography><strong>Last Activity:</strong> {user.last_seen_at ? new Date(user.last_seen_at).toLocaleString() : '—'}</Typography>
                <Box sx={{ mt: 2 }}>
                  <Chip
                    label={user.is_online ? 'Online' : 'Offline'}
                    color={user.is_online ? 'success' : 'default'}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Task Statistics</Typography>
              {stats && (
                <Box sx={{ mt: 2 }}>
                  <Typography><strong>Total Tasks:</strong> {stats.total_tasks}</Typography>
                  <Typography><strong>Completed:</strong> {stats.completed_tasks}</Typography>
                  <Typography><strong>In Progress:</strong> {stats.in_progress_tasks}</Typography>
                  <Typography><strong>Pending:</strong> {stats.pending_tasks}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
              <Tab label="Tasks" />
              <Tab label="Logs" />
            </Tabs>

            {activeTab === 0 && user.tasks && (
              <TableContainer sx={{ mt: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Title</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created At</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {user.tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>{task.id}</TableCell>
                        <TableCell>{task.title}</TableCell>
                        <TableCell>{task.category?.name || '—'}</TableCell>
                        <TableCell>
                          <Chip
                            label={task.status}
                            size="small"
                            color={
                              task.status === 'completed' ? 'success' :
                              task.status === 'in_progress' ? 'warning' :
                              'default'
                            }
                          />
                        </TableCell>
                        <TableCell>{new Date(task.created_at).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {activeTab === 1 && (
              <Box sx={{ mt: 2 }}>
                <Typography>Activity logs will be displayed here</Typography>
                {/* Component for displaying logs can be added here */}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
