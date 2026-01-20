'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'

export const useMenuCounts = () => {
  const { user } = useAuthStore()
  const [counts, setCounts] = useState({
    chat: 0,
    support: 0,
    tasks: 0,
    chat_by_admin: [],
    tasks_by_admin: [],
  })
  const [loading, setLoading] = useState(true)
  const [isPageVisible, setIsPageVisible] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(3000)

  const fetchCounts = async () => {
    try {
      if (!user) {
        setCounts({ chat: 0, support: 0, tasks: 0, chat_by_admin: [], tasks_by_admin: [] })
        setLoading(false)
        return
      }

      // Определяем путь в зависимости от роли
      const endpoint = user?.roles?.some(r => r.name === 'admin')
        ? '/admin/dashboard/counts'
        : '/moderator/dashboard/counts'

      const response = await api.get(endpoint)
      const data = response.data || {}
      const newCounts = {
        chat: data.chat ?? 0,
        support: data.support ?? 0,
        tasks: data.tasks ?? 0,
        chat_by_admin: data.chat_by_admin ?? [],
        tasks_by_admin: data.tasks_by_admin ?? [],
      }
      console.log('Menu counts fetched:', newCounts, 'from endpoint:', endpoint)
      setCounts(newCounts)
    } catch (error) {
      console.error('Error fetching menu counts:', error)
      console.error('Error details:', error.response?.data || error.message)
      setCounts({ chat: 0, support: 0, tasks: 0, chat_by_admin: [], tasks_by_admin: [] })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCounts()

    // Отслеживаем видимость вкладки (Visibility API)
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible'
      setIsPageVisible(isVisible)
      // Если вкладка стала видна, сразу обновляем счетчики
      if (isVisible) {
        fetchCounts()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user])

  // Динамический интервал обновления в зависимости от видимости вкладки
  useEffect(() => {
    // 3 секунды когда вкладка видна, 30 секунд когда в фоне
    const newInterval = isPageVisible ? 3000 : 30000
    setRefreshInterval(newInterval)

    const interval = setInterval(() => {
      fetchCounts()
    }, newInterval)

    return () => clearInterval(interval)
  }, [isPageVisible])

  // Оптимистичное обновление счетчика чата (для мгновенного обновления UI)
  const optimisticallyUpdateChatCount = (unreadCountToSubtract) => {
    setCounts(prevCounts => ({
      ...prevCounts,
      chat: Math.max(0, (prevCounts.chat || 0) - (unreadCountToSubtract || 0))
    }))
  }

  return { counts, loading, refreshCounts: fetchCounts, optimisticallyUpdateChatCount }
}

