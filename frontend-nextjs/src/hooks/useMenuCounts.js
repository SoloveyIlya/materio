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

    // Обновляем счетчики каждые 30 секунд
    const interval = setInterval(() => {
      fetchCounts()
    }, 30000)

    return () => clearInterval(interval)
  }, [user])

  return { counts, loading, refreshCounts: fetchCounts }
}

