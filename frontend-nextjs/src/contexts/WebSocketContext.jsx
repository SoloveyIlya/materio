'use client'

import { createContext, useContext } from 'react'
import { useGlobalWebSocket } from '@/hooks/useGlobalWebSocket'

const WebSocketContext = createContext({
  isConnected: false,
  unreadCount: 0,
  resetUnreadCount: () => {},
  isUserOnline: () => false,
  onlineUsers: [],
})

export const WebSocketContextProvider = ({ children }) => {
  const websocketData = useGlobalWebSocket()

  return (
    <WebSocketContext.Provider value={websocketData}>
      {children}
    </WebSocketContext.Provider>
  )
}

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketContextProvider')
  }
  return context
}
