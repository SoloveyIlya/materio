'use client'

// React Imports
import { useEffect, useRef, useState } from 'react'

// MUI Imports
import Backdrop from '@mui/material/Backdrop'
import useMediaQuery from '@mui/material/useMediaQuery'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'

// Third-party Imports
import classNames from 'classnames'

// Component Imports
import SidebarLeft from './SidebarLeft'
import ChatContent from './ChatContent'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'

// Util Imports
import { commonLayoutClasses } from '@layouts/utils/layoutClasses'
import api from '@/lib/api'

const ChatWrapper = () => {
  // States
  const [backdropOpen, setBackdropOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(0) // 0 = Messages, 1 = Support
  const [messagesData, setMessagesData] = useState(null)
  const [selectedChat, setSelectedChat] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Refs
  const messageInputRef = useRef(null)

  // Hooks
  const { settings } = useSettings()
  const isBelowLgScreen = useMediaQuery(theme => theme.breakpoints.down('lg'))
  const isBelowMdScreen = useMediaQuery(theme => theme.breakpoints.down('md'))
  const isBelowSmScreen = useMediaQuery(theme => theme.breakpoints.down('sm'))

  // Load user
  useEffect(() => {
    loadUser()
  }, [])

  // Load messages when user or tab changes
  useEffect(() => {
    if (user) {
      loadMessages()
    }
  }, [activeTab, user])

  // Auto-refresh messages every 3 seconds
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadMessages(true) // silent = true
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [user, activeTab])

  // Update selectedChat when messagesData changes
  useEffect(() => {
    if (selectedChat && selectedChat.user && messagesData) {
      const selectedUserId = selectedChat.user.id
      
      // For admin
      if (user?.roles?.some(r => r.name === 'admin') && messagesData?.tabs) {
        for (const tab of messagesData.tabs) {
          const chat = tab.chats.find(c => c.user.id === selectedUserId)
          if (chat) {
            setSelectedChat(chat)
            return
          }
        }
        const unassignedChat = messagesData.unassigned?.chats?.find(c => c.user.id === selectedUserId)
        if (unassignedChat) {
          setSelectedChat(unassignedChat)
        }
      } else if (messagesData && Array.isArray(messagesData) && selectedChat.user) {
        // For moderator
        const updatedChat = messagesData.find(c => c.user.id === selectedUserId)
        if (updatedChat) {
          setSelectedChat(updatedChat)
        }
      }
    }
  }, [messagesData])

  // Check URL parameters for task_id
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const taskId = urlParams.get('task_id')
      const moderatorId = urlParams.get('moderator_id')
      
      if (taskId || moderatorId) {
        // Auto-select chat based on URL params
        setTimeout(() => {
          if (messagesData) {
            if (moderatorId && user?.roles?.some(r => r.name === 'admin')) {
              // Find moderator in tabs or unassigned
              if (messagesData.tabs) {
                for (const tab of messagesData.tabs) {
                  const chat = tab.chats.find(c => c.user.id === parseInt(moderatorId))
                  if (chat) {
                    setSelectedChat(chat)
                    return
                  }
                }
              }
              const unassignedChat = messagesData.unassigned?.chats?.find(c => c.user.id === parseInt(moderatorId))
              if (unassignedChat) {
                setSelectedChat(unassignedChat)
              }
            }
          }
        }, 1000)
      }
    }
  }, [messagesData, user])

  const loadUser = async () => {
    try {
      const response = await api.get('/auth/user')
      setUser(response.data)
    } catch (error) {
      console.error('Error loading user:', error)
    }
  }

  const loadMessages = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true)
      }
      const type = activeTab === 0 ? 'message' : 'support'
      const response = await api.get(`/messages?type=${type}`)
      setMessagesData(response.data)
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  const handleSendMessage = async (messageText, attachments = []) => {
    if (!messageText.trim() && attachments.length === 0) return
    if (!selectedChat || !selectedChat.user) return

    try {
      const urlParams = new URLSearchParams(window.location.search)
      const taskId = urlParams.get('task_id')

      const messageData = {
        to_user_id: selectedChat.user.id,
        type: activeTab === 0 ? 'message' : 'support',
        body: messageText,
        attachments: attachments.map(f => f.name || f),
        task_id: taskId || null,
      }

      // If there are files, use FormData
      if (attachments.some(f => f instanceof File)) {
        const formData = new FormData()
        formData.append('to_user_id', selectedChat.user.id.toString())
        formData.append('type', activeTab === 0 ? 'message' : 'support')
        if (messageText) {
          formData.append('body', messageText)
        }
        
        if (taskId) {
          formData.append('task_id', taskId)
        }
        
        attachments.forEach((file, index) => {
          if (file instanceof File) {
            formData.append(`attachments[${index}]`, file)
          }
        })

        // Axios автоматически установит Content-Type для FormData
        await api.post('/messages', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      } else {
        await api.post('/messages', messageData)
      }

      await loadMessages()
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }

  const handleEditMessage = async (message, newText) => {
    try {
      await api.put(`/messages/${message.id}`, {
        body: newText,
      })
      await loadMessages()
    } catch (error) {
      console.error('Error editing message:', error)
      throw error
    }
  }

  const handleDeleteMessage = async (message) => {
    try {
      await api.delete(`/messages/${message.id}`)
      await loadMessages()
    } catch (error) {
      console.error('Error deleting message:', error)
      throw error
    }
  }

  const handleSelectChat = (chat) => {
    setSelectedChat(chat)
    if (isBelowMdScreen) {
      setSidebarOpen(false)
      setBackdropOpen(false)
    }
  }

  return (
    <div
      className={classNames(commonLayoutClasses.contentHeightFixed, 'flex flex-col is-full overflow-hidden rounded relative', {
        border: settings.skin === 'bordered',
        'shadow-md': settings.skin !== 'bordered'
      })}
    >
      {/* Tabs for Messages/Support */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3, pt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Messages" />
            <Tab label="Support" />
          </Tabs>
          <Chip 
            label="🟢 Real-time" 
            size="small" 
            color="success" 
            sx={{ fontSize: '0.75rem' }}
          />
        </Box>
      </Box>

      <div className="flex flex-1 overflow-hidden">
        <SidebarLeft
          messagesData={messagesData}
          user={user}
          selectedChat={selectedChat}
          onSelectChat={handleSelectChat}
          loading={loading}
          backdropOpen={backdropOpen}
          setBackdropOpen={setBackdropOpen}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isBelowLgScreen={isBelowLgScreen}
          isBelowMdScreen={isBelowMdScreen}
          isBelowSmScreen={isBelowSmScreen}
          messageInputRef={messageInputRef}
        />

        <ChatContent
          selectedChat={selectedChat}
          user={user}
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          backdropOpen={backdropOpen}
          setBackdropOpen={setBackdropOpen}
          setSidebarOpen={setSidebarOpen}
          isBelowMdScreen={isBelowMdScreen}
          isBelowLgScreen={isBelowLgScreen}
          isBelowSmScreen={isBelowSmScreen}
          messageInputRef={messageInputRef}
        />
      </div>

      <Backdrop open={backdropOpen} onClick={() => setBackdropOpen(false)} className='absolute z-10' />
    </div>
  )
}

export default ChatWrapper
