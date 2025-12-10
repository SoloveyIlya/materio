'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import axios from 'axios'

interface TaskCategory {
  id: number
  name: string
  slug: string
  description?: string
}

interface TaskTemplate {
  id: number
  title: string
  description?: string
  category_id: number
  price: number
  completion_hours: number
  guides_links?: any[]
  attached_services?: any[]
  work_day?: number
  is_primary: boolean
  is_active: boolean
  category?: TaskCategory
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

export default function AdminPanel() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'categories' | 'templates'>('categories')
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null)

  // Формы
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '', description: '' })
  const [templateForm, setTemplateForm] = useState({
    title: '',
    description: '',
    category_id: '',
    price: '0',
    completion_hours: '1',
    work_day: '',
    is_primary: false,
    is_active: true,
  })

  useEffect(() => {
    loadCategories() // Всегда загружаем категории, они нужны для формы шаблонов
    if (activeTab === 'templates') {
      loadTemplates()
    }
  }, [activeTab])

  const loadCategories = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/task-categories')
      setCategories(response.data)
    } catch (error) {
      console.error('Ошибка загрузки категорий:', error)
      alert('Ошибка загрузки категорий')
    } finally {
      setLoading(false)
    }
  }

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/task-templates')
      setTemplates(response.data)
    } catch (error) {
      console.error('Ошибка загрузки шаблонов:', error)
      alert('Ошибка загрузки шаблонов')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingCategory) {
        await api.put(`/admin/task-categories/${editingCategory.id}`, categoryForm)
      } else {
        await api.post('/admin/task-categories', categoryForm)
      }
      setShowCategoryForm(false)
      setEditingCategory(null)
      setCategoryForm({ name: '', slug: '', description: '' })
      loadCategories()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Ошибка сохранения категории')
    }
  }

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Удалить категорию?')) return
    try {
      await api.delete(`/admin/task-categories/${id}`)
      loadCategories()
    } catch (error) {
      alert('Ошибка удаления категории')
    }
  }

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data = {
        ...templateForm,
        category_id: parseInt(templateForm.category_id),
        price: parseFloat(templateForm.price),
        completion_hours: parseInt(templateForm.completion_hours),
        work_day: templateForm.work_day ? parseInt(templateForm.work_day) : null,
      }
      if (editingTemplate) {
        await api.put(`/admin/task-templates/${editingTemplate.id}`, data)
      } else {
        await api.post('/admin/task-templates', data)
      }
      setShowTemplateForm(false)
      setEditingTemplate(null)
      setTemplateForm({
        title: '',
        description: '',
        category_id: '',
        price: '0',
        completion_hours: '1',
        work_day: '',
        is_primary: false,
        is_active: true,
      })
      loadTemplates()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Ошибка сохранения шаблона')
    }
  }

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm('Удалить шаблон?')) return
    try {
      await api.delete(`/admin/task-templates/${id}`)
      loadTemplates()
    } catch (error) {
      alert('Ошибка удаления шаблона')
    }
  }

  const editCategory = (category: TaskCategory) => {
    setEditingCategory(category)
    setCategoryForm({ name: category.name, slug: category.slug, description: category.description || '' })
    setShowCategoryForm(true)
  }

  const editTemplate = (template: TaskTemplate) => {
    setEditingTemplate(template)
    setTemplateForm({
      title: template.title,
      description: template.description || '',
      category_id: template.category_id.toString(),
      price: template.price.toString(),
      completion_hours: template.completion_hours.toString(),
      work_day: template.work_day?.toString() || '',
      is_primary: template.is_primary,
      is_active: template.is_active,
    })
    setShowTemplateForm(true)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Админ Панель</h1>
            <p className="text-gray-600 mt-1">Управление категориями и шаблонами тасков</p>
          </div>
        </div>
      </div>

      <div>
        {/* Tabs */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 inline-flex">
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-6 py-3 rounded-md font-medium text-sm transition-all ${
                activeTab === 'categories'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span>Категории тасков</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-6 py-3 rounded-md font-medium text-sm transition-all ${
                activeTab === 'templates'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Шаблоны тасков</span>
              </span>
            </button>
          </div>
        </div>

        {activeTab === 'categories' && (
          <div>
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Категории тасков</h2>
              <button
                onClick={() => {
                  setEditingCategory(null)
                  setCategoryForm({ name: '', slug: '', description: '' })
                  setShowCategoryForm(true)
                }}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center space-x-2 font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Добавить категорию</span>
              </button>
            </div>

            {showCategoryForm && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">
                    {editingCategory ? 'Редактировать категорию' : 'Новая категория'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowCategoryForm(false)
                      setEditingCategory(null)
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <form onSubmit={handleSaveCategory} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
                    <input
                      type="text"
                      required
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                    <input
                      type="text"
                      required
                      value={categoryForm.slug}
                      onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                    <textarea
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      rows={3}
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-medium"
                    >
                      Сохранить
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCategoryForm(false)
                        setEditingCategory(null)
                      }}
                      className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      Отмена
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">Загрузка...</div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Название</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Slug</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Описание</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {categories.map((category) => (
                      <tr key={category.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{category.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{category.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <span className="px-2 py-1 bg-gray-100 rounded-md font-mono text-xs">{category.slug}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{category.description || '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-3">
                            <button
                              onClick={() => editCategory(category)}
                              className="text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span>Редактировать</span>
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(category.id)}
                              className="text-red-600 hover:text-red-800 font-medium flex items-center space-x-1 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>Удалить</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'templates' && (
          <div>
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Шаблоны тасков</h2>
              <button
                onClick={() => {
                  setEditingTemplate(null)
                  setTemplateForm({
                    title: '',
                    description: '',
                    category_id: '',
                    price: '0',
                    completion_hours: '1',
                    work_day: '',
                    is_primary: false,
                    is_active: true,
                  })
                  setShowTemplateForm(true)
                }}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center space-x-2 font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Добавить шаблон</span>
              </button>
            </div>

            {showTemplateForm && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">
                    {editingTemplate ? 'Редактировать шаблон' : 'Новый шаблон'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowTemplateForm(false)
                      setEditingTemplate(null)
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <form onSubmit={handleSaveTemplate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Заголовок *</label>
                    <input
                      type="text"
                      required
                      value={templateForm.title}
                      onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                    <textarea
                      value={templateForm.description}
                      onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Категория *</label>
                      <select
                        required
                        value={templateForm.category_id}
                        onChange={(e) => setTemplateForm({ ...templateForm, category_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      >
                        <option value="">Выберите категорию</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Цена *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={templateForm.price}
                        onChange={(e) => setTemplateForm({ ...templateForm, price: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Срок выполнения (часы) *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={templateForm.completion_hours}
                        onChange={(e) => setTemplateForm({ ...templateForm, completion_hours: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">День работы (1-10)</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={templateForm.work_day}
                        onChange={(e) => setTemplateForm({ ...templateForm, work_day: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={templateForm.is_primary}
                        onChange={(e) => setTemplateForm({ ...templateForm, is_primary: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Первичный таск</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={templateForm.is_active}
                        onChange={(e) => setTemplateForm({ ...templateForm, is_active: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Активен</span>
                    </label>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-medium"
                    >
                      Сохранить
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTemplateForm(false)
                        setEditingTemplate(null)
                      }}
                      className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      Отмена
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Загрузка...</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Заголовок</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Категория</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Цена</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Часы</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">День</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Первичный</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {templates.map((template) => (
                      <tr key={template.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{template.id}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{template.title}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {template.category?.name ? (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
                              {template.category.name}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{template.price} ₽</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{template.completion_hours} ч</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {template.work_day ? (
                            <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-md text-xs font-medium">
                              День {template.work_day}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {template.is_primary ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs font-medium">Да</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-3">
                            <button
                              onClick={() => editTemplate(template)}
                              className="text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span>Редактировать</span>
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="text-red-600 hover:text-red-800 font-medium flex items-center space-x-1 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>Удалить</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

