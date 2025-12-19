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
  Alert,
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

export default function SupportPage() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    priority: 'medium'
  })

  useEffect(() => {
    loadTickets()
  }, [filterStatus])

  const loadTickets = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterStatus !== 'all') {
        params.append('status', filterStatus)
      }
      const response = await api.get(`/moderator/support?${params}`)
      setTickets(response.data || [])
    } catch (error) {
      console.error('Error loading tickets:', error)
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTicket = () => {
    setFormData({ subject: '', description: '', priority: 'medium' })
    setDialogOpen(true)
  }

  const handleSubmitTicket = async () => {
    if (!formData.subject.trim() || !formData.description.trim()) {
      alert('Please fill in all required fields')
      return
    }

    try {
      await api.post('/moderator/support', formData)
      setDialogOpen(false)
      setFormData({ subject: '', description: '', priority: 'medium' })
      loadTickets()
      alert('Ticket created successfully')
    } catch (error) {
      console.error('Error creating ticket:', error)
      alert('Error creating ticket')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleString('ru-RU')
  }

  return (
    <Box sx={{ p: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant='h4'>Support Tickets</Typography>
        <Button
          variant='contained'
          startIcon={<i className='ri-add-line' />}
          onClick={handleCreateTicket}
        >
          Create Ticket
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="body2">
          Use this section to create tickets for questions related to salary, insurance, benefits, and other administrative matters.
        </Typography>
      </Alert>

      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant='h6'>My Tickets</Typography>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Filter by Status</InputLabel>
                  <Select
                    value={filterStatus}
                    label="Filter by Status"
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="open">Open</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="resolved">Resolved</MenuItem>
                    <MenuItem value="closed">Closed</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {loading ? (
                <Typography>Loading...</Typography>
              ) : tickets.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
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
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  // Можно открыть диалог с деталями
                                  alert(`Ticket: ${ticket.subject}\n\nDescription: ${ticket.description}`)
                                }}
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
                    No tickets found. Create your first support ticket!
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Диалог создания тикета */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Support Ticket</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g., Salary question, Insurance issue..."
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
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
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={6}
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your issue in detail..."
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmitTicket} variant="contained" color="primary">
            Create Ticket
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
