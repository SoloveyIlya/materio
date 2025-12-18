'use client'

import { useState, useEffect } from 'react'
import { Box, Typography, Grid, Card, CardContent, Paper } from '@mui/material'
import api from '@/lib/api'

export default function ModeratorDashboardPage() {
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const response = await api.get('/moderator/dashboard')
      setDashboardData(response.data)
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

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
