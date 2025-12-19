'use client'

import { useState, useEffect } from 'react'
import { Box, Typography, Grid } from '@mui/material'
import api from '@/lib/api'

// Component Imports
import ActivityLogsTable from '@/views/apps/activity-logs/ActivityLogsTable'

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState([])
  const [filters, setFilters] = useState({
    user_id: '',
    event_type: '',
    date_from: '',
    date_to: '',
  })

  useEffect(() => {
    loadLogs()
  }, [filters])

  const loadLogs = async () => {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
      const response = await api.get(`/admin/activity-logs?${params}`)
      setLogs(response.data.data || response.data || [])
    } catch (error) {
      console.error('Error loading logs:', error)
      setLogs([])
    }
  }

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
  }

  return (
    <Box sx={{ p: 6 }}>
      <Typography variant='h4' gutterBottom>Activity Logs</Typography>

      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <ActivityLogsTable
            tableData={logs}
            filters={filters}
            onFilterChange={handleFilterChange}
          />
        </Grid>
      </Grid>
    </Box>
  )
}
