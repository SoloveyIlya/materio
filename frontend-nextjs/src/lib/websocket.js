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

  // Парсим WebSocket URL (wss: и https: → порт 443 и TLS, ws: и http: → порт 80)
  const wsUrlObj = new URL(wsUrl)
  const wsHost = wsUrlObj.hostname
  const useTLS = wsUrlObj.protocol === 'https:' || wsUrlObj.protocol === 'wss:'
  const wsPort = wsUrlObj.port || (useTLS ? 443 : 80)

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

    // Логирование всех событий (ДИАГНОСТИКА) - игнорируем служебные события Pusher
    echo.connector.pusher.bind_global((event, data) => {
      // Фильтруем служебные события Pusher (pusher:*, pusher_internal:*)
      if (event.startsWith('pusher:') || event.startsWith('pusher_internal:')) {
        return // Не логируем служебные события
      }
      // Не логируем user.status.changed (слишком много спама, логи в useGlobalWebSocket)
      if (event === 'user.status.changed') {
        return
      }
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

// Глобальный Set для отслеживания уже обработанных сообщений (дедупликация)
const globalProcessedMessageIds = new Set()
// Глобальное хранилище callback'ов для обработки сообщений
const messageCallbacks = new Set()
// Флаг что bind_global уже установлен
let isGlobalBindSetup = false

// Глобальное хранилище callback'ов для обработки статусов пользователей
const statusCallbacks = new Set()
// Флаг что bind_global для статусов уже установлен
let isGlobalStatusBindSetup = false

export const subscribeToMessages = (domainId, userId, callback) => {
  const echoInstance = getSocket()

  const userChannelName = `user.${userId}`
  const domainChannelName = `domain.${domainId}`

  console.log('[WS] Подписка на сообщения:', { userChannelName, domainChannelName })

  // Добавляем callback в глобальное хранилище
  messageCallbacks.add(callback)

  // Обработчик сообщений
  const handleUserMessage = (data) => {

    // Проверяем, не обработали ли мы уже это сообщение
    if (data.id && globalProcessedMessageIds.has(data.id)) {
      return
    }

    // Добавляем ID в обработанные
    if (data.id) {
      globalProcessedMessageIds.add(data.id)

      // Очищаем старые ID через 10 секунд чтобы не переполнять память
      setTimeout(() => {
        globalProcessedMessageIds.delete(data.id)
      }, 10000)
    }

    callback(data)
  }

  const handleDomainMessage = (data) => {
    console.log('[WS] Получено сообщение на domain канале:', data)

    // Проверяем, не обработали ли мы уже это сообщение
    if (data.id && globalProcessedMessageIds.has(data.id)) {
      return
    }

    if (data.id) {
      globalProcessedMessageIds.add(data.id)
      setTimeout(() => {
        globalProcessedMessageIds.delete(data.id)
      }, 10000)
    }

    callback(data)
  }

  // Подписываемся на user канал
  const userChannel = echoInstance.private(userChannelName)
  userChannel.listen('MessageSent', handleUserMessage)

  // Подписываемся и на domain канал (на случай если события там)
  const domainChannel = echoInstance.private(domainChannelName)
  domainChannel.listen('MessageSent', handleDomainMessage)

  // Также попробуем подписаться на событие с точкой (на случай, если Laravel так транслирует)
  userChannel.listen('.message.sent', (data) => {
    handleUserMessage(data)
  })
  domainChannel.listen('.message.sent', (data) => {
    handleDomainMessage(data)
  })

  // Устанавливаем глобальный обработчик только один раз
  if (!isGlobalBindSetup) {
    isGlobalBindSetup = true

    // Логируем ВСЕ события для диагностики (фильтруем служебные события Pusher)
    echoInstance.connector.pusher.bind_global((eventName, data) => {
      // Игнорируем служебные события Pusher
      if (eventName.startsWith('pusher:') || eventName.startsWith('pusher_internal:')) {
        return
      }

      if (eventName.includes('message') || eventName.includes('Message') || eventName === 'MessageSent') {
        console.log('[WS] ГЛОБАЛЬНОЕ СОБЫТИЕ:', eventName, data)


        // Так как .listen() не работает, вызываем callback здесь напрямую
        // Проверяем что это событие MessageSent и оно относится к нашему пользователю
        if (eventName === 'MessageSent' && data && data.id) {
          if (!globalProcessedMessageIds.has(data.id)) {
            globalProcessedMessageIds.add(data.id)
            setTimeout(() => globalProcessedMessageIds.delete(data.id), 10000)

            // Вызываем ВСЕ зарегистрированные callback'и
            messageCallbacks.forEach(cb => {
              try {
                cb(data)
              } catch (e) {
                console.error('[WS] Ошибка в callback:', e)
              }
            })
          }
        }
      }
    })
  }

  // Возвращаем функцию для отписки
  return () => {
    // Удаляем callback из глобального хранилища
    messageCallbacks.delete(callback)
    echoInstance.leave(userChannelName)
    echoInstance.leave(domainChannelName)
  }
}

export const subscribeToUserStatus = (domainId, callback) => {
  const echoInstance = getSocket()

  // Подписываемся на канал домена
  const channel = echoInstance.private(`domain.${domainId}`)

  // Добавляем callback в набор
  statusCallbacks.add(callback)

  // Устанавливаем bind_global только один раз
  if (!isGlobalStatusBindSetup) {
    isGlobalStatusBindSetup = true

    echoInstance.connector.pusher.bind_global((event, data) => {
      if (event === 'user.status.changed') {
        console.log('[WS] 👤 Статус пользователя:', data)

        // Вызываем все зарегистрированные callbacks
        statusCallbacks.forEach(cb => {
          try {
            cb(data)
          } catch (error) {
            console.error('[WS] Ошибка в status callback:', error)
          }
        })
      }
    })
  }

  return () => {
    statusCallbacks.delete(callback)
    echoInstance.leave(`private-domain.${domainId}`)
  }
}

export const subscribeToTaskAssignments = (userId, callback) => {
  const echoInstance = getSocket()

  // Subscribe to task.assigned events on user's private channel
  const channelName = `user.${userId}`
  const channel = echoInstance.private(channelName)
  channel.listen('TaskAssigned', callback)

  // Return unsubscribe function - отписываемся только от события, не покидаем канал
  return () => {
    const chan = echoInstance.connector.channels[`private-${channelName}`]
    if (chan) {
      chan.stopListening('TaskAssigned')
    }
  }
}

// Глобальное хранилище callback'ов для обработки support тикетов
const supportCallbacks = new Set()
// Флаг что bind_global для support уже установлен
let isGlobalSupportBindSetup = false

export const subscribeToSupportTickets = (domainId, callback) => {
  const echoInstance = getSocket()

  // Подписываемся на канал домена
  const channelName = `domain.${domainId}`
  const channel = echoInstance.private(channelName)

  // Добавляем callback в набор
  supportCallbacks.add(callback)

  // Устанавливаем bind_global только один раз
  if (!isGlobalSupportBindSetup) {
    isGlobalSupportBindSetup = true

    echoInstance.connector.pusher.bind_global((event, data) => {
      if (event === 'support.ticket.created') {
        // Вызываем все зарегистрированные callbacks
        supportCallbacks.forEach(cb => {
          try {
            cb(data)
          } catch (error) {
            console.error('[WS] Ошибка в support callback:', error)
          }
        })
      }
    })
  }

  // Return unsubscribe function
  return () => {
    supportCallbacks.delete(callback)
    echoInstance.leave(channelName)
  }
}
