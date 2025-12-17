'use client'

import { useState, useEffect } from 'react'
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, FormControl, InputLabel, Select, MenuItem, Chip } from '@mui/material'
import api from '@/lib/api'

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
      setLogs(response.data.data || response.data)
    } catch (error) {
      console.error('Error loading logs:', error)
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Activity Logs</Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          label="Date From"
          type="date"
          value={filters.date_from}
          onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Date To"
          type="date"
          value={filters.date_to}
          onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
          InputLabelProps={{ shrink: true }}
        />
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Event Type</InputLabel>
          <Select
            value={filters.event_type}
            label="Event Type"
            onChange={(e) => setFilters({ ...filters, event_type: e.target.value })}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="page_view">Page View</MenuItem>
            <MenuItem value="action">Action</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Event Type</TableCell>
              <TableCell>Route</TableCell>
              <TableCell>IP</TableCell>
              <TableCell>Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{log.id}</TableCell>
                <TableCell>{log.user?.name || log.user?.email || '—'}</TableCell>
                <TableCell>
                  <Chip label={log.action} size="small" />
                </TableCell>
                <TableCell>{log.event_type || '—'}</TableCell>
                <TableCell>{log.route || '—'}</TableCell>
                <TableCell>{log.ip_address || '—'}</TableCell>
                <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
