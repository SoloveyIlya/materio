'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Drawer from '@mui/material/Drawer'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

// Third-party Imports
import classnames from 'classnames'
import PerfectScrollbar from 'react-perfect-scrollbar'

// Styles Imports
import styles from './styles.module.css'

const ScrollWrapper = ({ children, isBelowLgScreen }) => {
  if (isBelowLgScreen) {
    return <div className='bs-full overflow-y-auto overflow-x-hidden'>{children}</div>
  } else {
    return <PerfectScrollbar options={{ wheelPropagation: false }}>{children}</PerfectScrollbar>
  }
}

const SupportSidebar = ({ 
  isBelowLgScreen, 
  isBelowMdScreen, 
  sidebarOpen, 
  setSidebarOpen,
  activeCategory,
  setActiveCategory,
  tickets,
  currentUser
}) => {
  // Подсчет тикетов по категориям
  const getCategoryCount = (category) => {
    if (!tickets) return 0
    
    switch (category) {
      case 'new':
        // Новые - где нет ответа от админа
        return tickets.filter(ticket => {
          const hasAdminReply = ticket.messages?.some(msg => msg.from_user_id === currentUser?.id)
          return !hasAdminReply
        }).length
      case 'answered':
        // Отвеченные - где есть ответ от админа
        return tickets.filter(ticket => {
          const hasAdminReply = ticket.messages?.some(msg => msg.from_user_id === currentUser?.id)
          return hasAdminReply
        }).length
      case 'moderator':
        // От модераторов
        return tickets.filter(ticket => {
          if (Array.isArray(ticket.user?.roles)) {
            return ticket.user.roles.some(role => role.name === 'moderator')
          }
          return false
        }).length
      default:
        return 0
    }
  }

  const categories = [
    { key: 'new', label: 'New', icon: 'ri-mail-line' },
    { key: 'answered', label: 'Answered', icon: 'ri-mail-check-line' },
    { key: 'moderator', label: 'Moderator', icon: 'ri-user-line' }
  ]

  return (
    <Drawer
      open={sidebarOpen}
      onClose={() => setSidebarOpen(false)}
      className='bs-full'
      variant={!isBelowMdScreen ? 'permanent' : 'persistent'}
      ModalProps={{ disablePortal: true, keepMounted: true }}
      sx={{
        zIndex: isBelowMdScreen && sidebarOpen ? 11 : 10,
        position: !isBelowMdScreen ? 'static' : 'absolute',
        '& .MuiDrawer-paper': {
          boxShadow: 'none',
          overflow: 'hidden',
          width: '260px',
          position: !isBelowMdScreen ? 'static' : 'absolute'
        }
      }}
    >
      <CardContent>
        <Typography variant='h6' sx={{ mb: 2 }}>Support</Typography>
      </CardContent>
      <ScrollWrapper isBelowLgScreen={isBelowLgScreen}>
        <div className='flex flex-col gap-1 plb-4'>
          {categories.map((category) => {
            const count = getCategoryCount(category.key)
            const isActive = activeCategory === category.key
            
            return (
              <div
                key={category.key}
                onClick={() => setActiveCategory(category.key)}
                className={classnames(
                  'flex items-center justify-between plb-1 pli-5 gap-2.5 min-bs-8 bs-[32px] cursor-pointer',
                  {
                    [styles.activeSidebarListItem]: isActive
                  }
                )}
              >
                <div className='flex items-center gap-2.5'>
                  <i className={classnames(category.icon, 'text-xl')} />
                  <Typography className='capitalize' color='inherit'>
                    {category.label}
                  </Typography>
                </div>
                {count > 0 && (
                  <Chip
                    label={count}
                    size='small'
                    variant='tonal'
                    color={category.key === 'new' ? 'primary' : category.key === 'answered' ? 'success' : 'default'}
                  />
                )}
              </div>
            )
          })}
        </div>
      </ScrollWrapper>
    </Drawer>
  )
}

export default SupportSidebar

