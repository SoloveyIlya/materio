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

  // Hooks
  const { settings } = useSettings()
  const { refreshCounts, optimisticallyUpdateChatCount } = useMenuCounts()
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

  // Auto-refresh messages with WebSocket
  useEffect(() => {
    if (!user) return

    // Import WebSocket utilities
    const initSocket = async () => {
      const { initializeSocket, subscribeToMessages } = await import('@/lib/websocket')
      const socket = initializeSocket()
      
      // Подписываемся на новые сообщения
      const unsubscribe = subscribeToMessages(user.domain_id, user.id, (data) => {
        loadMessages(true) // silent = true
      })

      return unsubscribe
    }

    let unsubscribe = null
    initSocket().then(unsub => {
      unsubscribe = unsub
    }).catch(err => {
      console.error('Failed to initialize WebSocket:', err)
    })

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [user, activeTab])

  // Update selectedChat when messagesData changes and automatically mark messages as read if chat is open
  useEffect(() => {
    if (selectedChat && selectedChat.user && messagesData) {
      const selectedUserId = selectedChat.user.id
      let updatedChat = null
      
      // For admin - ищем чат только в текущей вкладке
      if (user?.roles?.some(r => r.name === 'admin') && messagesData?.tabs && activeTab >= 0 && activeTab < messagesData.tabs.length) {
        const currentTab = messagesData.tabs[activeTab]
        const chat = currentTab.chats.find(c => c.user.id === selectedUserId)
        if (chat) {
          // Обновляем чат только если он найден в текущей вкладке
          updatedChat = chat
          setSelectedChat(chat)
        } else {
          // Если чат не найден в текущей вкладке, сбрасываем selectedChat
          // Это предотвращает отображение чата из другой вкладки
          setSelectedChat(null)
        }
      } else if (messagesData && Array.isArray(messagesData) && selectedChat.user) {
        // For moderator
        const chat = messagesData.find(c => c.user.id === selectedUserId)
        if (chat) {
          updatedChat = chat
          setSelectedChat(chat)
        }
      }

      // Если чат открыт и есть непрочитанные сообщения, автоматически помечаем их как прочитанные
      // Используем ключ для отслеживания, чтобы не помечать повторно
      if (updatedChat && updatedChat.unread_count > 0) {
        const chatKey = `${updatedChat.user.id}-${selectedAdminTab || user?.id}`
        
        // Проверяем, были ли уже непрочитанные сообщения в предыдущих данных
        const previousChat = previousMessagesDataRef.current
          ? (user?.roles?.some(r => r.name === 'admin') && previousMessagesDataRef.current?.tabs
              ? previousMessagesDataRef.current.tabs[activeTab]?.chats?.find(c => c.user.id === selectedUserId)
              : Array.isArray(previousMessagesDataRef.current)
                ? previousMessagesDataRef.current.find(c => c.user.id === selectedUserId)
                : null)
          : null
        
        const previousUnreadCount = previousChat?.unread_count || 0
        const currentUnreadCount = updatedChat.unread_count || 0
        
        // Помечаем как прочитанные только если:
        // 1. Есть непрочитанные сообщения
        // 2. Это новый набор непрочитанных (количество увеличилось или чат только что открыт)
        // 3. Мы еще не помечали этот чат как прочитанный для текущего набора сообщений
        if (currentUnreadCount > 0 && (currentUnreadCount !== previousUnreadCount || !markedAsReadRef.current.has(chatKey))) {
          const markChatAsRead = async () => {
            try {
              let fromUserId = updatedChat.user.id
              let toUserId = null

              if (user?.roles?.some(r => r.name === 'admin')) {
                fromUserId = updatedChat.user.id // От модератора
                toUserId = selectedAdminTab || user.id // К админу
              } else if (user?.roles?.some(r => r.name === 'moderator')) {
                fromUserId = updatedChat.user.id // От админа
                toUserId = user.id // К модератору
              }

              const requestData = {
                from_user_id: fromUserId,
                type: 'message'
              }

              if (user?.roles?.some(r => r.name === 'admin') && toUserId && toUserId !== user.id) {
                requestData.to_user_id = toUserId
              }

              await api.post('/messages/mark-chat-read', requestData)
              
              // Отмечаем, что мы пометили этот чат как прочитанный
              markedAsReadRef.current.add(chatKey)
              
              // Оптимистично обновляем счетчик в меню сразу (для мгновенного обновления UI)
              const unreadCount = updatedChat.unread_count || 0
              if (unreadCount > 0) {
                optimisticallyUpdateChatCount(unreadCount)
              }
              
              // Обновляем счетчики в меню (для синхронизации с сервером)
              refreshCounts()
              
              // Небольшая задержка перед обновлением сообщений, чтобы избежать лишних вызовов
              setTimeout(() => {
                loadMessages(true) // silent = true для быстрого обновления
              }, 1000)
            } catch (error) {
              console.error('Error auto-marking chat as read:', error)
            }
          }
          
          // Помечаем сообщения как прочитанные с небольшой задержкой
          const timeoutId = setTimeout(markChatAsRead, 500)
          return () => clearTimeout(timeoutId)
        }
      } else if (updatedChat && updatedChat.unread_count === 0) {
        // Если все сообщения прочитаны, очищаем отметку для этого чата
        const chatKey = `${updatedChat.user.id}-${selectedAdminTab || user?.id}`
        markedAsReadRef.current.delete(chatKey)
      }
    }
  }, [messagesData, activeTab, selectedChat?.user?.id, selectedAdminTab])


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
      
      // Обновляем счетчики в меню после отправки сообщения (без перезагрузки списка диалогов)
      refreshCounts()
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
        
        // Оптимистично обновляем счетчик в меню сразу (для мгновенного обновления UI)
        const unreadCount = chat.unread_count || 0
        if (unreadCount > 0) {
          optimisticallyUpdateChatCount(unreadCount)
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

        // Обновляем сообщения и счетчики
        await loadMessages(true) // silent = true для быстрого обновления
        
        // Обновляем счетчики в меню (для синхронизации с сервером)
        refreshCounts()
      } catch (error) {
        console.error('Error marking chat as read:', error)
        // В случае ошибки обновляем счетчики, чтобы восстановить правильное значение
        refreshCounts()
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
