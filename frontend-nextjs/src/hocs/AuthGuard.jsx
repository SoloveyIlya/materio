'use client'

// Next Imports
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Component Imports
import AuthRedirect from '@/components/AuthRedirect'

// Store Imports
import { useAuthStore } from '@/store/authStore'

export default function AuthGuard({ children }) {
  const router = useRouter()
  const { user, isLoading, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{user ? children : <AuthRedirect />}</>
}
