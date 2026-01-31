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
import { useWebSocketContext } from '@/contexts/WebSocketContext'

// Util Imports
import { commonLayoutClasses } from '@layouts/utils/layoutClasses'
import api from '@/lib/api'
import { useMenuCounts } from '@/hooks/useMenuCounts'
import { playNotificationSoundIfVisible } from '@/utils/soundNotification'

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
  const previousMessagesDataRef = useRef(null)
  const markedAsReadRef = useRef(new Set()) // Track which chats we've already marked as read in this session
  const selectedChatRef = useRef(null)
  const activeTabRef = useRef(activeTab)
  const selectedAdminTabRef = useRef(selectedAdminTab)
  const userRef = useRef(user)

  // Hooks
  const { settings } = useSettings()
  const { optimisticallyUpdateChatCount, resetChatCount } = useMenuCounts()
  const { isUserOnline, onlineUsersVersion } = useWebSocketContext()
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

  // Sync refs with latest state to avoid stale closures in WS handlers
  useEffect(() => { selectedChatRef.current = selectedChat }, [selectedChat])
  useEffect(() => { activeTabRef.current = activeTab }, [activeTab])
  useEffect(() => { selectedAdminTabRef.current = selectedAdminTab }, [selectedAdminTab])
  useEffect(() => { userRef.current = user }, [user])

  // Update online status in messagesData when onlineUsers changes from WebSocket
  useEffect(() => {
    if (!messagesData) return

    setMessagesData(prev => {
      if (!prev) return prev

      // Admin tabs structure
      if (prev.tabs) {
        const updated = {
          ...prev,
          tabs: prev.tabs.map(tab => ({
            ...tab,
            chats: tab.chats.map(chat => {
              const oldIsOnline = Boolean(chat.user.is_online) // Нормализуем к boolean
              const newIsOnline = isUserOnline(chat.user.id)
              if (oldIsOnline !== newIsOnline) {
                console.log(`[Chat] 👤 Статус ${chat.user.name || chat.user.email} (${chat.user.id}): ${oldIsOnline} → ${newIsOnline}`)
              }
              return {
                ...chat,
                user: {
                  ...chat.user,
                  is_online: newIsOnline
                }
              }
            })
          }))
        }
        return updated
      }

      // Moderator list (array)
      if (Array.isArray(prev)) {
        return prev.map(chat => {
          const oldIsOnline = Boolean(chat.user.is_online) // Нормализуем к boolean
          const newIsOnline = isUserOnline(chat.user.id)
          if (oldIsOnline !== newIsOnline) {
            console.log(`[Chat] 👤 Статус ${chat.user.name || chat.user.email} (${chat.user.id}): ${oldIsOnline} → ${newIsOnline}`)
          }
          return {
            ...chat,
            user: {
              ...chat.user,
              is_online: newIsOnline
            }
          }
        })
      }

      return prev
    })

    // Update selectedChat if it exists
    if (selectedChat?.user) {
      const oldIsOnline = Boolean(selectedChat.user.is_online) // Нормализуем к boolean
      const newIsOnline = isUserOnline(selectedChat.user.id)
      if (oldIsOnline !== newIsOnline) {
        console.log(`[Chat] 👤 Выбранный чат - статус ${selectedChat.user.name || selectedChat.user.email} (${selectedChat.user.id}): ${oldIsOnline} → ${newIsOnline}`)
      }
      setSelectedChat(prev => ({
        ...prev,
        user: {
          ...prev.user,
          is_online: newIsOnline
        }
      }))
    }
  }, [onlineUsersVersion])

  // Helper: patch messagesData for incoming message by peerId
  const patchMessagesData = (prev, msg, peerId) => {
    if (!prev) return prev

    // Admin tabs structure
    if (prev.tabs) {
      return {
        ...prev,
        tabs: prev.tabs.map(tab => ({
          ...tab,
          chats: tab.chats.map(chat => {
            if (chat.user?.id !== peerId) return chat
            // avoid duplicate
            const exists = (chat.messages || []).some(m => m.id === msg.id)
            if (exists) return chat
            return { ...chat, messages: [...(chat.messages || []), msg], last_message: msg }
          })
        }))
      }
    }

    // Moderator list (array)
    if (Array.isArray(prev)) {
      return prev.map(chat => {
        if (chat.user?.id !== peerId) return chat
        const exists = (chat.messages || []).some(m => m.id === msg.id)
        if (exists) return chat
        return { ...chat, messages: [...(chat.messages || []), msg], last_message: msg }
      })
    }

    return prev
  }

  // --- Helpers: merge messages and keep newest messages without data loss ---
  // merge messages by id (stable, no data loss)
  const mergeMessagesById = (a = [], b = []) => {
    const map = new Map()

    for (const m of a) {
      if (m?.id != null) map.set(m.id, m)
    }
    for (const m of b) {
      if (m?.id != null) map.set(m.id, m)
    }

    // If some messages have temp ids without numeric ids, keep them too
    // by adding those that are missing from the map
    const pushIfMissing = (arr) => {
      for (const m of arr) {
        if (!m) continue
        if (m.id == null) continue
        if (!map.has(m.id)) map.set(m.id, m)
      }
    }
    pushIfMissing(a)
    pushIfMissing(b)

    const merged = Array.from(map.values())

    // sort by created_at (fallback to created_at_formatted)
    merged.sort((x, y) => {
      const dx = new Date(x.created_at || x.created_at_formatted || 0).getTime()
      const dy = new Date(y.created_at || y.created_at_formatted || 0).getTime()
      return dx - dy
    })

    return merged
  }

  const mergeChatKeepingNewestMessages = (prevSelectedChat, nextChatFromMessagesData) => {
    if (!prevSelectedChat) return nextChatFromMessagesData
    if (!nextChatFromMessagesData) return prevSelectedChat

    const prevMsgs = prevSelectedChat.messages || []
    const nextMsgs = nextChatFromMessagesData.messages || []

    const mergedMessages = mergeMessagesById(prevMsgs, nextMsgs)

    // keep nextChat object as base (fresh unread_count etc), but never lose messages
    return {
      ...nextChatFromMessagesData,
      messages: mergedMessages,
    }
  }

  // WebSocket обновляет чаты в реальном времени через subscribeToMessages
  // Загружаем сообщения только при монтировании компонента
  useEffect(() => {
    if (!user) return
    
    // Обновляем только при монтировании
    loadMessages(true)
    
    // Обновляем при возврате на вкладку (после длительного отсутствия)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadMessages(true)
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user])

  // Подписка на WebSocket события для обновления чатов при новых сообщениях
  useEffect(() => {
    if (!user?.domain_id) return

    // Подписываемся на события новых сообщений через Echo
    const { getSocket } = require('@/lib/websocket')
    const echo = getSocket()
    
    const channel = echo.private(`domain.${user.domain_id}`)
    
    channel.listen('.MessageSent', (data) => {
      console.log('[Chat] Получено новое сообщение через WS, обновляем чаты')
      // Обновляем список чатов при новом сообщении
      loadMessages(true)
    })

    return () => {
      channel.stopListening('.MessageSent')
    }
  }, [user?.domain_id])

  // Update selectedChat when messagesData changes and automatically mark messages as read if chat is open
  useEffect(() => {
    const sc = selectedChatRef.current
    if (!sc?.user || !messagesData || !user) return

    const selectedUserId = sc.user.id
    let updatedChat = null

    const isAdmin = user?.roles?.some(r => r.name === 'admin')
    const isModerator = user?.roles?.some(r => r.name === 'moderator')

    // --- 1) Find chat in messagesData ---
    if (isAdmin && messagesData?.tabs && Array.isArray(messagesData.tabs)) {
      // Prefer current tab
      const inCurrentTab =
        activeTab >= 0 &&
        activeTab < messagesData.tabs.length &&
        messagesData.tabs[activeTab]?.chats?.find(c => c.user?.id === selectedUserId)

      if (inCurrentTab) {
        updatedChat = inCurrentTab
      } else {
        // Fallback: search globally across tabs to avoid accidental nulling
        for (const tab of messagesData.tabs) {
          const found = tab?.chats?.find(c => c.user?.id === selectedUserId)
          if (found) {
            updatedChat = found
            break
          }
        }
      }

      if (!updatedChat) {
        // If truly absent everywhere, close chat
        setSelectedChat(null)
        return
      }

      // Merge safely (by message ids)
      setSelectedChat(prev => mergeChatKeepingNewestMessages(prev, updatedChat))
    }

    if (isModerator && Array.isArray(messagesData)) {
      updatedChat = messagesData.find(c => c.user?.id === selectedUserId)

      if (!updatedChat) {
        setSelectedChat(null)
        return
      }

      setSelectedChat(prev => mergeChatKeepingNewestMessages(prev, updatedChat))
    }

    // If role mismatch or no chat found, stop
    if (!updatedChat) return

    // --- 2) Auto mark as read (same logic, but avoid stale refs mix) ---
    if (updatedChat.unread_count > 0) {
      const adminIdForKey = selectedAdminTabRef.current || user.id
      const chatKey = `${updatedChat.user.id}-${adminIdForKey}`

      // Find previous chat snapshot to compare unread counts
      const prevData = previousMessagesDataRef.current
      let previousChat = null

      if (prevData) {
        if (isAdmin && prevData?.tabs && Array.isArray(prevData.tabs)) {
          // try current tab first, then global
          const prevInCurrent =
            activeTab >= 0 &&
            activeTab < prevData.tabs.length &&
            prevData.tabs[activeTab]?.chats?.find(c => c.user?.id === selectedUserId)

          previousChat = prevInCurrent || null

          if (!previousChat) {
            for (const tab of prevData.tabs) {
              const found = tab?.chats?.find(c => c.user?.id === selectedUserId)
              if (found) { previousChat = found; break }
            }
          }
        } else if (isModerator && Array.isArray(prevData)) {
          previousChat = prevData.find(c => c.user?.id === selectedUserId) || null
        }
      }

      const previousUnreadCount = previousChat?.unread_count || 0
      const currentUnreadCount = updatedChat.unread_count || 0

      if (
        currentUnreadCount > 0 &&
        (currentUnreadCount !== previousUnreadCount || !markedAsReadRef.current.has(chatKey))
      ) {
        const markChatAsRead = async () => {
          try {
            let fromUserId = updatedChat.user.id
            let toUserId = null

            if (isAdmin) {
              fromUserId = updatedChat.user.id
              toUserId = selectedAdminTabRef.current || user.id
            } else if (isModerator) {
              fromUserId = updatedChat.user.id
              toUserId = user.id
            }

            const requestData = {
              from_user_id: fromUserId,
              type: 'message'
            }

            // only for admin with specific tab target
            if (isAdmin && toUserId && toUserId !== user.id) {
              requestData.to_user_id = toUserId
            }

            await api.post('/messages/mark-chat-read', requestData)

            markedAsReadRef.current.add(chatKey)

            // Сбрасываем счетчик чата в меню
            resetChatCount()

            const unreadCount = updatedChat.unread_count || 0
            if (unreadCount > 0) {
              optimisticallyUpdateChatCount(-unreadCount)
            }

            // Обновляем список чатов локально, чтобы показать что сообщения прочитаны
            setMessagesData(prev => {
              if (!prev) return prev
              
              if (prev.tabs) {
                // Для админов
                return {
                  ...prev,
                  tabs: prev.tabs.map(tab => ({
                    ...tab,
                    chats: tab.chats.map(chat => 
                      chat.user.id === updatedChat.user.id 
                        ? { ...chat, unread_count: 0, messages: chat.messages?.map(m => ({ ...m, is_read: true })) }
                        : chat
                    )
                  }))
                }
              } else if (Array.isArray(prev)) {
                // Для модераторов
                return prev.map(chat =>
                  chat.user.id === updatedChat.user.id
                    ? { ...chat, unread_count: 0, messages: chat.messages?.map(m => ({ ...m, is_read: true })) }
                    : chat
                )
              }
              return prev
            })
          } catch (error) {
            console.error('Error auto-marking chat as read:', error)
          }
        }

        const timeoutId = setTimeout(markChatAsRead, 500)
        return () => clearTimeout(timeoutId)
      }
    } else {
      // Clear mark for this chatKey when unread is 0
      const adminIdForKey = selectedAdminTabRef.current || user.id
      const chatKey = `${updatedChat.user.id}-${adminIdForKey}`
      markedAsReadRef.current.delete(chatKey)
    }
  }, [messagesData, activeTab, user?.id])


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
      
      // Проверяем наличие новых сообщений перед обновлением состояния
      const previousData = previousMessagesDataRef.current
      const newData = response.data
      
      // Обнаруживаем новые непрочитанные сообщения
      if (previousData && newData && user) {
        detectNewMessages(previousData, newData, user)
      }
      
      // Обновляем данные сообщений
      setMessagesData(newData)
      previousMessagesDataRef.current = JSON.parse(JSON.stringify(newData)) // Глубокая копия для сравнения
      
      // Для админов: устанавливаем вкладку текущего админа по умолчанию ТОЛЬКО при первой загрузке
      // Не меняем вкладку при автоматических обновлениях (silent = true), чтобы не сбрасывать выбранный чат
      if (!silent && user?.roles?.some(r => r.name === 'admin') && response.data?.tabs && response.data.tabs.length > 0) {
        // Находим индекс вкладки с текущим админом
        const currentAdminTabIndex = response.data.tabs.findIndex(tab => tab.admin.id === user.id)
        if (currentAdminTabIndex >= 0 && activeTab === 0 && !selectedAdminTab) {
          // Устанавливаем вкладку текущего админа только если вкладка еще не была выбрана пользователем
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

  // Функция для обнаружения новых сообщений и воспроизведения звука
  const detectNewMessages = (previousData, newData, currentUser) => {
    let hasNewUnreadMessages = false

    // Для админов
    if (currentUser?.roles?.some(r => r.name === 'admin')) {
      if (newData?.tabs && Array.isArray(newData.tabs)) {
        for (const tab of newData.tabs) {
          // Находим соответствующий таб в предыдущих данных
          const previousTab = previousData?.tabs?.find(t => t.admin.id === tab.admin.id)
          
          if (previousTab) {
            for (const chat of tab.chats) {
              const previousChat = previousTab.chats.find(c => c.user.id === chat.user.id)
              
              if (previousChat) {
                // Сравниваем количество сообщений
                const previousMessageIds = new Set(previousChat.messages.map(m => m.id))
                const newMessages = chat.messages.filter(m => !previousMessageIds.has(m.id))
                
                // Проверяем, есть ли новые непрочитанные сообщения (не от текущего админа)
                const newUnreadMessages = newMessages.filter(msg => {
                  const isFromCurrentUser = msg.from_user_id === currentUser.id || 
                                           (selectedAdminTab && msg.from_user_id === selectedAdminTab)
                  return !isFromCurrentUser && (msg.is_read === false || msg.is_read === 0 || msg.is_read === null)
                })
                
                if (newUnreadMessages.length > 0) {
                  hasNewUnreadMessages = true
                }
              } else {
                // Новый чат с непрочитанными сообщениями
                const unreadMessages = chat.messages.filter(msg => {
                  const isFromCurrentUser = msg.from_user_id === currentUser.id || 
                                           (selectedAdminTab && msg.from_user_id === selectedAdminTab)
                  return !isFromCurrentUser && (msg.is_read === false || msg.is_read === 0 || msg.is_read === null)
                })
                
                if (unreadMessages.length > 0) {
                  hasNewUnreadMessages = true
                }
              }
            }
          } else {
            // Новый таб - проверяем все чаты
            for (const chat of tab.chats) {
              const unreadMessages = chat.messages.filter(msg => {
                const isFromCurrentUser = msg.from_user_id === currentUser.id || 
                                         (selectedAdminTab && msg.from_user_id === selectedAdminTab)
                return !isFromCurrentUser && (msg.is_read === false || msg.is_read === 0 || msg.is_read === null)
              })
              
              if (unreadMessages.length > 0) {
                hasNewUnreadMessages = true
              }
            }
          }
        }
      }
      
      // Проверяем незакрепленных модераторов
      if (newData?.unassigned?.chats) {
        const previousUnassigned = previousData?.unassigned?.chats || []
        for (const chat of newData.unassigned.chats) {
          const previousChat = previousUnassigned.find(c => c.user.id === chat.user.id)
          
          if (previousChat) {
            const previousMessageIds = new Set(previousChat.messages.map(m => m.id))
            const newMessages = chat.messages.filter(m => !previousMessageIds.has(m.id))
            
            const newUnreadMessages = newMessages.filter(msg => {
              const isFromCurrentUser = msg.from_user_id === currentUser.id || 
                                       (selectedAdminTab && msg.from_user_id === selectedAdminTab)
              return !isFromCurrentUser && (msg.is_read === false || msg.is_read === 0 || msg.is_read === null)
            })
            
            if (newUnreadMessages.length > 0) {
              hasNewUnreadMessages = true
            }
          } else {
            const unreadMessages = chat.messages.filter(msg => {
              const isFromCurrentUser = msg.from_user_id === currentUser.id || 
                                       (selectedAdminTab && msg.from_user_id === selectedAdminTab)
              return !isFromCurrentUser && (msg.is_read === false || msg.is_read === 0 || msg.is_read === null)
            })
            
            if (unreadMessages.length > 0) {
              hasNewUnreadMessages = true
            }
          }
        }
      }
    } 
    // Для модераторов
    else if (currentUser?.roles?.some(r => r.name === 'moderator')) {
      if (Array.isArray(newData) && Array.isArray(previousData)) {
        for (const chat of newData) {
          const previousChat = previousData.find(c => c.user?.id === chat.user?.id)
          
          if (previousChat) {
            const previousMessageIds = new Set(previousChat.messages.map(m => m.id))
            const newMessages = chat.messages.filter(m => !previousMessageIds.has(m.id))
            
            // Для модератора новые сообщения - это сообщения от админа (не от модератора)
            const newUnreadMessages = newMessages.filter(msg => {
              return msg.from_user_id !== currentUser.id && 
                     (msg.is_read === false || msg.is_read === 0 || msg.is_read === null)
            })
            
            if (newUnreadMessages.length > 0) {
              hasNewUnreadMessages = true
            }
          } else {
            // Новый чат
            const unreadMessages = chat.messages.filter(msg => {
              return msg.from_user_id !== currentUser.id && 
                     (msg.is_read === false || msg.is_read === 0 || msg.is_read === null)
            })
            
            if (unreadMessages.length > 0) {
              hasNewUnreadMessages = true
            }
          }
        }
      }
    }

    // Воспроизводим звук, если есть новые непрочитанные сообщения
    // Звук воспроизводится всегда при новых сообщениях, независимо от того, открыт чат или нет
    if (hasNewUnreadMessages) {
      playNotificationSoundIfVisible()
    }
  }

  const handleSendMessage = async (messageText, attachments = [], voiceFile = null, videoFile = null) => {
    if (!messageText.trim() && attachments.length === 0 && !voiceFile && !videoFile) return
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

      // Создаем временное сообщение для оптимистичного обновления
      const tempMessageId = `temp-${Date.now()}`
      const tempMessage = {
        id: tempMessageId,
        from_user_id: fromUserId || user.id,
        to_user_id: selectedChat.user.id,
        body: messageText || null,
        attachments: attachments.map((file, idx) => {
          if (file instanceof File) {
            return {
              url: URL.createObjectURL(file),
              name: file.name,
              type: file.type.startsWith('image/') ? 'image' : 'file'
            }
          }
          return file
        }),
        task_id: taskId || null,
        is_read: false,
        created_at: new Date().toISOString(),
        created_at_formatted: new Date().toISOString(),
        is_edited: false,
        is_deleted: false
      }

      // Добавляем голосовое сообщение, если есть
      if (voiceFile) {
        tempMessage.attachments = tempMessage.attachments || []
        tempMessage.attachments.push({
          url: URL.createObjectURL(voiceFile),
          name: voiceFile.name,
          type: 'voice'
        })
      }

      // Добавляем видео, если есть
      if (videoFile) {
        tempMessage.attachments = tempMessage.attachments || []
        tempMessage.attachments.push({
          url: URL.createObjectURL(videoFile),
          name: videoFile.name,
          type: 'video'
        })
      }

      // Оптимистично добавляем сообщение в текущий чат
      if (selectedChat) {
        const updatedChat = {
          ...selectedChat,
          messages: [...(selectedChat.messages || []), tempMessage]
        }
        setSelectedChat(updatedChat)

        // Обновляем messagesData для текущего чата
        setMessagesData(prevData => {
          if (user?.roles?.some(r => r.name === 'admin') && prevData?.tabs) {
            const updatedTabs = prevData.tabs.map((tab, tabIndex) => {
              if (tabIndex === activeTab) {
                const updatedChats = tab.chats.map(chat => {
                  if (chat.user.id === selectedChat.user.id) {
                    return {
                      ...chat,
                      messages: [...(chat.messages || []), tempMessage]
                    }
                  }
                  return chat
                })
                return { ...tab, chats: updatedChats }
              }
              return tab
            })
            return { ...prevData, tabs: updatedTabs }
          } else if (Array.isArray(prevData)) {
            return prevData.map(chat => {
              if (chat.user.id === selectedChat.user.id) {
                return {
                  ...chat,
                  messages: [...(chat.messages || []), tempMessage]
                }
              }
              return chat
            })
          }
          return prevData
        })
      }

      // If there are files, voice, or video, use FormData
      if (attachments.some(f => f instanceof File) || voiceFile || videoFile) {
        const formData = new FormData()
        formData.append('to_user_id', selectedChat.user.id.toString())
        formData.append('type', 'message')
        // Всегда отправляем body, даже если пустой (для совместимости с бэкендом)
        formData.append('body', messageText || '')
        
        if (fromUserId) {
          formData.append('from_user_id', fromUserId.toString())
        }
        
        if (taskId) {
          formData.append('task_id', taskId)
        }
        
        if (voiceFile) {
          formData.append('voice', voiceFile)
        }

        if (videoFile) {
          // Отправляем видео как attachment с типом video
          formData.append(`attachments[0]`, videoFile)
        }
        
        attachments.forEach((file, index) => {
          if (file instanceof File) {
            const attachmentIndex = videoFile ? index + 1 : index
            formData.append(`attachments[${attachmentIndex}]`, file)
          }
        })

        // Axios автоматически установит Content-Type для FormData
        const response = await api.post('/messages', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })

        // Заменяем временное сообщение на реальное из ответа сервера
        if (response.data && selectedChat) {
          const realMessage = response.data
          setSelectedChat(prevChat => {
            if (!prevChat) return prevChat
            const updatedMessages = prevChat.messages.map(msg => 
              msg.id === tempMessageId ? realMessage : msg
            )
            return { ...prevChat, messages: updatedMessages }
          })

          setMessagesData(prevData => {
            if (user?.roles?.some(r => r.name === 'admin') && prevData?.tabs) {
              const updatedTabs = prevData.tabs.map((tab, tabIndex) => {
                if (tabIndex === activeTab) {
                  const updatedChats = tab.chats.map(chat => {
                    if (chat.user.id === selectedChat.user.id) {
                      const updatedMessages = chat.messages.map(msg => 
                        msg.id === tempMessageId ? realMessage : msg
                      )
                      return { ...chat, messages: updatedMessages }
                    }
                    return chat
                  })
                  return { ...tab, chats: updatedChats }
                }
                return tab
              })
              return { ...prevData, tabs: updatedTabs }
            } else if (Array.isArray(prevData)) {
              return prevData.map(chat => {
                if (chat.user.id === selectedChat.user.id) {
                  const updatedMessages = chat.messages.map(msg => 
                    msg.id === tempMessageId ? realMessage : msg
                  )
                  return { ...chat, messages: updatedMessages }
                }
                return chat
              })
            }
            return prevData
          })
        }
      } else {
        const response = await api.post('/messages', messageData)
        
        // Заменяем временное сообщение на реальное из ответа сервера
        if (response.data && selectedChat) {
          const realMessage = response.data
          // Добавляем анимацию для нового сообщения
          setSelectedChat(prevChat => {
            if (!prevChat) return prevChat
            const updatedMessages = prevChat.messages.map(msg => 
              msg.id === tempMessageId ? realMessage : msg
            )
            return { ...prevChat, messages: updatedMessages }
          })

          setMessagesData(prevData => {
            if (user?.roles?.some(r => r.name === 'admin') && prevData?.tabs) {
              const updatedTabs = prevData.tabs.map((tab, tabIndex) => {
                if (tabIndex === activeTab) {
                  const updatedChats = tab.chats.map(chat => {
                    if (chat.user.id === selectedChat.user.id) {
                      const updatedMessages = chat.messages.map(msg => 
                        msg.id === tempMessageId ? realMessage : msg
                      )
                      return { ...chat, messages: updatedMessages }
                    }
                    return chat
                  })
                  return { ...tab, chats: updatedChats }
                }
                return tab
              })
              return { ...prevData, tabs: updatedTabs }
            } else if (Array.isArray(prevData)) {
              return prevData.map(chat => {
                if (chat.user.id === selectedChat.user.id) {
                  const updatedMessages = chat.messages.map(msg => 
                    msg.id === tempMessageId ? realMessage : msg
                  )
                  return { ...chat, messages: updatedMessages }
                }
                return chat
              })
            }
            return prevData
          })
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // В случае ошибки удаляем временное сообщение
      if (selectedChat) {
        setSelectedChat(prevChat => {
          if (!prevChat) return prevChat
          const updatedMessages = prevChat.messages.filter(msg => msg.id !== tempMessageId)
          return { ...prevChat, messages: updatedMessages }
        })

        setMessagesData(prevData => {
          if (user?.roles?.some(r => r.name === 'admin') && prevData?.tabs) {
            const updatedTabs = prevData.tabs.map((tab, tabIndex) => {
              if (tabIndex === activeTab) {
                const updatedChats = tab.chats.map(chat => {
                  if (chat.user.id === selectedChat.user.id) {
                    const updatedMessages = chat.messages.filter(msg => msg.id !== tempMessageId)
                    return { ...chat, messages: updatedMessages }
                  }
                  return chat
                })
                return { ...tab, chats: updatedChats }
              }
              return tab
            })
            return { ...prevData, tabs: updatedTabs }
          } else if (Array.isArray(prevData)) {
            return prevData.map(chat => {
              if (chat.user.id === selectedChat.user.id) {
                const updatedMessages = chat.messages.filter(msg => msg.id !== tempMessageId)
                return { ...chat, messages: updatedMessages }
              }
              return chat
            })
          }
          return prevData
        })
      }
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

  const handleSelectChat = async (chat) => {
    setSelectedChat(chat)
    if (isBelowMdScreen) {
      setSidebarOpen(false)
      setBackdropOpen(false)
    }

    // Помечаем все непрочитанные сообщения в этом чате как прочитанные
    if (chat && chat.user) {
      try {
        // Очищаем отслеживание для предыдущего чата и устанавливаем для нового
        markedAsReadRef.current.clear()
        
        // Оптимистично уменьшаем счетчик в меню сразу (для мгновенного обновления UI)
        const unreadCount = chat.unread_count || 0
        if (unreadCount > 0) {
          optimisticallyUpdateChatCount(-unreadCount)
        }
        
        // Определяем from_user_id (от кого) и to_user_id (кому) для пометки сообщений
        let fromUserId = chat.user.id
        let toUserId = null

        if (user?.roles?.some(r => r.name === 'admin')) {
          // Для админов: 
          // - fromUserId = ID модератора (chat.user.id)
          // - toUserId = ID админа (selectedAdminTab или user.id)
          fromUserId = chat.user.id // От модератора
          toUserId = selectedAdminTab || user.id // К админу (выбранному во вкладке или текущему)
        } else if (user?.roles?.some(r => r.name === 'moderator')) {
          // Для модераторов:
          // - fromUserId = ID админа (chat.user.id)
          // - toUserId = текущий модератор (user.id)
          fromUserId = chat.user.id // От админа
          toUserId = user.id // К модератору (текущий пользователь)
        }

        const requestData = {
          from_user_id: fromUserId,
          type: 'message'
        }

        // Добавляем to_user_id только если это админ и выбран другой админ во вкладке
        if (user?.roles?.some(r => r.name === 'admin') && toUserId && toUserId !== user.id) {
          requestData.to_user_id = toUserId
        }

        await api.post('/messages/mark-chat-read', requestData)

        // Сбрасываем счетчик чата в меню
        resetChatCount()

        // Обновляем сообщения
        await loadMessages(true) // silent = true для быстрого обновления
      } catch (error) {
        console.error('Error marking chat as read:', error)
      }
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
              {messagesData.tabs.map((tab, index) => {
                // Считаем общее количество непрочитанных сообщений для этого админа
                const totalUnreadCount = tab.chats.reduce((sum, chat) => sum + (chat.unread_count || 0), 0)
                
                return (
                  <Tab 
                    key={tab.admin.id} 
                    value={index}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>{tab.admin.name}</span>
                        {totalUnreadCount > 0 && (
                          <Chip
                            label={totalUnreadCount}
                            size="small"
                            color="error"
                            sx={{
                              height: 20,
                              minWidth: 20,
                              fontSize: '0.7rem',
                              fontWeight: 'bold',
                              '& .MuiChip-label': {
                                px: 0.5
                              }
                            }}
                          />
                        )}
                      </Box>
                    }
                  />
                )
              })}
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
