'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { WebSocketContextProvider } from '@/contexts/WebSocketContext'

/**
 * WebSocket Provider - инициализирует Echo/WebSocket при загрузке приложения
 * Это гарантирует, что WebSocket доступен глобально через window.Echo
 * И предоставляет глобальный контекст для статусов и уведомлений
 */
export default function WebSocketProvider({ children }) {
  const { user } = useAuthStore()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Проверяем есть ли токен в localStorage (user может еще не загруженься из store)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    
    console.log('[WebSocketProvider] Инициализация:', {
      user: user?.id,
      token: token ? 'присутствует' : 'отсутствует',
      isInitialized,
    })

    if (!token && !user) {
      console.log('[WebSocketProvider] Пропуск: нет токена и юзера')
      return
    }

    if (isInitialized) {
      console.log('[WebSocketProvider] Уже инициализировано')
      return
    }

    // Инициализируем WebSocket при загрузке приложения
    const initWebSocket = async () => {
      try {
        console.log('[WebSocketProvider] Импортируем websocket.js...')
        const { initializeSocket } = await import('@/lib/websocket')
        
        console.log('[WebSocketProvider] Инициализируем Echo...')
        const socket = initializeSocket()
        
        if (socket) {
          console.log('[WebSocketProvider] ✅ Echo инициализирован глобально')
          console.log('[WebSocketProvider] window.Echo:', window.Echo ? 'доступен' : 'NOT доступен')
          setIsInitialized(true)
        } else {
          console.error('[WebSocketProvider] ❌ initializeSocket вернул null')
        }
      } catch (error) {
        console.error('[WebSocketProvider] ❌ Ошибка инициализации WebSocket:', error)
      }
    }

    // Инициализируем с небольшой задержкой для гарантии загрузки store
    const timeout = setTimeout(initWebSocket, 100)
    return () => clearTimeout(timeout)
  }, [user, isInitialized])

  return (
    <WebSocketContextProvider>
      {children}
    </WebSocketContextProvider>
  )
}
