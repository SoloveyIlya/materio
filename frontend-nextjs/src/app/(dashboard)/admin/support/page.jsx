'use client'

// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip
} from '@mui/material'
import api from '@/lib/api'

const ticketStatusColors = {
  open: 'info',
  in_progress: 'warning',
  resolved: 'success',
  closed: 'default'
}

const ticketPriorityColors = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  urgent: 'error'
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [formData, setFormData] = useState({
    status: '',
    priority: '',
    assigned_to: ''
  })

  useEffect(() => {
    loadTickets()
  }, [filterStatus, filterPriority])

  const loadTickets = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterStatus !== 'all') {
        params.append('status', filterStatus)
      }
      if (filterPriority !== 'all') {
        params.append('priority', filterPriority)
      }
      const response = await api.get(`/admin/support?${params}`)
      setTickets(response.data?.data || response.data || [])
    } catch (error) {
      console.error('Error loading tickets:', error)
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  const handleViewTicket = async (ticket) => {
    try {
      const response = await api.get(`/admin/support/${ticket.id}`)
      setSelectedTicket(response.data)
      setFormData({
        status: response.data.status,
        priority: response.data.priority,
        assigned_to: response.data.assigned_to || ''
      })
      setDialogOpen(true)
    } catch (error) {
      console.error('Error loading ticket:', error)
    }
  }

  const handleUpdateTicket = async () => {
    if (!selectedTicket) return

    try {
      await api.put(`/admin/support/${selectedTicket.id}`, formData)
      setDialogOpen(false)
      setSelectedTicket(null)
      loadTickets()
      alert('Ticket updated successfully')
    } catch (error) {
      console.error('Error updating ticket:', error)
      alert('Error updating ticket')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleString('ru-RU')
  }

  return (
    <Box sx={{ p: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant='h4'>Support Tickets Management</Typography>
      </Box>

      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                <Typography variant='h6'>All Tickets</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={filterStatus}
                      label="Status"
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="open">Open</MenuItem>
                      <MenuItem value="in_progress">In Progress</MenuItem>
                      <MenuItem value="resolved">Resolved</MenuItem>
                      <MenuItem value="closed">Closed</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Priority</InputLabel>
                    <Select
                      value={filterPriority}
                      label="Priority"
                      onChange={(e) => setFilterPriority(e.target.value)}
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="urgent">Urgent</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              {loading ? (
                <Typography>Loading...</Typography>
              ) : tickets.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>User</TableCell>
                        <TableCell>Subject</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell>Resolved</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tickets.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell>#{ticket.id}</TableCell>
                          <TableCell>
                            <Typography variant='body2'>
                              {ticket.user?.name || ticket.user?.email || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2' fontWeight='medium'>
                              {ticket.subject}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={ticket.priority}
                              color={ticketPriorityColors[ticket.priority] || 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={ticket.status}
                              color={ticketStatusColors[ticket.status] || 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{formatDate(ticket.created_at)}</TableCell>
                          <TableCell>{formatDate(ticket.resolved_at)}</TableCell>
                          <TableCell>
                            <Tooltip title="View & Edit">
                              <IconButton
                                size="small"
                                onClick={() => handleViewTicket(ticket)}
                              >
                                <i className='ri-eye-line' />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color='text.secondary'>
                    No tickets found.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Диалог просмотра/редактирования тикета */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Ticket Details - {selectedTicket?.subject}</DialogTitle>
        <DialogContent>
          {selectedTicket && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" color="text.secondary">User:</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedTicket.user?.name || selectedTicket.user?.email || '—'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" color="text.secondary">Description:</Typography>
                <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                  {selectedTicket.description}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <MenuItem value="open">Open</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="resolved">Resolved</MenuItem>
                    <MenuItem value="closed">Closed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={formData.priority}
                    label="Priority"
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
          <Button onClick={handleUpdateTicket} variant="contained" color="primary">
            Update Ticket
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
