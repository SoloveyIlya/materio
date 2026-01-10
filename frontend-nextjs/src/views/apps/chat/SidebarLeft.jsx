// React Imports
import { useState } from 'react'

// MUI Imports
import Avatar from '@mui/material/Avatar'
import TextField from '@mui/material/TextField'
import Drawer from '@mui/material/Drawer'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Autocomplete from '@mui/material/Autocomplete'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemText from '@mui/material/ListItemText'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

// Third-party Imports
import classnames from 'classnames'
import PerfectScrollbar from 'react-perfect-scrollbar'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'
import UserProfileLeft from './UserProfileLeft'
import AvatarWithBadge from './AvatarWithBadge'

// Util Imports
import { getInitials } from '@/utils/getInitials'

export const statusObj = {
  busy: 'error',
  away: 'warning',
  online: 'success',
  offline: 'secondary'
}

// Scroll wrapper for chat list
const ScrollWrapper = ({ children, isBelowLgScreen }) => {
  if (isBelowLgScreen) {
    return <div className='bs-full overflow-y-auto overflow-x-hidden'>{children}</div>
  } else {
    return <PerfectScrollbar options={{ wheelPropagation: false }}>{children}</PerfectScrollbar>
  }
}

const SidebarLeft = props => {
  // Props
  const {
    messagesData,
    user,
    selectedChat,
    selectedAdminTab,
    activeTab,
    onSelectChat,
    loading,
    backdropOpen,
    setBackdropOpen,
    sidebarOpen,
    setSidebarOpen,
    isBelowLgScreen,
    isBelowMdScreen,
    isBelowSmScreen,
    messageInputRef
  } = props

  // States
  const [userSidebar, setUserSidebar] = useState(false)
  const [searchValue, setSearchValue] = useState('')

  // For admin: render chats for selected admin tab
  const renderAdminChats = () => {
    if (!messagesData?.tabs) return null

    // Показываем чаты только для выбранной вкладки админа
    const currentTab = messagesData.tabs[activeTab]
    if (!currentTab) return null

    // Сортируем чаты: сначала с непрочитанными сообщениями, затем по времени последнего сообщения
    const sortedChats = [...currentTab.chats].sort((a, b) => {
      // Сначала сортируем по наличию непрочитанных сообщений
      if (a.unread_count > 0 && b.unread_count === 0) return -1
      if (a.unread_count === 0 && b.unread_count > 0) return 1
      
      // Если оба имеют или не имеют непрочитанные, сортируем по времени последнего сообщения
      const aLastMessage = a.messages && a.messages.length > 0 
        ? new Date(a.messages[a.messages.length - 1].created_at || a.messages[a.messages.length - 1].created_at_formatted)
        : new Date(0)
      const bLastMessage = b.messages && b.messages.length > 0
        ? new Date(b.messages[b.messages.length - 1].created_at || b.messages[b.messages.length - 1].created_at_formatted)
        : new Date(0)
      
      return bLastMessage - aLastMessage // Новые сообщения вверху
    })

    return (
      <List>
        {sortedChats.map((chat) => {
              const isChatActive = selectedChat?.user?.id === chat.user.id
              const contact = chat.user

              return (
                <ListItem
                  key={chat.user.id}
                  button
                  selected={isChatActive}
                  onClick={() => onSelectChat(chat)}
                  sx={{
                    bgcolor: isChatActive ? 'primary.light' : 'transparent',
                    color: isChatActive ? 'primary.contrastText' : 'inherit',
                    '&:hover': {
                      bgcolor: isChatActive ? 'primary.light' : 'action.hover'
                    }
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      badgeContent={chat.unread_count > 0 ? chat.unread_count : 0}
                      color="error"
                      invisible={chat.unread_count === 0}
                    >
                      {contact.avatar ? (
                        <Avatar src={contact.avatar} alt={contact.name} />
                      ) : (
                        <CustomAvatar color={contact.avatarColor || 'primary'} skin='light'>
                          {getInitials(contact.name || contact.email)}
                        </CustomAvatar>
                      )}
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={contact.name || contact.email}
                    secondary={
                      chat.messages && chat.messages.length > 0
                        ? chat.messages[chat.messages.length - 1].body?.substring(0, 30) + '...'
                        : 'No messages yet'
                    }
                  />
                </ListItem>
              )
            })}
      </List>
    )
  }

  // For moderator: render list of admins
  const renderModeratorChats = () => {
    if (!Array.isArray(messagesData)) return null

    return (
      <List>
        {messagesData.map((chat) => {
          const isChatActive = selectedChat?.user?.id === chat.user.id
          const contact = chat.user

          return (
            <ListItem
              key={chat.user.id}
              button
              selected={isChatActive}
              onClick={() => onSelectChat(chat)}
              sx={{
                bgcolor: isChatActive ? 'primary.light' : 'transparent',
                color: isChatActive ? 'primary.contrastText' : 'inherit',
                '&:hover': {
                  bgcolor: isChatActive ? 'primary.light' : 'action.hover'
                }
              }}
            >
              <ListItemAvatar>
                <Badge
                  variant="dot"
                  color={contact.is_online ? 'success' : 'default'}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                >
                  {contact.avatar ? (
                    <Avatar src={contact.avatar} alt={contact.name} />
                  ) : (
                    <CustomAvatar color={contact.avatarColor || 'primary'} skin='light'>
                      {getInitials(contact.name || contact.email)}
                    </CustomAvatar>
                  )}
                </Badge>
              </ListItemAvatar>
              <ListItemText
                primary={contact.name || contact.email}
                secondary={contact.is_online ? 'Online' : 'Offline'}
              />
            </ListItem>
          )
        })}
      </List>
    )
  }

  // Get all contacts for search
  const getAllContacts = () => {
    if (user?.roles?.some(r => r.name === 'admin') && messagesData?.tabs) {
      const contacts = []
      // Только для текущей вкладки
      const currentTab = messagesData.tabs[activeTab]
      if (currentTab) {
        currentTab.chats.forEach(chat => {
          contacts.push(chat.user)
        })
      }
      return contacts
    } else if (Array.isArray(messagesData)) {
      return messagesData.map(chat => chat.user)
    }
    return []
  }

  const handleSearchChange = (event, newValue) => {
    setSearchValue(newValue)
    if (newValue) {
      const contact = getAllContacts().find(c => 
        (c.name || c.email)?.toLowerCase().includes(newValue.toLowerCase())
      )
      if (contact) {
        // Find chat for this contact
        let foundChat = null
        if (user?.roles?.some(r => r.name === 'admin') && messagesData?.tabs) {
          foundChat = findChatInCurrentTab(contact.id)
        } else if (Array.isArray(messagesData)) {
          foundChat = messagesData.find(c => c.user.id === contact.id)
        }
        if (foundChat) {
          onSelectChat(foundChat)
          isBelowMdScreen && setSidebarOpen(false)
          setBackdropOpen(false)
          messageInputRef.current?.focus()
        }
      }
      setSearchValue('')
    }
  }

  // For admin: find chat in current tab
  const findChatInCurrentTab = (contactId) => {
    if (!messagesData?.tabs || activeTab < 0 || activeTab >= messagesData.tabs.length) return null
    const currentTab = messagesData.tabs[activeTab]
    return currentTab.chats.find(c => c.user.id === contactId)
  }

  return (
    <>
      <Drawer
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        className='bs-full'
        variant={!isBelowMdScreen ? 'permanent' : 'persistent'}
        ModalProps={{
          disablePortal: true,
          keepMounted: true
        }}
        sx={{
          zIndex: isBelowMdScreen && sidebarOpen ? 11 : 10,
          position: !isBelowMdScreen ? 'static' : 'absolute',
          ...(isBelowSmScreen && sidebarOpen && { width: '100%' }),
          '& .MuiDrawer-paper': {
            overflow: 'hidden',
            boxShadow: 'none',
            width: isBelowSmScreen ? '100%' : '370px',
            position: !isBelowMdScreen ? 'static' : 'absolute'
          }
        }}
      >
        <div className='flex plb-[18px] pli-5 gap-4 border-be'>
          {user && (
            <AvatarWithBadge
              alt={user.name || user.email}
              src={user.avatar}
              badgeColor={statusObj.online}
              onClick={() => {
                setUserSidebar(true)
              }}
            />
          )}
          <div className='flex is-full items-center flex-auto sm:gap-x-3'>
            <Autocomplete
              fullWidth
              size='small'
              id='select-contact'
              options={getAllContacts().map(contact => contact.name || contact.email) || []}
              value={searchValue || null}
              onChange={handleSearchChange}
              onInputChange={(e, newValue) => {
                if (!newValue) setSearchValue('')
              }}
              renderInput={params => (
                <TextField
                  {...params}
                  variant='outlined'
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '999px !important' } }}
                  placeholder='Search Contacts'
                  slotProps={{
                    input: {
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position='end'>
                          <i className='ri-search-line text-xl' />
                        </InputAdornment>
                      )
                    }
                  }}
                />
              )}
            />
            {isBelowMdScreen ? (
              <IconButton
                className='p-0 mis-2'
                onClick={() => {
                  setSidebarOpen(false)
                  setBackdropOpen(false)
                }}
              >
                <i className='ri-close-line' />
              </IconButton>
            ) : null}
          </div>
        </div>
        <ScrollWrapper isBelowLgScreen={isBelowLgScreen}>
          <div className='p-3 pbs-4'>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : user?.roles?.some(r => r.name === 'admin') ? (
              renderAdminChats()
            ) : (
              renderModeratorChats()
            )}
          </div>
        </ScrollWrapper>
      </Drawer>

      {user && (
        <UserProfileLeft
          userSidebar={userSidebar}
          setUserSidebar={setUserSidebar}
          profileUserData={user}
          isBelowLgScreen={isBelowLgScreen}
          isBelowSmScreen={isBelowSmScreen}
        />
      )}
    </>
  )
}

export default SidebarLeft
