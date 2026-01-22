'use client'

import { create } from 'zustand'
import api from '@/lib/api'

export const useMenuCountsStore = create((set, get) => ({
  counts: {
    chat: 0,
    support: 0,
    tasks: 0,
    chat_by_admin: [],
    tasks_by_admin: [],
  },
  loading: true,
  lastFetchTime: 0,
  
  fetchCounts: async (force = false) => {
    const state = get()
    const now = Date.now()
    
    // Кэширование: не делаем запрос, если прошло менее 5 секунд с последнего запроса
    if (!force && state.lastFetchTime && (now - state.lastFetchTime) < 5000) {
      return state.counts
    }
    
    try {
      const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null
      
      if (!user) {
        set({ 
          counts: { chat: 0, support: 0, tasks: 0, chat_by_admin: [], tasks_by_admin: [] },
          loading: false,
          lastFetchTime: now
        })
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
      
      set({ 
        counts: newCounts,
        loading: false,
        lastFetchTime: now
      })
      
      return newCounts
    } catch (error) {
      set({ 
        counts: { chat: 0, support: 0, tasks: 0, chat_by_admin: [], tasks_by_admin: [] },
        loading: false,
        lastFetchTime: now
      })
    }
  },
  
  // Оптимистичное обновление счетчика чата
  updateChatCount: (delta) => {
    const state = get()
    const newChatCount = Math.max(0, (state.counts.chat || 0) + delta)
    
    set({
      counts: {
        ...state.counts,
        chat: newChatCount
      }
    })
  },
  
  // Сброс счетчиков
  reset: () => {
    set({
      counts: { chat: 0, support: 0, tasks: 0, chat_by_admin: [], tasks_by_admin: [] },
      loading: true,
      lastFetchTime: 0
    })
  }
}))
