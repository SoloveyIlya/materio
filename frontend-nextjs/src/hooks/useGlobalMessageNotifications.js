'use client'

import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import { playNotificationSound } from '@/utils/soundNotification'

/**
 * Глобальный хук для отслеживания новых сообщений и воспроизведения звуковых уведомлений
 * Работает на всех страницах приложения, не только на странице чата
 */
export const useGlobalMessageNotifications = () => {
  const { user } = useAuthStore()
  const previousMessagesDataRef = useRef(null)

  useEffect(() => {
    if (!user) {
      previousMessagesDataRef.current = null
      return
    }

    // Функция для загрузки сообщений
    const loadMessages = async () => {
      try {
        // Обновляем только если страница видна (не в фоне)
        if (document.visibilityState !== 'visible') {
          return
        }

        const type = 'message'
        const response = await api.get(`/messages?type=${type}`)
        const newData = response.data
        const previousData = previousMessagesDataRef.current

        // Обнаруживаем новые непрочитанные сообщения
        if (previousData && newData && user) {
          detectNewMessages(previousData, newData, user)
        }

        // Сохраняем текущие данные для следующего сравнения
        previousMessagesDataRef.current = JSON.parse(JSON.stringify(newData))
      } catch (error) {
        // Игнорируем ошибки, чтобы не засорять консоль
        // console.error('Error loading messages for notifications:', error)
      }
    }

    // Функция для обнаружения новых сообщений
    const detectNewMessages = (previousData, newData, currentUser) => {
      let hasNewUnreadMessages = false

      // Для админов
      if (currentUser?.roles?.some(r => r.name === 'admin')) {
        if (newData?.tabs && Array.isArray(newData.tabs)) {
          for (const tab of newData.tabs) {
            const previousTab = previousData?.tabs?.find(t => t.admin.id === tab.admin.id)

            if (previousTab) {
              for (const chat of tab.chats) {
                const previousChat = previousTab.chats.find(c => c.user.id === chat.user.id)

                if (previousChat) {
                  const previousMessageIds = new Set(previousChat.messages.map(m => m.id))
                  const newMessages = chat.messages.filter(m => !previousMessageIds.has(m.id))

                  const newUnreadMessages = newMessages.filter(msg => {
                    return msg.from_user_id !== currentUser.id &&
                      (msg.is_read === false || msg.is_read === 0 || msg.is_read === null)
                  })

                  if (newUnreadMessages.length > 0) {
                    hasNewUnreadMessages = true
                    break // Нашли новые сообщения, можно выходить
                  }
                } else {
                  // Новый чат
                  const unreadMessages = chat.messages.filter(msg => {
                    return msg.from_user_id !== currentUser.id &&
                      (msg.is_read === false || msg.is_read === 0 || msg.is_read === null)
                  })

                  if (unreadMessages.length > 0) {
                    hasNewUnreadMessages = true
                    break
                  }
                }
              }
            } else {
              // Новый таб
              for (const chat of tab.chats) {
                const unreadMessages = chat.messages.filter(msg => {
                  return msg.from_user_id !== currentUser.id &&
                    (msg.is_read === false || msg.is_read === 0 || msg.is_read === null)
                })

                if (unreadMessages.length > 0) {
                  hasNewUnreadMessages = true
                  break
                }
              }
            }

            if (hasNewUnreadMessages) break
          }
        }

        // Проверяем незакрепленных модераторов
        if (!hasNewUnreadMessages && newData?.unassigned?.chats) {
          const previousUnassigned = previousData?.unassigned?.chats || []
          for (const chat of newData.unassigned.chats) {
            const previousChat = previousUnassigned.find(c => c.user.id === chat.user.id)

            if (previousChat) {
              const previousMessageIds = new Set(previousChat.messages.map(m => m.id))
              const newMessages = chat.messages.filter(m => !previousMessageIds.has(m.id))

              const newUnreadMessages = newMessages.filter(msg => {
                return msg.from_user_id !== currentUser.id &&
                  (msg.is_read === false || msg.is_read === 0 || msg.is_read === null)
              })

              if (newUnreadMessages.length > 0) {
                hasNewUnreadMessages = true
                break
              }
            } else {
              const unreadMessages = chat.messages.filter(msg => {
                return msg.from_user_id !== currentUser.id &&
                  (msg.is_read === false || msg.is_read === 0 || msg.is_read === null)
              })

              if (unreadMessages.length > 0) {
                hasNewUnreadMessages = true
                break
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

              const newUnreadMessages = newMessages.filter(msg => {
                return msg.from_user_id !== currentUser.id &&
                  (msg.is_read === false || msg.is_read === 0 || msg.is_read === null)
              })

              if (newUnreadMessages.length > 0) {
                hasNewUnreadMessages = true
                break
              }
            } else {
              // Новый чат
              const unreadMessages = chat.messages.filter(msg => {
                return msg.from_user_id !== currentUser.id &&
                  (msg.is_read === false || msg.is_read === 0 || msg.is_read === null)
              })

              if (unreadMessages.length > 0) {
                hasNewUnreadMessages = true
                break
              }
            }
          }
        }
      }

      // Воспроизводим звук при обнаружении новых непрочитанных сообщений
      if (hasNewUnreadMessages) {
        playNotificationSound()
      }
    }

    // Первая загрузка для инициализации
    loadMessages()

    // Настройка интервала для периодической проверки новых сообщений
    // Проверяем каждые 5 секунд (чаще, чем счетчики в меню, но не слишком часто)
    const interval = setInterval(() => {
      loadMessages()
    }, 5000)

    // Обработчик изменения видимости страницы - загружаем сообщения при возвращении на вкладку
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadMessages()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user])
}
