'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useMenuCountsStore } from '@/store/menuCountsStore'
import { subscribeToTaskAssignments, subscribeToSupportTickets } from '@/lib/websocket'

export const useMenuCounts = () => {
  const { user } = useAuthStore()
  // Используем селектор для правильной подписки на изменения
  const counts = useMenuCountsStore(state => state.counts)
  const loading = useMenuCountsStore(state => state.loading)
  const updateChatCount = useMenuCountsStore(state => state.updateChatCount)
  const userId = user?.id // Используем только ID чтобы избежать лишних ре-рендеров

  useEffect(() => {
    // Загружаем счетчики при монтировании компонента
    if (user) {
      // Получаем fetchCounts напрямую из store, чтобы не создавать зависимость
      useMenuCountsStore.getState().fetchCounts(true, user)
    }

    // Проверяем при возврате на вкладку (на случай пропущенных WebSocket событий)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        const lastFetch = useMenuCountsStore.getState().lastFetchTime
        const timeSinceLastFetch = Date.now() - lastFetch
        // Обновляем только если прошло больше 60 секунд с последнего запроса
        if (timeSinceLastFetch > 60000) {
          useMenuCountsStore.getState().fetchCounts(true, user)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [userId, user]) // Убрали fetchCounts из зависимостей

  // Subscribe to real-time task assignment events for moderators
  useEffect(() => {
    if (user && user.roles?.some(r => r.name === 'moderator')) {
      const unsubscribe = subscribeToTaskAssignments(user.id, (data) => {
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
          useMenuCountsStore.getState().fetchCounts(true, user)
        }
      })

      return () => unsubscribe()
    }
  }, [userId]) // Используем userId вместо user

  // Subscribe to real-time support ticket events for admins
  useEffect(() => {
    if (user && user.roles?.some(r => r.name === 'admin') && user.domain_id) {

      const unsubscribe = subscribeToSupportTickets(user.domain_id, (data) => {

        // Update the support count with the value from the broadcast event
        if (data.unread_count !== undefined && data.admin_id === user.id) {
          useMenuCountsStore.setState(state => ({
            counts: {
              ...state.counts,
              support: data.unread_count
            }
          }))
        }
      })

      return () => {
        unsubscribe()
      }
    }
  }, [userId, user?.domain_id]) // Зависимости: userId и domain_id

  return {
    counts,
    loading,
    refreshCounts: () => useMenuCountsStore.getState().fetchCounts(true, user),
    optimisticallyUpdateChatCount: updateChatCount,
    resetChatCount: useMenuCountsStore.getState().resetChatCount,
    resetSupportCount: useMenuCountsStore.getState().resetSupportCount
  }
}
