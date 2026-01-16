// MUI Imports
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'

// Third-party Imports
import classnames from 'classnames'
import PerfectScrollbar from 'react-perfect-scrollbar'

// Component Imports
import { statusObj } from './SidebarLeft'
import AvatarWithBadge from './AvatarWithBadge'
import WorkScheduleEditor from './WorkScheduleEditor'

const ScrollWrapper = ({ children, isBelowLgScreen, className }) => {
  if (isBelowLgScreen) {
    return <div className={classnames('bs-full overflow-x-hidden overflow-y-auto', className)}>{children}</div>
  } else {
    return (
      <PerfectScrollbar options={{ wheelPropagation: false }} className={className}>
        {children}
      </PerfectScrollbar>
    )
  }
}

const formatDate = (dateString, timezone = 'UTC') => {
  if (!dateString) return 'N/A'
  try {
    // Если строка в формате 'YYYY-MM-DD HH:mm:ss' без timezone, добавляем 'Z' (UTC)
    let dateStr = dateString
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
      dateStr = dateStr.replace(' ', 'T') + 'Z'
    }
    
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return 'N/A'
    }
    
    // Используем Intl.DateTimeFormat для конвертации UTC времени в указанный timezone
    const formatter = new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: timezone
    })
    return formatter.format(date)
  } catch (error) {
    console.error('Error formatting date:', error, 'dateString:', dateString, 'timezone:', timezone)
    // Fallback без timezone
    const date = new Date(dateString)
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }
}

const formatWorkStartDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const UserProfileRight = props => {
  // Props
  const { open, handleClose, activeUser, isBelowLgScreen, isBelowSmScreen, user } = props

  // Determine roles
  const isCurrentUserAdmin = user?.roles?.some(r => r.name === 'admin')
  const isCurrentUserModerator = user?.roles?.some(r => r.name === 'moderator')
  
  // For activeUser, check roles if available, otherwise infer from administrator_id
  // Moderators have administrator_id set, admins don't
  const isActiveUserAdmin = activeUser?.roles?.some(r => r.name === 'admin') || 
                            (!activeUser?.roles && activeUser && !activeUser.administrator_id)
  const isActiveUserModerator = activeUser?.roles?.some(r => r.name === 'moderator') || 
                                (!activeUser?.roles && activeUser && activeUser.administrator_id)

  // Determine what to show
  const showAdminViewingModerator = isCurrentUserAdmin && isActiveUserModerator
  const showModeratorViewingAdmin = isCurrentUserModerator && isActiveUserAdmin

  return activeUser ? (
    <Drawer
      open={open}
      anchor='right'
      variant='persistent'
      ModalProps={{ keepMounted: true }}
      sx={{
        zIndex: 12,
        '& .MuiDrawer-paper': { width: isBelowSmScreen ? '100%' : '370px', position: 'absolute', border: 0 }
      }}
    >
      <IconButton size='small' className='absolute block-start-4 inline-end-4' onClick={handleClose}>
        <i className='ri-close-line text-2xl' />
      </IconButton>
      <div className='flex flex-col justify-center items-center gap-4 mbs-6 pli-5 pbs-5 pbe-1'>
        <AvatarWithBadge
          alt={activeUser.name || activeUser.fullName || activeUser.email}
          src={activeUser.avatar}
          color={activeUser.avatarColor || 'primary'}
          badgeColor={activeUser.is_online ? statusObj.online : statusObj.offline}
          className='bs-[84px] is-[84px] text-3xl'
          badgeSize={12}
        />
        <div className='text-center'>
          <Typography variant='h5'>{activeUser.name || activeUser.fullName || activeUser.email}</Typography>
          <Typography variant='body2' color='text.secondary'>{activeUser.email}</Typography>
        </div>
      </div>

      <ScrollWrapper isBelowLgScreen={isBelowLgScreen} className='flex flex-col gap-6 p-5'>
        <div className='flex flex-col gap-1'>
          <Typography className='uppercase' color='text.disabled'>
            Personal Information
          </Typography>
          <List>
            <ListItem className='p-2 gap-2'>
              <ListItemIcon>
                <i className='ri-mail-line' />
              </ListItemIcon>
              <ListItemText primary={activeUser.email || 'No email'} />
            </ListItem>
            
            {/* For admin viewing moderator: show Timezone, Work Start Date, Platform, Last Activity */}
            {showAdminViewingModerator && (
              <>
                <ListItem className='p-2 gap-2'>
                  <ListItemIcon>
                    <i className='ri-global-line' />
                  </ListItemIcon>
                  <ListItemText 
                    primary={activeUser.timezone || 'N/A'}
                    secondary='Timezone'
                  />
                </ListItem>
                <ListItem className='p-2 gap-2'>
                  <ListItemIcon>
                    <i className='ri-calendar-line' />
                  </ListItemIcon>
                  <ListItemText 
                    primary={formatWorkStartDate(activeUser.work_start_date)}
                    secondary='Work Start Date'
                  />
                </ListItem>
                <ListItem className='p-2 gap-2'>
                  <ListItemIcon>
                    <i className='ri-computer-line' />
                  </ListItemIcon>
                  <ListItemText 
                    primary={activeUser.platform || 'N/A'}
                    secondary='Platform'
                  />
                </ListItem>
                <ListItem className='p-2 gap-2'>
                  <ListItemIcon>
                    <i className='ri-time-line' />
                  </ListItemIcon>
                  <ListItemText 
                    primary={formatDate(activeUser.last_seen_at, activeUser.timezone)}
                    secondary='Last Activity'
                  />
                </ListItem>
              </>
            )}
            
            {/* For moderator viewing admin: show Timezone */}
            {showModeratorViewingAdmin && (
              <ListItem className='p-2 gap-2'>
                <ListItemIcon>
                  <i className='ri-global-line' />
                </ListItemIcon>
                <ListItemText 
                  primary={activeUser.timezone || 'N/A'}
                  secondary='Timezone'
                />
              </ListItem>
            )}
          </List>
        </div>

        {/* Work Schedule - показываем для админа и модератора, если это их собственный профиль или админ смотрит модератора */}
        {(activeUser?.id === user?.id || showAdminViewingModerator) && (
          <div className='flex flex-col gap-1'>
            <WorkScheduleEditor
              userId={activeUser?.id}
              userRole={isActiveUserAdmin ? 'admin' : 'moderator'}
              workSchedule={
                isActiveUserAdmin 
                  ? activeUser?.adminProfile?.work_schedule 
                  : activeUser?.moderatorProfile?.work_schedule
              }
              onUpdate={(updatedSchedule) => {
                // Обновляем локальное состояние activeUser
                if (isActiveUserAdmin) {
                  if (!activeUser.adminProfile) {
                    activeUser.adminProfile = {}
                  }
                  activeUser.adminProfile.work_schedule = updatedSchedule
                } else {
                  if (!activeUser.moderatorProfile) {
                    activeUser.moderatorProfile = {}
                  }
                  activeUser.moderatorProfile.work_schedule = updatedSchedule
                }
              }}
            />
          </div>
        )}
      </ScrollWrapper>
    </Drawer>
  ) : null
}

export default UserProfileRight
