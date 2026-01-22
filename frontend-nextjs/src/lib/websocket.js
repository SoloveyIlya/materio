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
    console.log('[WS] Echo уже инициализирован, возвращаем существующий')
    return echo
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:6001'
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  console.log('[WS] Начало инициализации Echo', {
    apiUrl,
    wsUrl,
    token: token ? '✓ есть' : '✗ нет',
  })

  if (!token) {
    console.warn('[WS] ⚠️ Токен не найден в localStorage!')
  }

  // Парсим WebSocket URL
  const wsUrlObj = new URL(wsUrl)
  const wsHost = wsUrlObj.hostname
  const wsPort = wsUrlObj.port || (wsUrlObj.protocol === 'https:' ? 443 : 80)
  const useTLS = wsUrlObj.protocol === 'https:'

  console.log('[WS] Параметры подключения:', {
    wsHost,
    wsPort,
    useTLS,
    wsPath: '/app',
    authEndpoint: `${apiUrl}/api/broadcasting/auth`,
  })

  try {
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
      authEndpoint: `${apiUrl}/api/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      },
    })

    console.log('[WS] ✅ Echo объект создан')

    // Логирование событий подключения
    echo.connector.pusher.connection.bind('state_change', (states) => {
      console.log('[WS] State change:', states.previous, '→', states.current)
    })

    echo.connector.pusher.connection.bind('error', (err) => {
      console.error('[WS] ❌ Connection error:', err)
    })

    echo.connector.pusher.connection.bind('connected', () => {
      console.log('[WS] ✅ Connected успешно!')
    })

    // Логирование всех событий (ДИАГНОСТИКА)
    echo.connector.pusher.bind_global((event, data) => {
      console.log('[WS EVENT]', event, data)
    })

    // События подключения
    echo.connector.pusher.connection.bind('disconnected', () => {
      console.log('[WS] Disconnected')
      markUserOffline()
    })

    // Делаем Echo доступным глобально
    if (typeof window !== 'undefined') {
      window.Echo = echo
      console.log('[WS] ✅ window.Echo установлен глобально')
    }

    return echo
  } catch (error) {
    console.error('[WS] ❌ Ошибка при создании Echo:', error)
    throw error
  }
}

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
  
  const userChannelName = `user.${userId}`
  const domainChannelName = `domain.${domainId}`
  
  console.log('[WS] Подписка на сообщения:', { userChannelName, domainChannelName })
  
  // Set для отслеживания уже обработанных сообщений (дедупликация)
  const processedMessageIds = new Set()
  
  // Обработчик сообщений
  const handleUserMessage = (data) => {
    console.log('[WS] Получено сообщение на user канале:', data)
    
    // Проверяем, не обработали ли мы уже это сообщение
    if (data.id && processedMessageIds.has(data.id)) {
      console.log('[WS] Дубликат сообщения:', data.id)
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

  const handleDomainMessage = (data) => {
    console.log('[WS] Получено сообщение на domain канале:', data)
    
    // Проверяем, не обработали ли мы уже это сообщение
    if (data.id && processedMessageIds.has(data.id)) {
      console.log('[WS] Дубликат сообщения (domain):', data.id)
      return
    }
    
    if (data.id) {
      processedMessageIds.add(data.id)
      setTimeout(() => {
        processedMessageIds.delete(data.id)
      }, 10000)
    }
    
    callback(data)
  }
  
  // Подписываемся на user канал
  const userChannel = echoInstance.private(userChannelName)
  userChannel.listen('MessageSent', handleUserMessage)
  console.log('[WS] Подписаны на user канал', userChannelName)
  
  // Подписываемся и на domain канал (на случай если события там)
  const domainChannel = echoInstance.private(domainChannelName)
  domainChannel.listen('MessageSent', handleDomainMessage)
  console.log('[WS] Подписаны на domain канал', domainChannelName)
  
  // Логируем ВСЕ события для диагностики
  echoInstance.connector.pusher.bind_global((eventName, data) => {
    if (eventName.includes('message') || eventName.includes('Message') || eventName === 'MessageSent') {
      console.log('[WS] ГЛОБАЛЬНОЕ СОБЫТИЕ:', eventName, data)
    }
  })

  // Возвращаем функцию для отписки
  return () => {
    console.log('[WS] Отписка от сообщений:', userChannelName, domainChannelName)
    echoInstance.leave(userChannelName)
    echoInstance.leave(domainChannelName)
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
