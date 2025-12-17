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
  withCredentials: false, // Don't send cookies, use tokens only
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
      const message = error.response?.data?.message || 'Login error'
      throw new Error(message === 'Invalid credentials' ? 'Invalid email or password' : message)
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
      // Handle validation errors
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors
        const errorMessages = Object.entries(errors)
          .map(([field, messages]) => {
            const fieldName = field === 'password' ? 'Password' : 
                           field === 'email' ? 'Email' : 
                           field === 'name' ? 'Name' :
                           field === 'role' ? 'Role' : field
            const msgArray = Array.isArray(messages) ? messages : [messages]
            return `${fieldName}: ${msgArray.join(', ')}`
          })
          .join('\n')
        throw new Error(errorMessages)
      }
      
      const message = error.response?.data?.message || error.message || 'Registration error'
      
      // Log full error for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('Registration error:', error.response?.data || error)
      }
      
      throw new Error(message)
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

