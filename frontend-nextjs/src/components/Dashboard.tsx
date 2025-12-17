'use client'

import { useAuthStore } from '@/store/authStore'
import AdminPanel from './AdminPanel'
import ModeratorPanel from './ModeratorPanel'

export default function Dashboard() {
  const { user } = useAuthStore()

  // Check user role
  const isAdmin = user?.roles?.some((role) => role.name === 'admin')
  const isModerator = user?.roles?.some((role) => role.name === 'moderator')

  // Show appropriate panel based on role
  if (isAdmin) {
    return <AdminPanel />
  }

  if (isModerator) {
    return <ModeratorPanel />
  }

  // If role is not defined, show basic information
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Control Panel</h2>
        <p className="text-gray-600 mb-4">
          Welcome, <span className="font-semibold">{user?.name}</span>!
        </p>
        <p className="text-sm text-gray-500">
          Role is not defined. Please contact an administrator to assign a role.
        </p>
      </div>
    </div>
  )
}
