'use client'

// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import Backdrop from '@mui/material/Backdrop'
import Chip from '@mui/material/Chip'

// Third-party Imports
import classnames from 'classnames'
import PerfectScrollbar from 'react-perfect-scrollbar'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'

// Styles Imports
import styles from './styles.module.css'

// Util Imports
import { getInitials } from '@/utils/getInitials'

const ScrollWrapper = ({ children, isBelowLgScreen }) => {
  if (isBelowLgScreen) {
    return <div className='bs-full overflow-y-auto overflow-x-hidden relative'>{children}</div>
  } else {
    return <PerfectScrollbar options={{ wheelPropagation: false }}>{children}</PerfectScrollbar>
  }
}

const SupportContentList = ({
  isInitialMount,
  isBelowSmScreen,
  isBelowLgScreen,
  reload,
  areFilteredTicketsNone,
  searchTerm,
  selectedTickets,
  tickets,
  setSelectedTickets,
  setDrawerOpen,
  handleTicketClick,
  currentUser
}) => {
  // Toggle single selection of ticket
  const toggleTicketSelected = ticketId => {
    setSelectedTickets(prevSelectedTickets => {
      const newSelectedTickets = new Set(prevSelectedTickets)

      if (newSelectedTickets.has(ticketId)) {
        newSelectedTickets.delete(ticketId)
      } else {
        newSelectedTickets.add(ticketId)
      }

      return newSelectedTickets
    })
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

  // Проверка, есть ли непрочитанные сообщения от модератора
  const hasUnreadMessages = (ticket) => {
    if (!ticket.messages) return false
    return ticket.messages.some(msg => 
      msg.from_user_id !== currentUser?.id && !msg.is_read
    )
  }

  return isInitialMount ? (
    <div className='flex items-center justify-center gap-2 grow is-full'>
      <CircularProgress />
      <Typography>Loading...</Typography>
    </div>
  ) : areFilteredTicketsNone ? (
    <div className='relative flex justify-center gap-2 grow is-full'>
      <Typography color='text.primary' className='m-3'>
        No tickets found!
      </Typography>
      {reload && (
        <Backdrop open={reload} className='absolute text-white z-10 bg-textDisabled'>
          <CircularProgress color='inherit' />
        </Backdrop>
      )}
    </div>
  ) : (
    <div className='relative overflow-hidden grow is-full'>
      <ScrollWrapper isBelowLgScreen={isBelowLgScreen}>
        <div className='flex flex-col'>
          {tickets
            .filter(
              ticket =>
                ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map(ticket => {
              const unread = hasUnreadMessages(ticket)
              
              return (
                <div
                  key={ticket.id}
                  className={classnames('p-4 cursor-pointer', styles.emailList, { 
                    'bg-actionHover': !unread,
                    'font-medium': unread
                  })}
                  onClick={() => handleTicketClick(ticket.id)}
                >
                  <div className='flex items-center justify-between gap-2'>
                    <div className='flex items-center gap-2 overflow-hidden'>
                      <Checkbox
                        checked={selectedTickets.has(ticket.id)}
                        onChange={() => toggleTicketSelected(ticket.id)}
                        onClick={e => e.stopPropagation()}
                      />
                      <CustomAvatar 
                        src={ticket.user?.avatar} 
                        alt={ticket.user?.name || ticket.user?.email} 
                        size={32}
                      >
                        {getInitials(ticket.user?.name || ticket.user?.email || 'U')}
                      </CustomAvatar>
                      <div className='flex gap-4 justify-between items-center overflow-hidden'>
                        <Typography color='text.primary' className='font-medium whitespace-nowrap'>
                          {ticket.user?.name || ticket.user?.email || 'Unknown'}
                        </Typography>
                        <Typography variant='body2' noWrap className={unread ? 'font-medium' : ''}>
                          {ticket.subject}
                        </Typography>
                      </div>
                    </div>
                    {!isBelowSmScreen && (
                      <div
                        className={classnames('flex items-center gap-2', styles.emailInfo, {
                          [styles.show]: isBelowLgScreen
                        })}
                      >
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
                        <Typography variant='body2' color='text.disabled' className='whitespace-nowrap'>
                          {new Intl.DateTimeFormat('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          }).format(new Date(ticket.created_at))}
                        </Typography>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
        </div>
      </ScrollWrapper>
      {reload && (
        <Backdrop open={reload} className='absolute text-white z-10 bg-textDisabled'>
          <CircularProgress color='inherit' />
        </Backdrop>
      )}
    </div>
  )
}

export default SupportContentList

