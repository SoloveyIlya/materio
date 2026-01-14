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
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import api from '@/lib/api'
import { API_URL } from '@/lib/api'

const UserViewPage = () => {
  const params = useParams()
  const userId = params.id
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)
  const [tests, setTests] = useState([])
  const [testResults, setTestResults] = useState([])
  const [requiredDocuments, setRequiredDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [administrators, setAdministrators] = useState([])
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedAdminId, setSelectedAdminId] = useState('')

  useEffect(() => {
    if (userId) {
      loadUser()
      loadAdministrators()
    }
  }, [userId])

  const loadAdministrators = async () => {
    try {
      const response = await api.get('/admin/users?role=admin')
      setAdministrators(response.data || [])
    } catch (error) {
      console.error('Error loading administrators:', error)
      setAdministrators([])
    }
  }

  const handleAssignAdministrator = async (administratorId) => {
    try {
      await api.put(`/admin/users/${userId}`, {
        administrator_id: administratorId || null
      })
      loadUser() // Перезагружаем данные пользователя
      setAssignDialogOpen(false)
      setSelectedAdminId('')
    } catch (error) {
      console.error('Error assigning administrator:', error)
      alert('Error assigning administrator: ' + (error.response?.data?.message || error.message))
    }
  }

  const loadUser = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('Loading user with ID:', userId, 'Type:', typeof userId)
      
      if (!userId) {
        setError('User ID is missing')
        setUser(null)
        return
      }
      
      const response = await api.get(`/admin/users/${userId}`)
      console.log('API Response:', response.data)
      
      if (response.data && response.data.user) {
        setUser(response.data.user)
        setStats(response.data.stats)
        setTests(response.data.tests || [])
        setTestResults(response.data.user?.testResults || [])
        setRequiredDocuments(response.data.required_documents || [])
      } else {
        console.error('User data not found in response:', response.data)
        setError('User data not found in response')
        setUser(null)
      }
    } catch (error) {
      console.error('Error loading user:', error)
      console.error('Error status:', error.response?.status)
      console.error('Error response:', error.response?.data)
      console.error('Error message:', error.message)
      
      // Сохраняем детальную информацию об ошибке
      if (error.response?.status === 404) {
        setError(`User with ID ${userId} not found. ${error.response?.data?.message || ''}`)
      } else if (error.response?.status === 403) {
        setError(`Access forbidden. ${error.response?.data?.message || 'You may not have permission to view this user.'}`)
      } else if (error.response?.status === 401) {
        setError('Unauthorized. Please log in again.')
      } else {
        setError(`Error loading user: ${error.response?.data?.message || error.message}`)
      }
      
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser)
    loadUser() // Перезагружаем данные пользователя
  }

  const refreshUserData = async () => {
    try {
      if (!userId) return
      
      const response = await api.get(`/admin/users/${userId}`)
      if (response.data && response.data.user) {
        setUser(response.data.user)
        setStats(response.data.stats)
        setTests(response.data.tests || [])
        setTestResults(response.data.user?.testResults || [])
        setRequiredDocuments(response.data.required_documents || [])
      }
    } catch (error) {
      console.error('Error refreshing user data:', error)
    }
  }

  if (loading) {
    return <Box sx={{ p: 6 }}>Loading...</Box>
  }

  if (!user && !loading) {
    return (
      <Box sx={{ p: 6 }}>
        <Typography variant='h5' sx={{ mb: 2 }}>User not found</Typography>
        <Typography variant='body1' color='text.secondary' sx={{ mb: 2 }}>
          The user with ID {userId} could not be found. It may have been deleted or you may not have permission to view it.
        </Typography>
        {error && (
          <Typography variant='body2' color='error' sx={{ mt: 1 }}>
            Error: {error}
          </Typography>
        )}
        <Box component='div' sx={{ mt: 2 }}>
          <Typography variant='body2' color='text.secondary' component='div'>
            Please check:
            <ul>
              <li>That the user ID is correct</li>
              <li>That the user belongs to your domain</li>
              <li>That you have the necessary permissions</li>
            </ul>
          </Typography>
        </Box>
      </Box>
    )
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
                  <CustomAvatar 
                    size={40} 
                    src={(() => {
                      const avatar = user.administrator.avatar
                      if (!avatar) return null
                      if (avatar.startsWith('http')) return avatar
                      if (avatar.startsWith('/storage')) return `${API_URL}${avatar}`
                      return `${API_URL}/storage/${avatar}`
                    })()}
                    sx={{ bgcolor: 'primary.main' }}
                  >
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
                    justifyContent: 'space-between',
                    gap: 2,
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'action.hover'
                  }}
                >
                  <Typography color='text.secondary'>Not Assigned</Typography>
                  <IconButton
                    size='small'
                    onClick={() => {
                      setSelectedAdminId('')
                      setAssignDialogOpen(true)
                    }}
                    title='Assign to administrator'
                    sx={{ color: 'primary.main' }}
                  >
                    <i className='ri-pushpin-line' />
                  </IconButton>
                </Box>
              )}
              {user?.administrator && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <IconButton
                    size='small'
                    onClick={() => {
                      setSelectedAdminId(user.administrator.id)
                      setAssignDialogOpen(true)
                    }}
                    title='Change administrator'
                    sx={{ color: 'primary.main' }}
                  >
                    <i className='ri-pushpin-line' />
                  </IconButton>
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
    documents: <DocumentsTab userId={userId} requiredDocuments={requiredDocuments} userDocuments={user?.userDocuments || []} onDocumentsChange={refreshUserData} />,
    logs: <LogsTab userId={userId} />,
    secure: <SecureTab userId={userId} user={user} />
  }

  return (
    <Box sx={{ p: 6 }}>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, lg: 4, md: 5 }}>
          <UserLeftOverview user={user} stats={stats} onUserUpdate={handleUserUpdate} />
        </Grid>
        <Grid size={{ xs: 12, lg: 8, md: 7 }}>
          <UserRight tabContentList={tabContentList} userId={userId} user={user} />
        </Grid>
      </Grid>

      {/* Assign Administrator Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Assign to Administrator</DialogTitle>
        <DialogContent>
          <Typography variant='body2' sx={{ mb: 2 }}>
            Select an administrator to assign this user to:
          </Typography>
          {user && (
            <Typography variant='body2' sx={{ mb: 3, color: 'text.secondary' }}>
              User: <strong>{user.name || user.email}</strong>
            </Typography>
          )}
          <FormControl fullWidth>
            <InputLabel id='admin-select-label'>Administrator</InputLabel>
            <Select
              labelId='admin-select-label'
              id='admin-select'
              value={selectedAdminId}
              onChange={(e) => setSelectedAdminId(e.target.value)}
              label='Administrator'
            >
              <MenuItem value=''>
                <em>Not Assigned</em>
              </MenuItem>
              {administrators?.map((admin) => (
                <MenuItem key={admin.id} value={admin.id}>
                  {admin.name || admin.email}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => handleAssignAdministrator(selectedAdminId || null)}
            variant='contained'
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default UserViewPage
