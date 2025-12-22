'use client'

// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import CircularProgress from '@mui/material/CircularProgress'

// Component Imports
import api from '@/lib/api'

const LogsTab = ({ userId }) => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      loadLogs()
    }
  }, [userId])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/admin/activity-logs`, {
        params: {
          user_id: userId,
          per_page: 100
        }
      })
      setLogs(response.data.data || [])
    } catch (error) {
      console.error('Error loading logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  const getActionColor = (action) => {
    const colors = {
      created: 'success',
      updated: 'info',
      deleted: 'error',
      assigned: 'warning',
      completed: 'success',
      started: 'info'
    }
    return colors[action] || 'default'
  }

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader title='Activity Logs' />
      <CardContent>
        {logs.length === 0 ? (
          <Typography color='text.secondary'>No logs found for this user.</Typography>
        ) : (
          <TableContainer component={Paper} variant='outlined'>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>IP Address</TableCell>
                  <TableCell>Model Type</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Typography variant='body2'>{formatDate(log.created_at)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.action}
                        color={getActionColor(log.action)}
                        size='small'
                        variant='tonal'
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2'>{log.description || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2'>{log.ip_address || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2'>{log.model_type || '—'}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  )
}

export default LogsTab

