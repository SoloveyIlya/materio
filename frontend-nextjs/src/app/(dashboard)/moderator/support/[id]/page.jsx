'use client'

// React Imports
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

// MUI Imports
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'

// Component Imports
import api, { API_URL } from '@/lib/api'
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

export default function TicketDetailPage() {
  const router = useRouter()
  const params = useParams()
  const ticketId = params.id

  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (ticketId) {
      loadTicket()
    }
  }, [ticketId])

  const loadTicket = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get(`/moderator/support/${ticketId}`)
      setTicket(response.data)
    } catch (error) {
      console.error('Error loading ticket:', error)
      setError('Failed to load ticket details')
      showToast.error('Failed to load ticket details')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleString('ru-RU')
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error || !ticket) {
    return (
      <Box sx={{ p: 6 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Ticket not found'}
        </Alert>
        <Button variant="contained" onClick={() => router.push('/moderator/support')}>
          Back to Tickets
        </Button>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 6 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <IconButton onClick={() => router.push('/moderator/support')} sx={{ mr: 2 }}>
          <i className='ri-arrow-left-line' />
        </IconButton>
        <Typography variant='h4'>Ticket #{ticket.id}</Typography>
      </Box>

      <Grid container spacing={6}>
        <Grid size={{ xs: 12, md: 8 }}>
          {/* Initial ticket message */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant='h5' sx={{ mb: 2 }}>
                {ticket.subject}
              </Typography>
              <Divider sx={{ my: 3 }} />
              <Typography variant='body1' sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>
                {ticket.description}
              </Typography>

              {ticket.attachments && ticket.attachments.length > 0 && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Typography variant='h6' sx={{ mb: 2 }}>
                    Attachments
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {ticket.attachments.map((attachment, index) => {
                      const fileUrl = attachment.file_path?.startsWith('http') 
                        ? attachment.file_path 
                        : `${API_URL}${attachment.file_path}`
                      return (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <i className='ri-file-line' style={{ fontSize: '20px' }} />
                          <Typography variant='body2' sx={{ flex: 1 }}>
                            {attachment.file_name}
                          </Typography>
                          <Button
                            size="small"
                            variant="outlined"
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Download
                          </Button>
                        </Box>
                      )
                    })}
                  </Box>
                </>
              )}
            </CardContent>
          </Card>

          {/* Messages */}
          {ticket.messages && ticket.messages.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {ticket.messages.map((message) => (
                <Card key={message.id}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant='subtitle1' fontWeight='medium'>
                          {message.fromUser?.name || message.fromUser?.email || 'Unknown'}
                        </Typography>
                        {message.fromUser?.email && (
                          <Typography variant='body2' color='text.secondary'>
                            {message.fromUser.email}
                          </Typography>
                        )}
                      </Box>
                      <Typography variant='body2' color='text.secondary'>
                        {formatDate(message.created_at)}
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant='body1' sx={{ whiteSpace: 'pre-wrap' }}>
                      {message.body}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 3 }}>Ticket Information</Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
                    Status
                  </Typography>
                  <Chip
                    label={ticket.status}
                    color={ticketStatusColors[ticket.status] || 'default'}
                    size="small"
                  />
                </Box>

                <Box>
                  <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
                    Priority
                  </Typography>
                  <Chip
                    label={ticket.priority}
                    color={ticketPriorityColors[ticket.priority] || 'default'}
                    size="small"
                  />
                </Box>

                <Box>
                  <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
                    Created
                  </Typography>
                  <Typography variant='body2'>
                    {formatDate(ticket.created_at)}
                  </Typography>
                </Box>

                {ticket.resolved_at && (
                  <Box>
                    <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
                      Resolved
                    </Typography>
                    <Typography variant='body2'>
                      {formatDate(ticket.resolved_at)}
                    </Typography>
                  </Box>
                )}

                {ticket.assignedUser && (
                  <Box>
                    <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
                      Assigned To
                    </Typography>
                    <Typography variant='body2'>
                      {ticket.assignedUser.name || ticket.assignedUser.email}
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
