'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent,
  CardHeader,
  Paper,
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Button,
  Avatar,
  Chip
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
import CardStatWithImage from '@/components/card-statistics/Character'
import TransactionsCRM from '@/views/dashboards/crm/Transactions'
import MainTaskList from '@/views/dashboards/crm/MainTaskList'
import CustomAvatar from '@core/components/mui/Avatar'

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

    const formatDate = (dateString) => {
      if (!dateString) return '-'
      const date = new Date(dateString)
      const day = String(date.getDate()).padStart(2, '0')
      const month = date.toLocaleString('en-US', { month: 'short' })
      return `${day} ${month}`
    }

    return (
      <Box sx={{ p: 6 }}>
        <Grid container spacing={6}>
          {/* Working Moderators Card */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }} className='self-end'>
            <CardStatWithImage
              stats={String(dashboardData.working_moderators?.length || 0)}
              title='Working'
              chipColor='primary'
              src='/images/illustrations/characters/9.png'
              chipText='Active moderators'
            />
          </Grid>

          {/* Deleted Moderators Card */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }} className='self-end'>
            <CardStatWithImage
              stats={String(dashboardData.deleted_moderators?.length || 0)}
              title='Deleted'
              chipColor='error'
              src='/images/illustrations/characters/10.png'
              chipText='Removed moderators'
            />
          </Grid>

          {/* Tasks Card */}
          <Grid size={{ xs: 12, md: 6 }} className='self-end'>
            <Card>
              <CardHeader
                title='Tasks'
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <div className='flex items-center gap-3'>
                      <CustomAvatar variant='rounded' color='primary' className='shadow-xs'>
                        <i className='ri-time-line'></i>
                      </CustomAvatar>
                      <div>
                        <Typography>Under Review</Typography>
                        <Typography variant='h5'>{dashboardData.tasks?.under_review || 0}</Typography>
                      </div>
                    </div>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <div className='flex items-center gap-3'>
                      <CustomAvatar variant='rounded' color='success' className='shadow-xs'>
                        <i className='ri-group-line'></i>
                      </CustomAvatar>
                      <div>
                        <Typography>Pending</Typography>
                        <Typography variant='h5'>{dashboardData.tasks?.pending || 0}</Typography>
                      </div>
                    </div>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <div className='flex items-center gap-3'>
                      <CustomAvatar variant='rounded' color='warning' className='shadow-xs'>
                        <i className='ri-checkbox-circle-line'></i>
                      </CustomAvatar>
                      <div>
                        <Typography>Completed</Typography>
                        <Typography variant='h5'>{dashboardData.tasks?.completed || 0}</Typography>
                      </div>
                    </div>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Main Task Lists */}
          {dashboardData.main_task && (
            <>
              <Grid size={{ xs: 12, md: 4 }}>
                <MainTaskList
                  title='Main task sent'
                  users={dashboardData.main_task.received_users}
                  dotColor='primary'
                  formatDate={formatDate}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <MainTaskList
                  title='Main task completed'
                  users={dashboardData.main_task.completed_users}
                  dotColor='success'
                  formatDate={formatDate}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <MainTaskList
                  title='Deleted users'
                  users={dashboardData.main_task.deleted_completed_users}
                  dotColor='error'
                  showCheckbox={true}
                  onCheckboxChange={handleHideDeletedUser}
                  formatDate={formatDate}
                />
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
