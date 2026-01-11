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
      setCounts(response.data || { chat: 0, support: 0, tasks: 0, chat_by_admin: [], tasks_by_admin: [] })
    } catch (error) {
      console.error('Error fetching menu counts:', error)
      setCounts({ chat: 0, support: 0, tasks: 0, chat_by_admin: [], tasks_by_admin: [] })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCounts()

    // Обновляем счетчики каждые 30 секунд
    const interval = setInterval(() => {
      fetchCounts()
    }, 30000)

    return () => clearInterval(interval)
  }, [user])

  return { counts, loading, refreshCounts: fetchCounts }
}

