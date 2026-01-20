'use client'

// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

// Component Imports
import ModeratorUserLeftOverview from '@/views/apps/user/view/moderator/ModeratorUserLeftOverview'
import ModeratorUserRight from '@/views/apps/user/view/moderator/ModeratorUserRight'
import ModeratorOverviewTab from '@/views/apps/user/view/moderator/ModeratorOverviewTab'
import ModeratorDocumentsTab from '@/views/apps/user/view/moderator/ModeratorDocumentsTab'
import ModeratorSecureTab from '@/views/apps/user/view/moderator/ModeratorSecureTab'
import api from '@/lib/api'

const ModeratorProfilePage = () => {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState(null)
  const [requiredDocuments, setRequiredDocuments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUser()
    loadRequiredDocuments()
  }, [])

  const loadUser = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      }
      const response = await api.get('/auth/user')
      const userData = response.data
      setUser(userData)

      // Загружаем статистику для модератора
      const dashboardResponse = await api.get('/moderator/dashboard')
      setStats({
        completed_tasks: dashboardResponse.data.completed_tasks || 0,
        in_progress_tasks: dashboardResponse.data.in_progress_tasks || 0,
        total_tasks: dashboardResponse.data.total_tasks || 0,
        pending_tasks: 0
      })
    } catch (error) {
      console.error('Error loading user:', error)
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  const loadRequiredDocuments = async () => {
    try {
      const documentsResponse = await api.get('/moderator/required-documents')
      setRequiredDocuments(documentsResponse.data || [])
    } catch (error) {
      console.error('Error loading required documents:', error)
      setRequiredDocuments([])
    }
  }

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser)
    loadUser()
  }

  if (loading) {
    return <Box sx={{ p: 6 }}>Loading...</Box>
  }

  if (!user) {
    return (
      <Box sx={{ p: 6 }}>
        <Typography variant='h5'>Error loading profile</Typography>
      </Box>
    )
  }

  // Tab content list
  const tabContentList = {
    overview: <ModeratorOverviewTab user={user} />,
    documents: <ModeratorDocumentsTab requiredDocuments={requiredDocuments} userDocuments={user?.userDocuments || []} onDocumentUpload={async () => {
      await loadUser(false)
      await loadRequiredDocuments()
    }} />,
    secure: <ModeratorSecureTab user={user} onPasswordChange={loadUser} />
  }

  return (
    <Box sx={{ p: 6 }}>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, lg: 4, md: 5 }}>
          <ModeratorUserLeftOverview user={user} stats={stats} onUserUpdate={handleUserUpdate} />
        </Grid>
        <Grid size={{ xs: 12, lg: 8, md: 7 }}>
          <ModeratorUserRight tabContentList={tabContentList} user={user} />
        </Grid>
      </Grid>
    </Box>
  )
}

export default ModeratorProfilePage

