'use client'

// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import { styled } from '@mui/material'

// Third-party Imports
import classnames from 'classnames'
import PerfectScrollbar from 'react-perfect-scrollbar'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'
import DirectionalIcon from '@components/DirectionalIcon'

// Styles Imports
import styles from './styles.module.css'

// Util Imports
import { getInitials } from '@/utils/getInitials'
import api from '@/lib/api'
import { showToast } from '@/utils/toast'
import { useMenuCounts } from '@/hooks/useMenuCounts'

const ScrollWrapper = ({ children, isBelowLgScreen }) => {
  if (isBelowLgScreen) {
    return <div className='bs-full overflow-y-auto overflow-x-hidden bg-actionHover'>{children}</div>
  } else {
    return (
      <PerfectScrollbar className='bg-actionHover' options={{ wheelPropagation: false }}>
        {children}
      </PerfectScrollbar>
    )
  }
}

const DetailsDrawer = styled('div')(({ drawerOpen }) => ({
  display: 'flex',
  flexDirection: 'column',
  blockSize: '100%',
  inlineSize: '100%',
  position: 'absolute',
  top: 0,
  right: drawerOpen ? 0 : '-100%',
  zIndex: 11,
  overflow: 'hidden',
  background: 'var(--mui-palette-background-paper)',
  transition: 'right 0.3s ease'
}))

const SupportDetails = ({
  drawerOpen,
  setDrawerOpen,
  isBelowSmScreen,
  isBelowLgScreen,
  currentTicket,
  tickets,
  onReplySent,
  currentUser,
  loadTickets
}) => {
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [ticketData, setTicketData] = useState(currentTicket)
  const { refreshCounts } = useMenuCounts()

  useEffect(() => {
    if (currentTicket?.id) {
      loadTicketDetails()
    }
  }, [currentTicket?.id])

  const loadTicketDetails = async () => {
    if (!currentTicket?.id) return
    
    try {
      const response = await api.get(`/admin/support/${currentTicket.id}`)
      setTicketData(response.data)
    } catch (error) {
      console.error('Error loading ticket details:', error)
    }
  }

  const handleCloseDrawer = () => {
    setDrawerOpen(false)
    setReplyText('')
  }

  const handleSendReply = async () => {
    if (!replyText.trim() || !currentTicket) return

    try {
      setSending(true)
      await api.post(`/admin/support/${currentTicket.id}/reply`, {
        body: replyText
      })
      setReplyText('')
      // Reload ticket details
      await loadTicketDetails()
      if (loadTickets) {
        await loadTickets()
      }
      if (onReplySent) {
        onReplySent()
      }
      // Обновляем счетчик в меню
      if (refreshCounts) {
        await refreshCounts()
      }
      showToast.success('Reply sent successfully')
    } catch (error) {
      console.error('Error sending reply:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Error sending reply'
      showToast.error(errorMessage)
    } finally {
      setSending(false)
    }
  }

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'default',
      medium: 'info',
      high: 'warning',
      urgent: 'error'
    }
    return colors[priority] || 'default'
  }

  const getStatusColor = (status) => {
    const colors = {
      open: 'info',
      in_progress: 'warning',
      resolved: 'success',
      closed: 'default'
    }
    return colors[status] || 'default'
  }

  if (!currentTicket) return null

  const ticket = ticketData || currentTicket
  const messages = ticket.messages || []
  const initialMessage = {
    from: ticket.user,
    body: ticket.description,
    created_at: ticket.created_at
  }

  return (
    <DetailsDrawer drawerOpen={drawerOpen}>
      <div className='plb-4 pli-5'>
        <div className='flex justify-between gap-2'>
          <div className='flex gap-2 items-center overflow-hidden'>
            <IconButton onClick={handleCloseDrawer}>
              <DirectionalIcon
                ltrIconClass='ri-arrow-left-s-line'
                rtlIconClass='ri-arrow-right-s-line'
                className='text-textPrimary'
              />
            </IconButton>
            <div className='flex items-center flex-wrap gap-2 overflow-hidden'>
              <Typography color='text.primary' noWrap>
                {ticket.subject}
              </Typography>
              <Chip
                label={ticket.priority}
                size='small'
                color={getPriorityColor(ticket.priority)}
                variant='tonal'
              />
              <Chip
                label={ticket.status}
                size='small'
                color={getStatusColor(ticket.status)}
                variant='tonal'
              />
            </div>
          </div>
        </div>
      </div>
      <ScrollWrapper isBelowLgScreen={isBelowLgScreen}>
        <div className='plb-5 pli-8 flex flex-col gap-4'>
          {/* Initial ticket message */}
          <Card className='border'>
            <CardContent className='flex is-full gap-4'>
              <CustomAvatar 
                src={initialMessage.from?.avatar} 
                size={38} 
                alt={initialMessage.from?.name || initialMessage.from?.email}
              >
                {getInitials(initialMessage.from?.name || initialMessage.from?.email || 'U')}
              </CustomAvatar>
              <div className='flex items-center justify-between flex-wrap grow gap-x-4 gap-y-2'>
                <div className='flex flex-col'>
                  <Typography color='text.primary'>
                    {initialMessage.from?.name || initialMessage.from?.email || 'Unknown'}
                  </Typography>
                  <Typography variant='body2'>{initialMessage.from?.email}</Typography>
                </div>
                <Typography color='text.disabled' variant='body2'>
                  {new Intl.DateTimeFormat('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  }).format(new Date(initialMessage.created_at))}
                </Typography>
              </div>
            </CardContent>
            <CardContent>
              <Typography className='text-textSecondary' style={{ whiteSpace: 'pre-wrap' }}>
                {initialMessage.body}
              </Typography>
            </CardContent>
          </Card>

          {/* Messages */}
          {messages.map((message) => (
            <Card key={message.id} className='border'>
              <CardContent className='flex is-full gap-4'>
                <CustomAvatar 
                  src={message.fromUser?.avatar} 
                  size={38} 
                  alt={message.fromUser?.name || message.fromUser?.email}
                >
                  {getInitials(message.fromUser?.name || message.fromUser?.email || 'U')}
                </CustomAvatar>
                <div className='flex items-center justify-between flex-wrap grow gap-x-4 gap-y-2'>
                  <div className='flex flex-col'>
                    <Typography color='text.primary'>
                      {message.fromUser?.name || message.fromUser?.email || 'Unknown'}
                    </Typography>
                    <Typography variant='body2'>{message.fromUser?.email}</Typography>
                  </div>
                  <Typography color='text.disabled' variant='body2'>
                    {new Intl.DateTimeFormat('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    }).format(new Date(message.created_at))}
                  </Typography>
                </div>
              </CardContent>
              <CardContent>
                <Typography className='text-textSecondary' style={{ whiteSpace: 'pre-wrap' }}>
                  {message.body}
                </Typography>
              </CardContent>
            </Card>
          ))}

          {/* Reply form */}
          <Card className='border'>
            <CardContent>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                Reply to {ticket.user?.name || ticket.user?.email}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder='Write your message...'
              />
            </CardContent>
            <CardActions>
              <div className='flex items-center justify-end gap-4'>
                <Button onClick={handleCloseDrawer}>Cancel</Button>
                <Button
                  variant='contained'
                  color='primary'
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || sending}
                  endIcon={<i className='ri-send-plane-line' />}
                >
                  {sending ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </CardActions>
          </Card>
        </div>
      </ScrollWrapper>
    </DetailsDrawer>
  )
}

export default SupportDetails

