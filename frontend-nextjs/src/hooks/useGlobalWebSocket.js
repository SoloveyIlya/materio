'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useMenuCountsStore } from '@/store/menuCountsStore'
import { initializeSocket, subscribeToMessages, subscribeToUserStatus } from '@/lib/websocket'
import { playNotificationSound } from '@/utils/soundNotification'

/**
 * Глобальный хук для управления WebSocket подключением
 * Отслеживает:
 * - Новые сообщения (звуковые уведомления + счетчик непрочитанных)
 * - Статусы пользователей (онлайн/оффлайн)
 */
export const useGlobalWebSocket = () => {
  const { user } = useAuthStore()
  const userId = user?.id
  const domainId = user?.domain_id
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const [onlineUsersVersion, setOnlineUsersVersion] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const mountCountRef = useRef(0)
  const subscriptionsRef = useRef({ message: null, status: null })

  useEffect(() => {
    if (!user || !userId || !domainId) {
      console.log('[useGlobalWebSocket] ❌ Нет пользователя')
      setIsConnected(false)
      setOnlineUsers(new Set())
      return
    }

    // Увеличиваем счетчик монтирования
    mountCountRef.current += 1
    const currentMount = mountCountRef.current
    console.log('[useGlobalWebSocket] 🚀 Инициализация для пользователя:', userId, 'domain:', domainId, 'mount:', currentMount)

    let messageUnsubscribe = null
    let statusUnsubscribe = null
    let isCleanedUp = false

    // Обработчик закрытия вкладки - отправляем mark-offline
    const handleBeforeUnload = () => {
      console.log('[useGlobalWebSocket] 🚪 Отправка mark-offline при закрытии вкладки, user:', userId)
      try {
        const token = localStorage.getItem('token')
        if (token) {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
          
          // Используем sendBeacon с токеном в URL (надежнее для beforeunload)
          const success = navigator.sendBeacon(`${apiUrl}/api/user/mark-offline-beacon?token=${token}`, '')
          console.log('[useGlobalWebSocket] sendBeacon result:', success)
          
          // Дублируем fetch для надежности
          fetch(`${apiUrl}/api/user/mark-offline`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({}),
            keepalive: true
          }).catch(() => {})
        }
      } catch (error) {
        console.error('[useGlobalWebSocket] Ошибка при mark-offline:', error)
      }
    }

    // Обработчик скрытия страницы (более надежный чем beforeunload)
    const handleVisibilityChange = () => {
      // Отправляем mark-offline только если страница hidden И прошло более 1 секунды
      // Это предотвращает ложные срабатывания при переключении вкладок
      if (document.visibilityState === 'hidden') {
        setTimeout(() => {
          // Проверяем еще раз - если все еще hidden, значит реально закрыли
          if (document.visibilityState === 'hidden') {
            console.log('[useGlobalWebSocket] 👁️ Страница скрыта >1сек, отправка mark-offline')
            handleBeforeUnload()
          }
        }, 1000)
      }
    }

    try {
      // Инициализируем WebSocket соединение
      const socket = initializeSocket()
      
      if (isCleanedUp) {
        console.log('[useGlobalWebSocket] ⚠️ Cleanup произошел до инициализации')
        return
      }
      
      setIsConnected(true)

      // 1. Подписываемся на новые сообщения
      messageUnsubscribe = subscribeToMessages(domainId, userId, (message) => {
        if (isCleanedUp) return
        
        console.log('[useGlobalWebSocket] Новое сообщение:', message)
        
        // Проверяем, что сообщение не от текущего пользователя
        if (message.from_user_id !== userId) {
          playNotificationSound()
          // Получаем incrementChatCount напрямую из store, передаем message для обновления chat_by_admin
          useMenuCountsStore.getState().incrementChatCount(message)
        }
      })
      subscriptionsRef.current.message = messageUnsubscribe

      // 2. Подписываемся на изменения статусов пользователей
      statusUnsubscribe = subscribeToUserStatus(domainId, (data) => {
        if (isCleanedUp) return
        
        // Обновляем Set онлайн-пользователей (без лишнего логирования - логи уже в websocket.js)
        setOnlineUsers(prev => {
          const newSet = new Set(prev)
          const userId = data.userId || data.user_id
          const isOnline = data.isOnline || data.is_online
          
          if (isOnline) {
            newSet.add(userId)
          } else {
            newSet.delete(userId)
          }
          
          return newSet
        })
        
        // Увеличиваем версию для отслеживания изменений
        setOnlineUsersVersion(v => v + 1)
      })
      subscriptionsRef.current.status = statusUnsubscribe

      console.log('[useGlobalWebSocket] ✅ Подписки активированы, mount:', currentMount)

      // 3. Добавляем обработчики закрытия вкладки
      window.addEventListener('beforeunload', handleBeforeUnload)
      window.addEventListener('pagehide', handleBeforeUnload)
      document.addEventListener('visibilitychange', handleVisibilityChange)

    } catch (error) {
      console.error('[useGlobalWebSocket] ❌ Ошибка инициализации:', error)
      setIsConnected(false)
    }

    return () => {
      console.log('[useGlobalWebSocket] 🔄 Отписка от событий, mount:', currentMount)
      isCleanedUp = true
      if (messageUnsubscribe) messageUnsubscribe()
      if (statusUnsubscribe) statusUnsubscribe()
      subscriptionsRef.current.message = null
      subscriptionsRef.current.status = null
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      setIsConnected(false)
    }
  }, [userId, domainId]) // При изменении userId или domainId происходит переподписка
  
  // Watchdog: проверяем активность подписок каждые 5 секунд
  useEffect(() => {
    if (!userId || !domainId) return
    
    const checkInterval = setInterval(() => {
      const hasSubscriptions = subscriptionsRef.current.message && subscriptionsRef.current.status
      if (!hasSubscriptions && isConnected) {
        console.log('[useGlobalWebSocket] ⚠️ Watchdog: подписки потеряны, но isConnected=true. Сброс состояния.')
        setIsConnected(false)
      }
    }, 5000)
    
    return () => clearInterval(checkInterval)
  }, [userId, domainId, isConnected])

  // Функция для проверки, онлайн ли пользователь
  const isUserOnline = (userId) => {
    return onlineUsers.has(userId)
  }

  // Функция для синхронизации статусов из API данных
  const syncOnlineUsersFromData = (users) => {
    const newOnlineUsers = new Set()
    users.forEach(user => {
      // Нормализуем is_online к boolean (может быть 1/0 из БД)
      const isOnline = Boolean(user.is_online)
      if (isOnline) {
        newOnlineUsers.add(user.id)
      }
    })
    
    if (newOnlineUsers.size > 0) {
      console.log('[useGlobalWebSocket] 🔄 Синхронизация из API:', Array.from(newOnlineUsers))
      setOnlineUsers(newOnlineUsers)
      setOnlineUsersVersion(v => v + 1)
    }
  }

  return {
    isConnected,
    isUserOnline,
    syncOnlineUsersFromData,
    onlineUsersSet: onlineUsers,
    onlineUsersVersion, // Используется для отслеживания изменений в useEffect
  }
}
