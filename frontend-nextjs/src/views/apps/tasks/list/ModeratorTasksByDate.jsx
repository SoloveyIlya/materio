'use client'

// React Imports
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

// MUI Imports
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'

// Component Imports
import api from '@/lib/api'

// Component for individual task card
const TaskCard = ({ task, onStart }) => {
  const [deadlineTimer, setDeadlineTimer] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const calculateTimer = () => {
      if (task.due_at && (task.status === 'pending' || task.status === 'in_progress')) {
        const dueDate = new Date(task.due_at).getTime()
        const now = Date.now()
        const seconds = Math.floor((dueDate - now) / 1000)
        return seconds > 0 ? seconds : 0
      }
      return task.deadline_timer || null
    }

    setDeadlineTimer(calculateTimer())

    const interval = setInterval(() => {
      const timer = calculateTimer()
      setDeadlineTimer(timer)
      if (timer <= 0) {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [task])

  const formatTime = (dateString) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDeadline = (seconds) => {
    if (!seconds || seconds < 0) return 'Expired'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours}h ${minutes}m ${secs}s`
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'default',
      in_progress: 'info',
      completed_by_moderator: 'warning',
      under_admin_review: 'primary',
      approved: 'success',
      rejected: 'error',
      sent_for_revision: 'warning',
    }
    return colors[status] || 'default'
  }

  return (
    <Card 
      sx={{ 
        mb: 2, 
        cursor: 'pointer',
        '&:hover': { boxShadow: 3 }
      }}
      onClick={() => router.push(`/moderator/tasks/${task.id}`)}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Time received */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant='body2' color='text.secondary' fontWeight='medium'>
              Received: {formatTime(task.created_at)}
            </Typography>
            {task.status && (
              <Chip 
                label={task.status.replace('_', ' ')} 
                size='small' 
                color={getStatusColor(task.status)}
                variant='outlined'
              />
            )}
          </Box>

          {/* Title */}
          <Typography variant='subtitle1' fontWeight='bold' sx={{ minHeight: '3em', lineHeight: 1.4 }}>
            {task.title || 'Untitled Task'}
          </Typography>

          {/* Deadline Timer */}
          {deadlineTimer !== null && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
              <i className='ri-time-line' style={{ fontSize: '18px', color: deadlineTimer > 0 ? 'inherit' : 'error' }} />
              <Typography 
                variant='body1' 
                color={deadlineTimer > 0 ? 'text.primary' : 'error'}
                fontWeight='bold'
              >
                {formatDeadline(deadlineTimer)}
              </Typography>
            </Box>
          )}

          {/* Category */}
          {task.category && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <i className='ri-folder-line' style={{ fontSize: '18px' }} />
              <Typography variant='body1' color='text.secondary' fontWeight='medium'>
                {task.category.name || task.subgroup || '—'}
              </Typography>
            </Box>
          )}

          {/* Price */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <i className='ri-money-dollar-circle-line' style={{ fontSize: '20px', color: 'success.main' }} />
            <Typography variant='h6' fontWeight='bold' color='success.main'>
              ${task.price || '0.00'}
            </Typography>
          </Box>

          {/* Start Button */}
          {task.status === 'pending' && (
            <Button
              variant='contained'
              size='medium'
              fullWidth
              onClick={(e) => {
                e.stopPropagation()
                onStart(task)
              }}
              sx={{ mt: 1, py: 1.5, fontWeight: 'bold' }}
            >
              Start execution
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}

// Main component
const ModeratorTasksByDate = () => {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const response = await api.get('/moderator/tasks')
      const tasksData = response.data?.data || response.data || []
      setTasks(tasksData)
    } catch (error) {
      console.error('Error loading tasks:', error)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  const handleStart = async (task) => {
    try {
      await api.post(`/moderator/tasks/${task.id}/start`)
      loadTasks() // Reload tasks after starting
    } catch (error) {
      console.error('Error starting task:', error)
      alert('Error starting task')
    }
  }

  // Group tasks by work_day (Day 1, Day 2, etc.)
  const tasksByWorkDay = useMemo(() => {
    // Create default columns for Day 1-5
    const defaultColumns = [1, 2, 3, 4, 5]
    
    // Group tasks by work_day
    const grouped = {}
    
    tasks.forEach(task => {
      const workDay = task.work_day
      if (workDay === null || workDay === undefined) {
        // Tasks without work_day go to Day 1 by default
        if (!grouped[1]) {
          grouped[1] = []
        }
        grouped[1].push(task)
      } else {
        const dayNum = Number(workDay)
        if (!grouped[dayNum]) {
          grouped[dayNum] = []
        }
        grouped[dayNum].push(task)
      }
    })

    // Return columns with tasks, sorted by work_day
    return defaultColumns.map(dayNum => ({
      day: dayNum,
      tasks: (grouped[dayNum] || []).sort((a, b) => {
        // Sort by created_at within each day
        const dateA = new Date(a.created_at || a.assigned_at || 0)
        const dateB = new Date(b.created_at || b.assigned_at || 0)
        return dateA - dateB
      })
    }))
  }, [tasks])

  // Calculate date for each work day based on work_start_date
  const getDateForDay = (dayNum) => {
    // For now, use current date + day offset
    // In a real scenario, this should be based on user's work_start_date
    const date = new Date()
    date.setDate(date.getDate() + dayNum - 1)
    return date
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'numeric',
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading tasks...</Typography>
      </Box>
    )
  }

  if (tasksByWorkDay.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color='text.secondary'>No tasks available</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ px: 3, pb: 3 }}>
      <Box sx={{ display: 'flex', gap: 2.5, overflowX: 'auto', pb: 2 }}>
        {tasksByWorkDay.map((dayGroup) => {
          const dayDate = getDateForDay(dayGroup.day)
          return (
            <Paper 
              key={dayGroup.day}
              elevation={0}
              sx={{ 
                p: 3, 
                minWidth: '280px',
                maxWidth: '320px',
                width: '100%',
                minHeight: '400px',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Day Header */}
              <Box sx={{ mb: 3, pb: 2, borderBottom: '2px solid', borderColor: 'primary.main' }}>
                <Typography 
                  variant='h5' 
                  sx={{ 
                    fontWeight: 'bold',
                    mb: 0.5
                  }}
                >
                  Day {dayGroup.day}
                </Typography>
                <Typography 
                  variant='caption' 
                  color='text.secondary'
                >
                  {formatDate(dayDate)}
                </Typography>
              </Box>

              {/* Tasks List */}
              <Box 
                sx={{ 
                  flex: 1,
                  maxHeight: 'calc(100vh - 300px)', 
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  '&::-webkit-scrollbar': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: 'transparent',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: '#ccc',
                    borderRadius: '3px',
                  },
                }}
              >
                {dayGroup.tasks.length === 0 ? (
                  <Typography variant='caption' color='text.secondary' sx={{ textAlign: 'center', display: 'block', py: 3 }}>
                    No tasks
                  </Typography>
                ) : (
                  dayGroup.tasks.map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onStart={handleStart}
                    />
                  ))
                )}
              </Box>
            </Paper>
          )
        })}
      </Box>
    </Box>
  )
}

export default ModeratorTasksByDate

