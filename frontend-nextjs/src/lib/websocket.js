'use client'

import io from 'socket.io-client'
import api from '@/lib/api'

let socket = null

export const initializeSocket = () => {
  if (socket && socket.connected) {
    return socket
  }

  const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:6001'

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  socket = io(wsUrl, {
    auth: {
      token: token,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  })

  socket.on('connect', () => {
    console.log('WebSocket connected:', socket.id)
  })

  socket.on('disconnect', (reason) => {
    console.log('WebSocket disconnected:', reason)
    // Mark user as offline when WebSocket disconnects
    markUserOffline()
  })

  socket.on('error', (error) => {
    console.error('WebSocket error:', error)
  })

  return socket
}

// Mark user as offline on backend when WebSocket disconnects
const markUserOffline = async () => {
  try {
    await api.post('/user/mark-offline')
    console.log('User marked as offline')
  } catch (error) {
    console.error('Error marking user offline:', error)
  }
}

export const getSocket = () => {
  if (!socket) {
    return initializeSocket()
  }
  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export const subscribeToMessages = (domainId, userId, callback) => {
  const socket = getSocket()
  
  // Подписываемся на события для домена и пользователя
  socket.on(`domain.${domainId}:message.sent`, callback)
  socket.on(`user.${userId}:message.sent`, callback)

  // Возвращаем функцию для отписки
  return () => {
    socket.off(`domain.${domainId}:message.sent`, callback)
    socket.off(`user.${userId}:message.sent`, callback)
  }
}

export const subscribeToUserStatus = (domainId, callback) => {
  const socket = getSocket()
  
  socket.on(`domain.${domainId}:user.status.changed`, callback)

  return () => {
    socket.off(`domain.${domainId}:user.status.changed`, callback)
  }
}

export const subscribeToTaskAssignments = (userId, callback) => {
  const socket = getSocket()
  
  // Subscribe to task.assigned events on user's private channel
  socket.on(`user.${userId}:task.assigned`, callback)

  // Return unsubscribe function
  return () => {
    socket.off(`user.${userId}:task.assigned`, callback)
  }
}
