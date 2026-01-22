'use client'

// Third-party Imports
import { Provider } from 'react-redux'

// Component Imports
import WebSocketProvider from '@/components/WebSocketProvider'

import { store } from '@/redux-store'

const ReduxProvider = ({ children }) => {
  return (
    <Provider store={store}>
      <WebSocketProvider>{children}</WebSocketProvider>
    </Provider>
  )
}

export default ReduxProvider
