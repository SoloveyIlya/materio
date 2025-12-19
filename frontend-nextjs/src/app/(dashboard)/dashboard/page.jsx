'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Paper,
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Button
} from '@mui/material'
import api from '@/lib/api'

// Components Imports
import Award from '@/views/dashboards/analytics/Award'
import Transactions from '@/views/dashboards/analytics/Transactions'
import WeeklyOverview from '@/views/dashboards/analytics/WeeklyOverview'
import TotalEarning from '@/views/dashboards/analytics/TotalEarning'
import LineChart from '@/views/dashboards/analytics/LineChart'
import DistributedColumnChart from '@/views/dashboards/analytics/DistributedColumnChart'
import Performance from '@/views/dashboards/analytics/Performance'
import DepositWithdraw from '@/views/dashboards/analytics/DepositWithdraw'
import SalesByCountries from '@/views/dashboards/analytics/SalesByCountries'
import CardStatVertical from '@/components/card-statistics/Vertical'
import Table from '@/views/dashboards/analytics/Table'

const DashboardPage = () => {
  const [user, setUser] = useState(null)
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user) {
      if (user.roles?.some(r => r.name === 'moderator')) {
        loadModeratorDashboard()
      } else if (user.roles?.some(r => r.name === 'admin')) {
        loadAdminDashboard()
      } else {
        setLoading(false)
      }
    }
  }, [user])

  const loadUser = async () => {
    try {
      const response = await api.get('/auth/user')
      setUser(response.data)
    } catch (error) {
      console.error('Error loading user:', error)
      setLoading(false)
    }
  }

  const loadModeratorDashboard = async () => {
    try {
      const response = await api.get('/moderator/dashboard')
      setDashboardData(response.data)
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAdminDashboard = async () => {
    try {
      const response = await api.get('/admin/dashboard')
      setDashboardData(response.data)
    } catch (error) {
      console.error('Error loading admin dashboard:', error)
      console.error('Error details:', error.response?.data || error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleHideDeletedUser = async (userId) => {
    try {
      await api.post(`/admin/users/${userId}/hide-from-dashboard`)
      // Reload dashboard data
      loadAdminDashboard()
    } catch (error) {
      console.error('Error hiding user:', error)
    }
  }

  // Если админ - показываем админ dashboard
  if (user?.roles?.some(r => r.name === 'admin')) {
    if (loading) {
      return <Box sx={{ p: 3 }}>Loading...</Box>
    }

    if (!dashboardData) {
      return <Box sx={{ p: 3 }}>Error loading dashboard</Box>
    }

    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Dashboard</Typography>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Tasks Statistics */}
          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Tasks
                </Typography>
                <Typography variant="h4">
                  {dashboardData.tasks?.total || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Completed Tasks
                </Typography>
                <Typography variant="h4">
                  {dashboardData.tasks?.completed || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  In Progress
                </Typography>
                <Typography variant="h4">
                  {dashboardData.tasks?.in_progress || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Pending Tasks
                </Typography>
                <Typography variant="h4">
                  {dashboardData.tasks?.pending || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Working Moderators */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Working Moderators</Typography>
                <TableContainer>
                  <MuiTable size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Start Date</TableCell>
                        <TableCell>Days</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dashboardData.working_moderators?.map((mod) => (
                        <TableRow key={mod.id}>
                          <TableCell>{mod.name}</TableCell>
                          <TableCell>{mod.email}</TableCell>
                          <TableCell>{mod.work_start_date || '-'}</TableCell>
                          <TableCell>
                            {mod.days_since_start !== null ? `${mod.days_since_start} days` : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!dashboardData.working_moderators || dashboardData.working_moderators.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={4} align="center">No working moderators</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </MuiTable>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Deleted Moderators */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Deleted Moderators</Typography>
                <TableContainer>
                  <MuiTable size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Deleted Date</TableCell>
                        <TableCell>Days</TableCell>
                        <TableCell>Hide</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dashboardData.deleted_moderators?.map((mod) => (
                        <TableRow key={mod.id}>
                          <TableCell>{mod.name}</TableCell>
                          <TableCell>{mod.email}</TableCell>
                          <TableCell>{mod.deleted_at || '-'}</TableCell>
                          <TableCell>
                            {mod.days_since_deleted !== null ? `${mod.days_since_deleted} days` : '-'}
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              checked={false}
                              onChange={() => handleHideDeletedUser(mod.id)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!dashboardData.deleted_moderators || dashboardData.deleted_moderators.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={5} align="center">No deleted moderators</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </MuiTable>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Main Task Statistics */}
          {dashboardData.main_task && (
            <>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Main Task: {dashboardData.main_task.task.title}
                    </Typography>
                    {dashboardData.main_task.task.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {dashboardData.main_task.task.description}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Users who received main task */}
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Received Task</Typography>
                    <TableContainer>
                      <MuiTable size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Days</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {dashboardData.main_task.received_users?.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>{user.name}</TableCell>
                              <TableCell>{user.received_at || '-'}</TableCell>
                              <TableCell>
                                {user.days_since_received !== null ? `${user.days_since_received} days` : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                          {(!dashboardData.main_task.received_users || dashboardData.main_task.received_users.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={3} align="center">No users received this task</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </MuiTable>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Users who completed main task */}
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Completed Task</Typography>
                    <TableContainer>
                      <MuiTable size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Days</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {dashboardData.main_task.completed_users?.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>{user.name}</TableCell>
                              <TableCell>{user.completed_at || '-'}</TableCell>
                              <TableCell>
                                {user.days_since_completed !== null ? `${user.days_since_completed} days` : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                          {(!dashboardData.main_task.completed_users || dashboardData.main_task.completed_users.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={3} align="center">No users completed this task</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </MuiTable>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Deleted users who completed main task */}
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Deleted - Completed Task</Typography>
                    <TableContainer>
                      <MuiTable size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Days</TableCell>
                            <TableCell>Hide</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {dashboardData.main_task.deleted_completed_users?.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>{user.name}</TableCell>
                              <TableCell>{user.completed_at || '-'}</TableCell>
                              <TableCell>
                                {user.days_since_completed !== null ? `${user.days_since_completed} days` : '-'}
                              </TableCell>
                              <TableCell>
                                <Checkbox
                                  checked={false}
                                  onChange={() => handleHideDeletedUser(user.id)}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                          {(!dashboardData.main_task.deleted_completed_users || dashboardData.main_task.deleted_completed_users.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={4} align="center">No deleted users completed this task</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </MuiTable>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            </>
          )}
        </Grid>
      </Box>
    )
  }

  // Если модератор - показываем его dashboard
  if (user?.roles?.some(r => r.name === 'moderator')) {
    if (loading) {
      return <Box sx={{ p: 3 }}>Loading...</Box>
    }

    if (!dashboardData) {
      return <Box sx={{ p: 3 }}>Error loading dashboard</Box>
    }

    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Dashboard</Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Completed Tasks
                </Typography>
                <Typography variant="h4">
                  {dashboardData.completed_tasks}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Tasks
                </Typography>
                <Typography variant="h4">
                  {dashboardData.total_tasks}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Success Rate
                </Typography>
                <Typography variant="h4">
                  {dashboardData.success_rate}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Work Days
                </Typography>
                <Typography variant="h4">
                  {dashboardData.work_days}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Work Information</Typography>
              <Typography><strong>Start Date:</strong> {dashboardData.work_start_date ? new Date(dashboardData.work_start_date).toLocaleDateString() : 'Not set'}</Typography>
              <Typography><strong>Timezone:</strong> {dashboardData.timezone}</Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, bgcolor: 'success.light', color: 'success.contrastText' }}>
              <Typography variant="h6" gutterBottom>Total Earnings</Typography>
              <Typography variant="h3">
                ${dashboardData.total_earnings}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    )
  }

  // Для админа или других ролей - показываем стандартный dashboard
  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Award />
      </Grid>
      <Grid size={{ xs: 12, md: 8, lg: 8 }}>
        <Transactions />
      </Grid>
      <Grid size={{ xs: 12, md: 6, lg: 4 }}>
        <WeeklyOverview />
      </Grid>
      <Grid size={{ xs: 12, md: 6, lg: 4 }}>
        <TotalEarning />
      </Grid>
      <Grid size={{ xs: 12, md: 6, lg: 4 }}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <LineChart />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CardStatVertical
              title='Total Profit'
              stats='$25.6k'
              avatarIcon='ri-pie-chart-2-line'
              avatarColor='secondary'
              subtitle='Weekly Profit'
              trendNumber='42%'
              trend='positive'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CardStatVertical
              stats='862'
              trend='negative'
              trendNumber='18%'
              title='New Project'
              subtitle='Yearly Project'
              avatarColor='primary'
              avatarIcon='ri-file-word-2-line'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <DistributedColumnChart />
          </Grid>
        </Grid>
      </Grid>
      <Grid size={{ xs: 12, md: 6, lg: 4 }}>
        <Performance />
      </Grid>
      <Grid size={{ xs: 12, lg: 8 }}>
        <DepositWithdraw />
      </Grid>
      <Grid size={{ xs: 12, md: 6, lg: 4 }}>
        <SalesByCountries />
      </Grid>
      <Grid size={{ xs: 12, md: 6, lg: 8 }}>
        <Table />
      </Grid>
    </Grid>
  )
}

export default DashboardPage
