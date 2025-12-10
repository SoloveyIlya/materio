import { create } from 'zustand'
import axios from 'axios'

interface Role {
  id: number
  name: string
  display_name?: string
}

interface User {
  id: number
  name: string
  email: string
  roles?: Role[]
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string,
    role?: 'admin' | 'moderator'
  ) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false, // Не отправляем cookies, используем только токены
})

// Add token to requests
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  login: async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      const { user, token } = response.data
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token)
      }
      
      set({ user, token })
    } catch (error: any) {
      const message = error.response?.data?.message || 'Ошибка входа'
      throw new Error(message === 'Invalid credentials' ? 'Неверный email или пароль' : message)
    }
  },

  register: async (
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string,
    role: 'admin' | 'moderator' = 'moderator'
  ) => {
    try {
      const response = await api.post('/auth/register', {
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
        role,
      })
      const { user, token } = response.data
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token)
      }
      
      set({ user, token })
    } catch (error: any) {
      // Обработка ошибок валидации
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors
        const errorMessages = Object.entries(errors)
          .map(([field, messages]) => {
            const fieldName = field === 'password' ? 'Пароль' : 
                           field === 'email' ? 'Email' : 
                           field === 'name' ? 'Имя' :
                           field === 'role' ? 'Роль' : field
            const msgArray = Array.isArray(messages) ? messages : [messages]
            // Переводим сообщения на русский
            const translatedMessages = msgArray.map((msg: string) => {
              return msg
                .replace('The password must be at least 8 characters.', 'Пароль должен содержать минимум 8 символов')
                .replace('The password confirmation does not match.', 'Пароли не совпадают')
                .replace('The email has already been taken.', 'Пользователь с таким email уже существует')
                .replace('The email must be a valid email address.', 'Email должен быть валидным адресом')
            })
            return `${fieldName}: ${translatedMessages.join(', ')}`
          })
          .join('\n')
        throw new Error(errorMessages)
      }
      
      const message = error.response?.data?.message || error.message || 'Ошибка регистрации'
      
      // Логируем полную ошибку для отладки
      if (process.env.NODE_ENV === 'development') {
        console.error('Registration error:', error.response?.data || error)
      }
      
      throw new Error(message === 'Ошибка валидации' ? 'Проверьте правильность заполнения полей' : message)
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
      }
      set({ user: null, token: null })
    }
  },

  checkAuth: async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!token) {
        set({ isLoading: false })
        return
      }

      const response = await api.get('/auth/user')
      set({ user: response.data, token, isLoading: false })
    } catch (error) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
      }
      set({ user: null, token: null, isLoading: false })
    }
  },
}))

