'use client'

// React Imports
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// MUI Imports
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'

// Component Imports
import SupportTicketHeader from '@/views/apps/support/moderator/SupportTicketHeader'
import SupportTicketForm from '@/views/apps/support/moderator/SupportTicketForm'
import SupportTicketAttachments from '@/views/apps/support/moderator/SupportTicketAttachments'
import api from '@/lib/api'
import { showToast } from '@/utils/toast'

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
  const router = useRouter()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [createMode, setCreateMode] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    priority: 'medium'
  })
  const [attachments, setAttachments] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)

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
    setAttachments([])
    setDraftSaved(false)
    setCreateMode(true)
  }

  const handleDiscard = () => {
    if (confirm('Are you sure you want to discard this ticket? All unsaved changes will be lost.')) {
      setFormData({ subject: '', description: '', priority: 'medium' })
      setAttachments([])
      setDraftSaved(false)
      setCreateMode(false)
    }
  }

  const handleSaveDraft = () => {
    // Сохраняем в localStorage как черновик
    const draft = {
      subject: formData.subject,
      description: formData.description,
      priority: formData.priority,
      attachments: attachments.map(f => ({ name: f.name, size: f.size, type: f.type }))
    }
    localStorage.setItem('support_ticket_draft', JSON.stringify(draft))
    setDraftSaved(true)
    showToast.success('Draft saved successfully')
  }

  const handleSubmitTicket = async () => {
    if (!formData.subject.trim() || !formData.description.trim()) {
      showToast.error('Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)
      const submitData = new FormData()
      submitData.append('subject', formData.subject)
      submitData.append('description', formData.description)
      submitData.append('priority', formData.priority)

      // Добавляем вложения
      attachments.forEach((file, index) => {
        submitData.append(`attachments[${index}]`, file)
      })

      await api.post('/moderator/support', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      // Удаляем черновик из localStorage
      localStorage.removeItem('support_ticket_draft')
      
      showToast.success('Ticket created successfully')
      setCreateMode(false)
      setFormData({ subject: '', description: '', priority: 'medium' })
      setAttachments([])
      setDraftSaved(false)
      loadTickets()
    } catch (error) {
      console.error('Error creating ticket:', error)
      showToast.error('Error creating ticket: ' + (error.response?.data?.message || error.message))
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleString('ru-RU')
  }

  // Загружаем черновик при монтировании, если он есть
  useEffect(() => {
    const draft = localStorage.getItem('support_ticket_draft')
    if (draft) {
      try {
        const parsedDraft = JSON.parse(draft)
        setFormData({
          subject: parsedDraft.subject || '',
          description: parsedDraft.description || '',
          priority: parsedDraft.priority || 'medium'
        })
        // Примечание: файлы из localStorage нельзя восстановить, только метаданные
      } catch (error) {
        console.error('Error loading draft:', error)
      }
    }
  }, [])

  if (createMode) {
    return (
      <Box sx={{ p: 6 }}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12 }}>
            <SupportTicketHeader
              onDiscard={handleDiscard}
              onSaveDraft={handleSaveDraft}
              onSubmit={handleSubmitTicket}
              loading={submitting}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <Grid container spacing={6}>
              <Grid size={{ xs: 12 }}>
                <SupportTicketForm formData={formData} onChange={setFormData} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <SupportTicketAttachments files={attachments} onFilesChange={setAttachments} />
              </Grid>
            </Grid>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Typography variant='h6' sx={{ mb: 2 }}>Ticket Information</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography variant='caption' color='text.secondary'>Priority</Typography>
                    <Chip
                      label={formData.priority}
                      color={ticketPriorityColors[formData.priority] || 'default'}
                      size='small'
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                  {draftSaved && (
                    <Alert severity='success' sx={{ mt: 1 }}>
                      Draft saved
                    </Alert>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    )
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
    </Box>
  )
}
