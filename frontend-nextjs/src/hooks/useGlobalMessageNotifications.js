'use client'

import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import { playNotificationSound } from '@/utils/soundNotification'
import { initializeSocket, subscribeToMessages } from '@/lib/websocket'

/**
 * Глобальный хук для отслеживания новых сообщений и воспроизведения звуковых уведомлений
 * Работает на всех страницах приложения, не только на странице чата
 * Использует WebSocket для получения уведомлений в реальном времени
 */
export const useGlobalMessageNotifications = () => {
  const { user } = useAuthStore()
  const previousMessagesDataRef = useRef(null)
  const unsubscribeRef = useRef(null)

  useEffect(() => {
    if (!user) {
      previousMessagesDataRef.current = null
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
      return
    }

    // Инициализируем WebSocket соединение
    const socket = initializeSocket()
    
    // Подписываемся на новые сообщения через WebSocket
    const unsubscribe = subscribeToMessages(user.domain_id, user.id, (data) => {
      // Воспроизводим звук при получении нового сообщения
      playNotificationSound()
    })

    unsubscribeRef.current = unsubscribe

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [user])
}
