'use client'

// React Imports
import { useEffect, useRef, useState } from 'react'

// MUI Imports
import { useMediaQuery } from '@mui/material'
import Backdrop from '@mui/material/Backdrop'

// Third-party Imports
import classnames from 'classnames'

// Component Imports
import SupportSidebar from '@/views/apps/support/SupportSidebar'
import SupportContent from '@/views/apps/support/SupportContent'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'
import { useAuthStore } from '@/store/authStore'

// Util Imports
import { commonLayoutClasses } from '@layouts/utils/layoutClasses'
import api from '@/lib/api'

const SupportWrapper = () => {
  // States
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [backdropOpen, setBackdropOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState('new')
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [reload, setReload] = useState(false)

  // Refs
  const isInitialMount = useRef(true)

  // Hooks
  const { settings } = useSettings()
  const { user: currentUser } = useAuthStore()
  const isBelowLgScreen = useMediaQuery(theme => theme.breakpoints.down('lg'))
  const isBelowMdScreen = useMediaQuery(theme => theme.breakpoints.down('md'))
  const isBelowSmScreen = useMediaQuery(theme => theme.breakpoints.down('sm'))

  // Load tickets
  useEffect(() => {
    loadTickets()
  }, [])

  const loadTickets = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/support')
      setTickets(response.data?.data || response.data || [])
    } catch (error) {
      console.error('Error loading tickets:', error)
      setTickets([])
    } finally {
      setLoading(false)
      isInitialMount.current = false
    }
  }

  // Handle backdrop on click
  const handleBackdropClick = () => {
    setSidebarOpen(false)
    setBackdropOpen(false)
  }

  // Hide backdrop when left sidebar is closed
  useEffect(() => {
    if (backdropOpen && !sidebarOpen) {
      setBackdropOpen(false)
    }
  }, [sidebarOpen, backdropOpen])

  // Hide backdrop when screen size is above md
  useEffect(() => {
    if (backdropOpen && !isBelowMdScreen) {
      setBackdropOpen(false)
    }

    if (sidebarOpen && !isBelowMdScreen) {
      setSidebarOpen(false)
    }
  }, [isBelowMdScreen, backdropOpen, sidebarOpen])

  return (
    <div
      className={classnames(commonLayoutClasses.contentHeightFixed, 'flex is-full overflow-hidden rounded relative', {
        border: settings.skin === 'bordered',
        'shadow-md': settings.skin !== 'bordered'
      })}
    >
      <SupportSidebar
        isBelowLgScreen={isBelowLgScreen}
        isBelowMdScreen={isBelowMdScreen}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        tickets={tickets}
        currentUser={currentUser}
      />
      <Backdrop open={backdropOpen} onClick={handleBackdropClick} className='absolute z-10' />
      <SupportContent
        isInitialMount={isInitialMount.current}
        isBelowLgScreen={isBelowLgScreen}
        isBelowMdScreen={isBelowMdScreen}
        isBelowSmScreen={isBelowSmScreen}
        reload={reload}
        tickets={tickets}
        activeCategory={activeCategory}
        setSidebarOpen={setSidebarOpen}
        setBackdropOpen={setBackdropOpen}
        currentUser={currentUser}
        onReplySent={loadTickets}
      />
    </div>
  )
}

export default SupportWrapper
