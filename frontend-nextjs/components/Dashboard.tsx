'use client'

import { useAuthStore } from '@/store/authStore'
import Layout from './Layout'
import AdminPanel from './AdminPanel'
import ModeratorPanel from './ModeratorPanel'

export default function Dashboard() {
  const { user } = useAuthStore()

  // Проверяем роль пользователя
  const isAdmin = user?.roles?.some((role) => role.name === 'admin')
  const isModerator = user?.roles?.some((role) => role.name === 'moderator')

  // Показываем соответствующую панель в зависимости от роли
  if (isAdmin) {
    return (
      <Layout>
        <AdminPanel />
      </Layout>
    )
  }

  if (isModerator) {
    return (
      <Layout>
        <ModeratorPanel />
      </Layout>
    )
  }

  // Если роль не определена, показываем базовую информацию
  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Панель управления</h2>
          <p className="text-gray-600 mb-4">
            Добро пожаловать, <span className="font-semibold">{user?.name}</span>!
          </p>
          <p className="text-sm text-gray-500">
            Роль не определена. Обратитесь к администратору для назначения роли.
          </p>
        </div>
      </div>
    </Layout>
  )
}
