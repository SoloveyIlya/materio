'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Box from '@mui/material/Box'

// Component Imports
import SupportContentList from './SupportContentList'
import SupportDetails from './SupportDetails'

const SupportContent = ({
  isInitialMount,
  isBelowLgScreen,
  isBelowMdScreen,
  isBelowSmScreen,
  reload,
  tickets,
  activeCategory,
  setSidebarOpen,
  setBackdropOpen,
  currentUser,
  onReplySent
}) => {
  const [selectedTickets, setSelectedTickets] = useState(new Set())
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [currentTicketId, setCurrentTicketId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Filter tickets by category
  const filteredTickets = tickets?.filter(ticket => {
    if (activeCategory === 'new') {
      const hasAdminReply = ticket.messages?.some(msg => msg.from_user_id === currentUser?.id)
      return !hasAdminReply
    } else if (activeCategory === 'answered') {
      const hasAdminReply = ticket.messages?.some(msg => msg.from_user_id === currentUser?.id)
      return hasAdminReply
    } else if (activeCategory === 'moderator') {
      if (Array.isArray(ticket.user?.roles)) {
        return ticket.user.roles.some(role => role.name === 'moderator')
      }
      return false
    }
    return true
  }) || []

  const areFilteredTicketsNone = filteredTickets.length === 0 ||
    filteredTickets.filter(
      ticket =>
        ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ).length === 0

  const currentTicket = filteredTickets.find(t => t.id === currentTicketId)

  const handleTicketClick = (ticketId) => {
    setCurrentTicketId(ticketId)
    setDrawerOpen(true)
  }

  const handleReplySent = () => {
    if (onReplySent) {
      onReplySent()
    }
  }

  return (
    <div className='flex flex-col items-center justify-center is-full bs-full relative overflow-hidden bg-backgroundPaper'>
      {/* Search */}
      <Box sx={{ width: '100%', p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <TextField
          fullWidth
          size='small'
          placeholder='Search tickets...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position='start'>
                <i className='ri-search-line' />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position='end'>
                <IconButton size='small' onClick={() => setSearchTerm('')}>
                  <i className='ri-close-line' />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </Box>

      {/* Ticket List */}
      <SupportContentList
        isInitialMount={isInitialMount}
        isBelowSmScreen={isBelowSmScreen}
        isBelowLgScreen={isBelowLgScreen}
        reload={reload}
        areFilteredTicketsNone={areFilteredTicketsNone}
        searchTerm={searchTerm}
        selectedTickets={selectedTickets}
        tickets={filteredTickets}
        setSelectedTickets={setSelectedTickets}
        setDrawerOpen={setDrawerOpen}
        handleTicketClick={handleTicketClick}
        currentUser={currentUser}
      />

      {/* Ticket Details */}
      <SupportDetails
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        isBelowSmScreen={isBelowSmScreen}
        isBelowLgScreen={isBelowLgScreen}
        currentTicket={currentTicket}
        tickets={filteredTickets}
        onReplySent={handleReplySent}
        currentUser={currentUser}
        loadTickets={onReplySent}
      />
    </div>
  )
}

export default SupportContent

