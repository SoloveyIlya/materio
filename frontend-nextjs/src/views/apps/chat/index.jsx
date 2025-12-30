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
  const [activeTab, setActiveTab] = useState(0) // Для админов: индекс выбранной вкладки с админом, для модераторов: 0 = Messages
  const [selectedAdminTab, setSelectedAdminTab] = useState(null) // Для админов: ID выбранного админа во вкладке
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
  }, [user])

  // For admins: when tab changes, update selectedAdminTab
  useEffect(() => {
    if (user?.roles?.some(r => r.name === 'admin') && messagesData?.tabs && messagesData.tabs.length > 0) {
      if (activeTab >= 0 && activeTab < messagesData.tabs.length) {
        setSelectedAdminTab(messagesData.tabs[activeTab].admin.id)
      }
    }
  }, [activeTab, messagesData, user])

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
      
      // For admin - ищем чат только в текущей вкладке
      if (user?.roles?.some(r => r.name === 'admin') && messagesData?.tabs && activeTab >= 0 && activeTab < messagesData.tabs.length) {
        const currentTab = messagesData.tabs[activeTab]
        const chat = currentTab.chats.find(c => c.user.id === selectedUserId)
        if (chat) {
          setSelectedChat(chat)
        }
      } else if (messagesData && Array.isArray(messagesData) && selectedChat.user) {
        // For moderator
        const updatedChat = messagesData.find(c => c.user.id === selectedUserId)
        if (updatedChat) {
          setSelectedChat(updatedChat)
        }
      }
    }
  }, [messagesData, activeTab])

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
              // Find moderator in current tab only
              if (messagesData.tabs && activeTab >= 0 && activeTab < messagesData.tabs.length) {
                const currentTab = messagesData.tabs[activeTab]
                const chat = currentTab.chats.find(c => c.user.id === parseInt(moderatorId))
                if (chat) {
                  setSelectedChat(chat)
                }
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
      // Для админов всегда используем type='message', для модераторов тоже
      const type = 'message'
      const response = await api.get(`/messages?type=${type}`)
      setMessagesData(response.data)
      
      // Для админов: устанавливаем вкладку текущего админа по умолчанию
      if (user?.roles?.some(r => r.name === 'admin') && response.data?.tabs && response.data.tabs.length > 0) {
        // Находим индекс вкладки с текущим админом
        const currentAdminTabIndex = response.data.tabs.findIndex(tab => tab.admin.id === user.id)
        if (currentAdminTabIndex >= 0) {
          setActiveTab(currentAdminTabIndex)
          setSelectedAdminTab(response.data.tabs[currentAdminTabIndex].admin.id)
        } else if (activeTab === 0 && !selectedAdminTab) {
          // Если текущий админ не найден, используем первую вкладку
          setSelectedAdminTab(response.data.tabs[0].admin.id)
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  const handleSendMessage = async (messageText, attachments = [], voiceFile = null) => {
    if (!messageText.trim() && attachments.length === 0 && !voiceFile) return
    if (!selectedChat || !selectedChat.user) return

    try {
      const urlParams = new URLSearchParams(window.location.search)
      const taskId = urlParams.get('task_id')

      // Для админов: определяем from_user_id на основе выбранной вкладки
      let fromUserId = null
      if (user?.roles?.some(r => r.name === 'admin') && selectedAdminTab && selectedAdminTab !== user.id) {
        fromUserId = selectedAdminTab
      }

      const messageData = {
        to_user_id: selectedChat.user.id,
        type: 'message',
        body: messageText || null,
        attachments: attachments.map(f => f.name || f),
        task_id: taskId || null,
      }

      if (fromUserId) {
        messageData.from_user_id = fromUserId
      }

      // If there are files or voice, use FormData
      if (attachments.some(f => f instanceof File) || voiceFile) {
        const formData = new FormData()
        formData.append('to_user_id', selectedChat.user.id.toString())
        formData.append('type', 'message')
        if (messageText) {
          formData.append('body', messageText)
        }
        
        if (fromUserId) {
          formData.append('from_user_id', fromUserId.toString())
        }
        
        if (taskId) {
          formData.append('task_id', taskId)
        }
        
        if (voiceFile) {
          formData.append('voice', voiceFile)
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
      {/* Tabs: для админов - вкладки с админами, для модераторов - только Messages */}
      {user?.roles?.some(r => r.name === 'admin') && messagesData?.tabs ? (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3, pt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => {
                setActiveTab(newValue)
                if (messagesData.tabs[newValue]) {
                  setSelectedAdminTab(messagesData.tabs[newValue].admin.id)
                  setSelectedChat(null) // Сбрасываем выбранный чат при смене вкладки
                }
              }}
              variant="scrollable"
              scrollButtons="auto"
            >
              {messagesData.tabs.map((tab, index) => (
                <Tab 
                  key={tab.admin.id} 
                  label={tab.admin.name} 
                  value={index}
                />
              ))}
            </Tabs>
            <Chip 
              label="🟢 Real-time" 
              size="small" 
              color="success" 
              sx={{ fontSize: '0.75rem' }}
            />
          </Box>
        </Box>
      ) : (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3, pt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Tabs value={0}>
              <Tab label="Messages" />
            </Tabs>
            <Chip 
              label="🟢 Real-time" 
              size="small" 
              color="success" 
              sx={{ fontSize: '0.75rem' }}
            />
          </Box>
        </Box>
      )}

      <div className="flex flex-1 overflow-hidden">
        <SidebarLeft
          messagesData={messagesData}
          user={user}
          selectedChat={selectedChat}
          selectedAdminTab={selectedAdminTab}
          activeTab={activeTab}
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
          selectedAdminTab={selectedAdminTab}
          messagesData={messagesData}
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
