'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useMenuCountsStore } from '@/store/menuCountsStore'
import { subscribeToTaskAssignments } from '@/lib/websocket'

export const useMenuCounts = () => {
  const { user } = useAuthStore()
  const { counts, loading, fetchCounts, updateChatCount } = useMenuCountsStore()

  useEffect(() => {
    // Загружаем счетчики при монтировании компонента
    fetchCounts()

    // Отслеживаем видимость вкладки (Visibility API)
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible'
      // Если вкладка стала видна, обновляем счетчики
      if (isVisible) {
        fetchCounts(true) // force = true
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user])

  // Subscribe to real-time task assignment events for moderators
  useEffect(() => {
    if (user && user.roles?.some(r => r.name === 'moderator')) {
      const unsubscribe = subscribeToTaskAssignments(user.id, (data) => {
        console.log('Task assigned event received:', data)
        // Update the task count with the value from the broadcast event
        if (data.pending_count !== undefined) {
          useMenuCountsStore.setState(state => ({
            counts: {
              ...state.counts,
              tasks: data.pending_count
            }
          }))
        } else {
          // Fallback: refresh all counts if pending_count is not provided
          fetchCounts(true)
        }
      })

      return () => unsubscribe()
    }
  }, [user])

  return { 
    counts, 
    loading, 
    refreshCounts: () => fetchCounts(true), 
    optimisticallyUpdateChatCount: updateChatCount 
  }
}
