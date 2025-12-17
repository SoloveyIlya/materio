'use client'

// Next Imports
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

const AuthRedirect = () => {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const loginPath = '/login'
    const currentPath = pathname || '/'
    
    // Redirect to login page if not already there
    if (currentPath !== loginPath) {
      router.push(`${loginPath}?redirectTo=${encodeURIComponent(currentPath)}`)
    }
  }, [router, pathname])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Redirecting to login page...</p>
      </div>
    </div>
  )
}

export default AuthRedirect
