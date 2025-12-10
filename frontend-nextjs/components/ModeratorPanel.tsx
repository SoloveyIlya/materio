'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import axios from 'axios'

interface Task {
  id: number
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed'
  price: number
  completion_hours: number
  work_day?: number
  assigned_at?: string
  completed_at?: string
  due_at?: string
  category?: { name: string }
  template?: { id: number }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default function ModeratorPanel() {
  const { user } = useAuthStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [workDayInfo, setWorkDayInfo] = useState<{
    work_start_date?: string
    current_work_day?: number
    timezone?: string
  } | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    loadTasks()
    loadWorkDayInfo()
  }, [])

  const loadTasks = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (filterStatus !== 'all') {
        params.status = filterStatus
      }
      const response = await api.get('/moderator/tasks', { params })
      setTasks(response.data)
    } catch (error) {
      console.error('Ошибка загрузки тасков:', error)
      alert('Ошибка загрузки тасков')
    } finally {
      setLoading(false)
    }
  }

  const loadWorkDayInfo = async () => {
    try {
      const response = await api.get('/moderator/work-day')
      setWorkDayInfo(response.data)
    } catch (error) {
      console.error('Ошибка загрузки информации о дне работы:', error)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [filterStatus])

  const handleStartWork = async () => {
    if (!confirm('Начать работу? Будут автоматически созданы таски для текущего дня.')) return
    try {
      setLoading(true)
      const response = await api.post('/moderator/tasks/start-work')
      alert(`Успешно! Создано тасков: ${response.data.tasks?.length || 0}`)
      await loadTasks()
      await loadWorkDayInfo()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Ошибка при начале работы')
    } finally {
      setLoading(false)
    }
  }

  const handleStartTask = async (taskId: number) => {
    try {
      await api.post(`/moderator/tasks/${taskId}/start`)
      await loadTasks()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Ошибка при старте таска')
    }
  }

  const handleCompleteTask = async (taskId: number) => {
    if (!confirm('Завершить таск?')) return
    try {
      await api.post(`/moderator/tasks/${taskId}/complete`)
      await loadTasks()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Ошибка при завершении таска')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Ожидает'
      case 'in_progress':
        return 'В работе'
      case 'completed':
        return 'Завершен'
      default:
        return status
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Панель модератора</h1>
            <p className="text-gray-600 mt-1">Управление тасками и рабочими днями</p>
          </div>
          {workDayInfo && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl px-6 py-4 border border-blue-200">
              <div className="text-sm text-gray-600 mb-1">Текущий день работы</div>
              <div className="text-2xl font-bold text-blue-700">
                {workDayInfo.current_work_day ? `День ${workDayInfo.current_work_day}` : 'Не начат'}
              </div>
            </div>
          )}
        </div>
      </div>
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Мои таски</h2>
                {workDayInfo && (
                  <div className="text-sm text-gray-600 space-y-1">
                    {workDayInfo.work_start_date ? (
                      <>
                        <div>
                          <span className="font-medium">Дата начала работы:</span>{' '}
                          {new Date(workDayInfo.work_start_date).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </div>
                        {workDayInfo.timezone && (
                          <div className="text-xs text-gray-500">Таймзона: {workDayInfo.timezone}</div>
                        )}
                      </>
                    ) : (
                      <span className="text-orange-600 font-medium">Работа еще не начата</span>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={handleStartWork}
                disabled={loading}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg font-medium disabled:opacity-50 flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Загрузка...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    <span>{workDayInfo?.work_start_date ? 'Обновить таски дня' : 'Начать работу'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 inline-flex">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-5 py-2.5 rounded-lg transition-all font-medium text-sm ${
                filterStatus === 'all'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Все
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-5 py-2.5 rounded-lg transition-all font-medium text-sm ${
                filterStatus === 'pending'
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Ожидают
            </button>
            <button
              onClick={() => setFilterStatus('in_progress')}
              className={`px-5 py-2.5 rounded-lg transition-all font-medium text-sm ${
                filterStatus === 'in_progress'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              В работе
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-5 py-2.5 rounded-lg transition-all font-medium text-sm ${
                filterStatus === 'completed'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Завершенные
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Загрузка...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
            <div className="max-w-md mx-auto">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-700 text-lg font-semibold mb-2">Нет тасков</p>
              <p className="text-gray-500">Нажмите "Начать работу" для создания тасков</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((task) => (
              <div key={task.id} className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex-1 pr-2">{task.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusColor(task.status)}`}>
                    {getStatusText(task.status)}
                  </span>
                </div>

                {task.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">{task.description}</p>
                )}

                <div className="space-y-2 mb-4">
                  {task.category && (
                    <div className="text-sm">
                      <span className="text-gray-500">Категория:</span>{' '}
                      <span className="text-gray-900 font-medium">{task.category.name}</span>
                    </div>
                  )}
                  {task.work_day && (
                    <div className="text-sm">
                      <span className="text-gray-500">День работы:</span>{' '}
                      <span className="text-gray-900 font-medium">{task.work_day}</span>
                    </div>
                  )}
                  <div className="text-sm">
                    <span className="text-gray-500">Цена:</span>{' '}
                    <span className="text-gray-900 font-medium">{task.price} ₽</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Срок:</span>{' '}
                    <span className="text-gray-900 font-medium">{task.completion_hours} ч</span>
                  </div>
                  {task.assigned_at && (
                    <div className="text-xs text-gray-400">
                      Назначен: {new Date(task.assigned_at).toLocaleString('ru-RU')}
                    </div>
                  )}
                </div>

                <div className="flex space-x-2 mt-6">
                  {task.status === 'pending' && (
                    <button
                      onClick={() => handleStartTask(task.id)}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg text-sm font-semibold flex items-center justify-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Начать</span>
                    </button>
                  )}
                  {task.status === 'in_progress' && (
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg text-sm font-semibold flex items-center justify-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Завершить</span>
                    </button>
                  )}
                  {task.status === 'completed' && (
                    <div className="flex-1 text-center text-sm text-green-600 font-semibold bg-green-50 rounded-lg py-3 flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Завершен</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}

