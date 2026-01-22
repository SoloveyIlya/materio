'use client'

import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import api from '@/lib/api'

// Делаем Pusher доступным глобально для Echo
if (typeof window !== 'undefined') {
  window.Pusher = Pusher
}

let echo = null

export const initializeSocket = () => {
  if (echo) {
    return echo
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:6001'
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  // Парсим WebSocket URL
  const wsUrlObj = new URL(wsUrl)
  const wsHost = wsUrlObj.hostname
  const wsPort = wsUrlObj.port || (wsUrlObj.protocol === 'https:' ? 443 : 80)
  const useTLS = wsUrlObj.protocol === 'https:'

  echo = new Echo({
    broadcaster: 'pusher',
    key: 'local',
    cluster: 'mt1',
    wsHost: wsHost,
    wsPort: wsPort,
    wssPort: wsPort,
    forceTLS: useTLS,
    encrypted: useTLS,
    disableStats: true,
    enabledTransports: ['ws', 'wss'],
    wsPath: '/app',
    authEndpoint: `${apiUrl}/api/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
  })

  // События подключения
  echo.connector.pusher.connection.bind('disconnected', () => {
    markUserOffline()
  })

  return echo
}

// Mark user as offline on backend when WebSocket disconnects
const markUserOffline = async () => {
  try {
    await api.post('/user/mark-offline')
  } catch (error) {
    // Silently handle error
  }
}

export const getSocket = () => {
  if (!echo) {
    return initializeSocket()
  }
  return echo
}

export const disconnectSocket = () => {
  if (echo) {
    echo.disconnect()
    echo = null
  }
}

export const subscribeToMessages = (domainId, userId, callback) => {
  const echoInstance = getSocket()
  
  // Подписываемся только на приватный канал пользователя
  // Domain канал может дублировать события, поэтому используем только user channel
  const userChannelName = `user.${userId}`
  const privateUserChannelName = `private-${userChannelName}`
  
  // Получаем или создаем канал
  const userChannel = echoInstance.private(userChannelName)
  
  // Set для отслеживания уже обработанных сообщений (дедупликация)
  const processedMessageIds = new Set()
  
  // Используем напрямую Pusher bind для надежности
  const handleUserMessage = (data) => {
    // Проверяем, не обработали ли мы уже это сообщение
    if (data.id && processedMessageIds.has(data.id)) {
      return
    }
    
    // Добавляем ID в обработанные
    if (data.id) {
      processedMessageIds.add(data.id)
      
      // Очищаем старые ID через 10 секунд чтобы не переполнять память
      setTimeout(() => {
        processedMessageIds.delete(data.id)
      }, 10000)
    }
    
    callback(data)
  }
  
  // Bind события через Pusher напрямую
  const pusherUserChannel = echoInstance.connector.pusher.channel(privateUserChannelName)
  
  if (pusherUserChannel) {
    pusherUserChannel.bind('MessageSent', handleUserMessage)
  }

  // Возвращаем функцию для отписки
  return () => {
    if (pusherUserChannel) {
      pusherUserChannel.unbind('MessageSent', handleUserMessage)
    }
    processedMessageIds.clear()
  }
}

export const subscribeToUserStatus = (domainId, callback) => {
  const echoInstance = getSocket()
  
  const channel = echoInstance.private(`domain.${domainId}`)
  channel.listen('UserStatusChanged', callback)

  return () => {
    echoInstance.leave(`domain.${domainId}`)
  }
}

export const subscribeToTaskAssignments = (userId, callback) => {
  const echoInstance = getSocket()
  
  // Subscribe to task.assigned events on user's private channel
  const channel = echoInstance.private(`user.${userId}`)
  channel.listen('TaskAssigned', callback)

  // Return unsubscribe function
  return () => {
    echoInstance.leave(`user.${userId}`)
  }
}
