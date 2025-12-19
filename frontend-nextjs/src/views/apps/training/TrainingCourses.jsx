// React Imports
import { useState, useEffect } from 'react'

// Next Imports
import { useRouter } from 'next/navigation'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

// Component Imports
import DirectionalIcon from '@/components/DirectionalIcon'
import api from '@/lib/api'

const TrainingCourses = ({ searchValue }) => {
  // States
  const [tasks, setTasks] = useState([])
  const router = useRouter()

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      const response = await api.get('/moderator/training')
      setTasks(response.data?.tasks || [])
    } catch (error) {
      console.error('Error loading training tasks:', error)
      setTasks([])
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (!searchValue) return true
    return task.title?.toLowerCase().includes(searchValue.toLowerCase())
  })

  if (filteredTasks.length === 0) {
    return (
      <Card>
        <CardContent className='text-center p-10'>
          <Typography color='text.secondary'>No test tasks available</Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className='flex flex-col gap-6'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div>
            <Typography variant='h5'>Test Tasks</Typography>
            <Typography>Total {filteredTasks.length} test task(s)</Typography>
          </div>
        </div>
        <Grid container spacing={6}>
          {filteredTasks.map((task) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={task.id}>
              <div className='border rounded bs-full'>
                <div className='flex flex-col gap-4 p-5'>
                  <div className='flex items-center justify-between'>
                    <Chip
                      label={task.status === 'approved' ? 'Approved' : task.status}
                      variant='tonal'
                      size='small'
                      color={task.status === 'approved' ? 'success' : 'default'}
                    />
                    {task.category && (
                      <Chip
                        label={task.category.name}
                        variant='outlined'
                        size='small'
                        color='primary'
                      />
                    )}
                  </div>
                  <div className='flex flex-col gap-1'>
                    <Typography variant='h5' className='hover:text-primary cursor-pointer'>
                      {task.title}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {task.description || 'No description'}
                    </Typography>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Typography variant='body2'><strong>Price:</strong> ${task.price || '0.00'}</Typography>
                  </div>
                  {task.result && (
                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Typography variant='subtitle2' gutterBottom>Your Result:</Typography>
                      <Typography variant='body2'>
                        Status: {task.status === 'approved' ? 'Approved ✓' : task.status}
                      </Typography>
                      {task.result.admin_comment && (
                        <Typography variant='body2' sx={{ mt: 1 }}>
                          <strong>Admin Comment:</strong> {task.result.admin_comment}
                        </Typography>
                      )}
                    </Box>
                  )}
                  <div className='flex flex-wrap gap-4'>
                    <Button
                      fullWidth
                      variant='outlined'
                      endIcon={
                        <DirectionalIcon ltrIconClass='ri-arrow-right-line' rtlIconClass='ri-arrow-left-line' />
                      }
                      onClick={() => router.push(`/moderator/tasks?task_id=${task.id}`)}
                      className='is-auto flex-auto'
                    >
                      {task.result ? 'View Result' : 'Start Task'}
                    </Button>
                  </div>
                </div>
              </div>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  )
}

export default TrainingCourses
