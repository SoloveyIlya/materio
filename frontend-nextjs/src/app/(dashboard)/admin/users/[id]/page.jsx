'use client'

// React Imports
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

// MUI Imports
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import CustomAvatar from '@core/components/mui/Avatar'

// Component Imports
import UserLeftOverview from '@/views/apps/user/view/user-left-overview'
import UserRight from '@/views/apps/user/view/user-right'
import OverViewTab from '@/views/apps/user/view/user-right/overview'
import TestList from '@/views/apps/user/view/user-right/TestList'
import TaskList from '@/views/apps/user/view/user-right/TaskList'
import DocumentsTab from '@/views/apps/user/view/user-right/DocumentsTab'
import LogsTab from '@/views/apps/user/view/user-right/LogsTab'
import SecureTab from '@/views/apps/user/view/user-right/SecureTab'
import api from '@/lib/api'

const UserViewPage = () => {
  const params = useParams()
  const userId = params.id
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState(null)
  const [tests, setTests] = useState([])
  const [testResults, setTestResults] = useState([])
  const [requiredDocuments, setRequiredDocuments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      loadUser()
    }
  }, [userId])

  const loadUser = async () => {
    try {
      const response = await api.get(`/admin/users/${userId}`)
      setUser(response.data.user)
      setStats(response.data.stats)
      setTests(response.data.tests || [])
      setTestResults(response.data.user?.testResults || [])
      setRequiredDocuments(response.data.required_documents || [])
    } catch (error) {
      console.error('Error loading user:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Box sx={{ p: 6 }}>Loading...</Box>
  }

  if (!user) {
    return <Box sx={{ p: 6 }}>User not found</Box>
  }

  // Tab content list
  const tabContentList = {
    overview: (
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          {/* Project list - Assigned Admin */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 2 }}>Project list</Typography>
              <Divider sx={{ mb: 2 }} />
              {user?.administrator ? (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'action.hover'
                  }}
                >
                  <CustomAvatar size={40} sx={{ bgcolor: 'primary.main' }}>
                    {user.administrator.name || user.administrator.email ? (user.administrator.name || user.administrator.email).charAt(0).toUpperCase() : 'A'}
                  </CustomAvatar>
                  <div>
                    <Typography className='font-medium'>{user.administrator.name || user.administrator.email}</Typography>
                    <Typography variant='caption' color='text.secondary'>{user.administrator.email}</Typography>
                  </div>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'action.hover'
                  }}
                >
                  <Typography color='text.secondary'>Не закреплен</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TestList userId={userId} tests={tests} testResults={testResults} />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TaskList tasks={user?.tasks || []} userId={userId} />
        </Grid>
      </Grid>
    ),
    documents: <DocumentsTab userId={userId} requiredDocuments={requiredDocuments} userDocuments={user?.userDocuments || []} />,
    logs: <LogsTab userId={userId} />,
    secure: <SecureTab userId={userId} user={user} />
  }

  return (
    <Box sx={{ p: 6 }}>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, lg: 4, md: 5 }}>
          <UserLeftOverview user={user} stats={stats} />
        </Grid>
        <Grid size={{ xs: 12, lg: 8, md: 7 }}>
          <UserRight tabContentList={tabContentList} userId={userId} user={user} />
        </Grid>
      </Grid>
    </Box>
  )
}

export default UserViewPage
