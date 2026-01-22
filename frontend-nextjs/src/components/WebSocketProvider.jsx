'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'

/**
 * WebSocket Provider - инициализирует Echo/WebSocket при загрузке приложения
 * Это гарантирует, что WebSocket доступен глобально через window.Echo
 */
export default function WebSocketProvider({ children }) {
  const { user } = useAuthStore()

  useEffect(() => {
    if (!user) return

    // Инициализируем WebSocket при загрузке приложения
    const initWebSocket = async () => {
      try {
        const { initializeSocket } = await import('@/lib/websocket')
        const socket = initializeSocket()
        
        if (socket) {
          console.log('[App] WebSocket инициализирован глобально')
          // Socket теперь доступен через window.Echo
        }
      } catch (error) {
        console.error('[App] Ошибка инициализации WebSocket:', error)
      }
    }

    initWebSocket()
  }, [user])

  return children
}
