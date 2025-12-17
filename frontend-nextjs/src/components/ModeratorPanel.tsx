'use client'

// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'

// Third-party Imports
import axios from 'axios'

// Store Imports
import { useAuthStore } from '@/store/authStore'

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
      console.error('Error loading tasks:', error)
      alert('Error loading tasks')
    } finally {
      setLoading(false)
    }
  }

  const loadWorkDayInfo = async () => {
    try {
      const response = await api.get('/moderator/work-day')
      setWorkDayInfo(response.data)
    } catch (error) {
      console.error('Error loading work day info:', error)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [filterStatus])

  const handleStartWork = async () => {
    if (!confirm('Start work? Tasks for the current day will be automatically created.')) return
    try {
      setLoading(true)
      const response = await api.post('/moderator/tasks/start-work')
      alert(`Success! Created tasks: ${response.data.tasks?.length || 0}`)
      await loadTasks()
      await loadWorkDayInfo()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error starting work')
    } finally {
      setLoading(false)
    }
  }

  const handleStartTask = async (taskId: number) => {
    try {
      await api.post(`/moderator/tasks/${taskId}/start`)
      await loadTasks()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error starting task')
    }
  }

  const handleCompleteTask = async (taskId: number) => {
    if (!confirm('Complete task?')) return
    try {
      await api.post(`/moderator/tasks/${taskId}/complete`)
      await loadTasks()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error completing task')
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending'
      case 'in_progress':
        return 'In Progress'
      case 'completed':
        return 'Completed'
      default:
        return status
    }
  }

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Box className='flex items-center justify-between flex-wrap gap-4'>
          <Box>
            <Typography variant='h4' className='mbe-1'>
              Moderator Panel
            </Typography>
            <Typography>
              Manage tasks and work days
            </Typography>
          </Box>
          {workDayInfo && (
            <Card variant='outlined' className='border-primary'>
              <CardContent>
                <Typography variant='body2' color='text.secondary' className='mbe-2'>
                  Current Work Day
                </Typography>
                <Typography variant='h4' color='primary.main'>
                  {workDayInfo.current_work_day ? `Day ${workDayInfo.current_work_day}` : 'Not Started'}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Box className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
              <Box>
                <Typography variant='h4' className='mbe-2'>
                  My Tasks
                </Typography>
                {workDayInfo && (
                  <Box className='flex flex-col gap-1'>
                    {workDayInfo.work_start_date ? (
                      <>
                        <Typography variant='body2' color='text.secondary'>
                          <span className='font-medium'>Work Start Date:</span>{' '}
                          {new Date(workDayInfo.work_start_date).toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </Typography>
                        {workDayInfo.timezone && (
                          <Typography variant='caption' color='text.disabled'>
                            Timezone: {workDayInfo.timezone}
                          </Typography>
                        )}
                      </>
                    ) : (
                      <Typography variant='body2' color='warning.main' className='font-medium'>
                        Work has not started yet
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
              <Button
                variant='contained'
                color='success'
                startIcon={loading ? <CircularProgress size={16} /> : <i className='ri-play-line' />}
                onClick={handleStartWork}
                disabled={loading}
              >
                {workDayInfo?.work_start_date ? 'Update Day Tasks' : 'Start Work'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Tabs
              value={filterStatus === 'all' ? 0 : filterStatus === 'pending' ? 1 : filterStatus === 'in_progress' ? 2 : 3}
              onChange={(e, newValue) => {
                const statuses = ['all', 'pending', 'in_progress', 'completed']
                setFilterStatus(statuses[newValue])
              }}
            >
              <Tab label='All' />
              <Tab label='Pending' />
              <Tab label='In Progress' />
              <Tab label='Completed' />
            </Tabs>
          </CardContent>
        </Card>
      </Grid>

      {loading ? (
        <Grid size={{ xs: 12 }}>
          <Box className='flex items-center justify-center p-12'>
            <CircularProgress />
          </Box>
        </Grid>
      ) : tasks.length === 0 ? (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box className='flex flex-col items-center justify-center p-12 text-center'>
                <i className='ri-file-list-3-line text-6xl text-textSecondary mbe-4' />
                <Typography variant='h5' className='mbe-2'>
                  No Tasks
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  Click "Start Work" to create tasks
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ) : (
        <>
          {tasks.map((task) => (
            <Grid key={task.id} size={{ xs: 12 }} md={6} lg={4}>
              <Card className='h-full'>
                <CardHeader
                  title={
                    <Box className='flex items-start justify-between gap-2'>
                      <Typography variant='h6' className='flex-1'>
                        {task.title}
                      </Typography>
                      <Chip
                        label={getStatusText(task.status)}
                        size='small'
                        variant='tonal'
                        color={
                          task.status === 'completed'
                            ? 'success'
                            : task.status === 'in_progress'
                              ? 'primary'
                              : 'warning'
                        }
                      />
                    </Box>
                  }
                />
                <Divider />
                <CardContent>
                  {task.description && (
                    <Typography variant='body2' color='text.secondary' className='mbe-4 line-clamp-3'>
                      {task.description}
                    </Typography>
                  )}
                  <Box className='flex flex-col gap-2 mbe-4'>
                    {task.category && (
                      <Box className='flex items-center gap-2'>
                        <Typography variant='caption' color='text.secondary'>
                          Category:
                        </Typography>
                        <Typography variant='body2' className='font-medium'>
                          {task.category.name}
                        </Typography>
                      </Box>
                    )}
                    {task.work_day && (
                      <Box className='flex items-center gap-2'>
                        <Typography variant='caption' color='text.secondary'>
                          Work Day:
                        </Typography>
                        <Typography variant='body2' className='font-medium'>
                          {task.work_day}
                        </Typography>
                      </Box>
                    )}
                    <Box className='flex items-center gap-2'>
                      <Typography variant='caption' color='text.secondary'>
                        Price:
                      </Typography>
                      <Typography variant='body2' className='font-medium'>
                        {task.price} ₽
                      </Typography>
                    </Box>
                    <Box className='flex items-center gap-2'>
                      <Typography variant='caption' color='text.secondary'>
                        Duration:
                      </Typography>
                      <Typography variant='body2' className='font-medium'>
                        {task.completion_hours} h
                      </Typography>
                    </Box>
                    {task.assigned_at && (
                      <Typography variant='caption' color='text.disabled'>
                        Assigned: {new Date(task.assigned_at).toLocaleString('en-US')}
                      </Typography>
                    )}
                  </Box>
                  <Divider className='mbe-4' />
                  {task.status === 'pending' && (
                    <Button
                      fullWidth
                      variant='contained'
                      startIcon={<i className='ri-play-line' />}
                      onClick={() => handleStartTask(task.id)}
                    >
                      Start
                    </Button>
                  )}
                  {task.status === 'in_progress' && (
                    <Button
                      fullWidth
                      variant='contained'
                      color='success'
                      startIcon={<i className='ri-check-line' />}
                      onClick={() => handleCompleteTask(task.id)}
                    >
                      Complete
                    </Button>
                  )}
                  {task.status === 'completed' && (
                    <Chip
                      label='Completed'
                      color='success'
                      variant='tonal'
                      icon={<i className='ri-checkbox-circle-line' />}
                      fullWidth
                      className='justify-center'
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </>
      )}
    </Grid>
  )
}

