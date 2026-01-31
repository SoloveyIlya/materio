'use client'

import { create } from 'zustand'
import api from '@/lib/api'
import { useAuthStore } from './authStore'

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
  
  fetchCounts: async (force = false, userFromStore = null) => {
    const state = get()
    const now = Date.now()
    
    console.log('[menuCountsStore] fetchCounts вызван (только при загрузке):', { force, userFromStore: userFromStore?.id })
    
    try {
      // Используем переданного пользователя или пытаемся получить из localStorage
      let user = userFromStore
      if (!user && typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('user')
        user = storedUser ? JSON.parse(storedUser) : null
      }
      
      if (!user) {
        console.log('[menuCountsStore] Нет пользователя')
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

      console.log('[menuCountsStore] Делаем запрос к API:', endpoint)
      const response = await api.get(endpoint)
      const data = response.data || {}
      console.log('[menuCountsStore] Ответ от API:', data)
      
      // Проверяем, находится ли пользователь на странице чата
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
      const isOnChatPage = currentPath === '/chat' || currentPath.startsWith('/chat/')
      
      // Сохраняем текущий счетчик chat, если он больше чем пришел из API
      // (WebSocket может увеличить его быстрее, чем API обновится)
      // Если пользователь на странице чата - всегда сбрасываем в 0
      const currentChatCount = state.counts.chat || 0
      const apiChatCount = data.chat ?? 0
      const finalChatCount = isOnChatPage ? 0 : Math.max(currentChatCount, apiChatCount)
      
      const newCounts = {
        chat: finalChatCount,
        support: data.support ?? 0,
        tasks: data.tasks ?? 0,
        chat_by_admin: data.chat_by_admin ?? [],
        tasks_by_admin: data.tasks_by_admin ?? [],
      }
      
      console.log('[menuCountsStore] fetchCounts:', {
        isOnChatPage,
        current: currentChatCount,
        fromAPI: apiChatCount,
        final: finalChatCount
      })
      
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
  
  // Увеличить счетчик при новом сообщении через WebSocket
  incrementChatCount: (message = null) => {
    const state = get()
    
    // Получаем текущего пользователя из authStore
    const currentUserId = useAuthStore.getState().user?.id
    
    // Проверяем, адресовано ли сообщение текущему пользователю
    const isMessageForCurrentUser = message && message.to_user_id === currentUserId
    
    console.log('[menuCountsStore] incrementChatCount:', { 
      to_user_id: message?.to_user_id, 
      currentUserId, 
      isMessageForCurrentUser,
      message_id: message?.id
    })
    
    // Увеличиваем общий счетчик только если сообщение для текущего пользователя
    let newCount = state.counts.chat || 0
    if (isMessageForCurrentUser) {
      newCount = newCount + 1
      console.log('[menuCountsStore] Увеличиваем chat:', state.counts.chat, '→', newCount)
    } else {
      console.log('[menuCountsStore] Сообщение НЕ для текущего пользователя, общий счетчик не меняем')
    }
    
    // Для админов нужно также обновить chat_by_admin
    // Обновляем только если массив уже существует И в нем есть элементы (пришел с бэкенда для админа)
    let newChatByAdmin = state.counts.chat_by_admin || []
    if (message && message.to_user_id && Array.isArray(newChatByAdmin) && newChatByAdmin.length > 0) {
      const adminIndex = newChatByAdmin.findIndex(item => item.admin_id === message.to_user_id)
      
      if (adminIndex >= 0) {
        // Админ уже есть в списке - увеличиваем его счетчик
        newChatByAdmin = [
          ...newChatByAdmin.slice(0, adminIndex),
          {
            ...newChatByAdmin[adminIndex],
            count: (newChatByAdmin[adminIndex].count || 0) + 1
          },
          ...newChatByAdmin.slice(adminIndex + 1)
        ]
        console.log('[menuCountsStore] Обновили chat_by_admin для admin_id:', message.to_user_id)
      } else {
        // Админ еще нет в списке - добавляем (только если это админский домен)
        newChatByAdmin = [
          ...newChatByAdmin,
          {
            admin_id: message.to_user_id,
            admin_name: message.to_user?.name || 'Admin',
            count: 1
          }
        ]
        console.log('[menuCountsStore] Добавили admin в chat_by_admin:', message.to_user_id)
      }
    }
    
    set({
      counts: {
        ...state.counts,
        chat: newCount,
        chat_by_admin: newChatByAdmin
      }
    })
  },

  // Сбросить счетчик чата (когда пользователь открывает страницу чата)
  resetChatCount: () => {
    const state = get()
    const currentUserId = useAuthStore.getState().user?.id
    
    console.log('[menuCountsStore] resetChatCount:', state.counts.chat, '→ 0')
    
    // Для админов также нужно обнулить счетчик в chat_by_admin
    let newChatByAdmin = state.counts.chat_by_admin || []
    if (currentUserId && Array.isArray(newChatByAdmin)) {
      const adminIndex = newChatByAdmin.findIndex(item => item.admin_id === currentUserId)
      if (adminIndex >= 0) {
        newChatByAdmin = [
          ...newChatByAdmin.slice(0, adminIndex),
          {
            ...newChatByAdmin[adminIndex],
            count: 0
          },
          ...newChatByAdmin.slice(adminIndex + 1)
        ]
        console.log('[menuCountsStore] Обнулили chat_by_admin для admin_id:', currentUserId)
      }
    }
    
    set({
      counts: {
        ...state.counts,
        chat: 0,
        chat_by_admin: newChatByAdmin
      }
    })
  },

  // Сбросить счетчик поддержки (когда пользователь открывает тикет)
  resetSupportCount: () => {
    const state = get()
    console.log('[menuCountsStore] resetSupportCount:', state.counts.support, '→ 0')
    set({
      counts: {
        ...state.counts,
        support: 0
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
