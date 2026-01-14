'use client'

// React Imports
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'

// Components Imports
import CustomIconButton from '@core/components/mui/IconButton'
import DirectionalIcon from '@/components/DirectionalIcon'
import api from '@/lib/api'

const MyTasksCard = () => {
  const [taskStats, setTaskStats] = useState({
    new: 0,
    underReview: 0,
    completed: 0,
    total: 0
  })
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadTaskStats()
  }, [])

  const loadTaskStats = async () => {
    try {
      setLoading(true)
      const response = await api.get('/moderator/tasks')
      const tasks = response.data?.data || response.data || []

      const stats = {
        new: tasks.filter(t => t.status === 'pending').length,
        underReview: tasks.filter(t => t.status === 'under_admin_review' || t.status === 'sent_for_revision').length,
        completed: tasks.filter(t => t.status === 'approved' || t.status === 'completed_by_moderator').length,
        total: tasks.length
      }

      setTaskStats(stats)
    } catch (error) {
      console.error('Error loading task stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryClick = (status) => {
    // Переходим на страницу задач с фильтром по статусу
    const statusMap = {
      new: 'pending',
      underReview: 'under_admin_review',
      completed: 'approved'
    }
    const filterStatus = statusMap[status] || status
    router.push(`/moderator/tasks?status=${filterStatus}`)
  }

  const data = [
    { 
      label: 'New', 
      count: taskStats.new, 
      color: 'primary',
      status: 'new'
    },
    { 
      label: 'Under Review', 
      count: taskStats.underReview, 
      color: 'success',
      status: 'underReview'
    },
    { 
      label: 'Completed', 
      count: taskStats.completed, 
      color: 'error',
      status: 'completed'
    },
    { 
      label: 'Total', 
      count: taskStats.total, 
      color: 'info',
      status: 'all'
    }
  ]

  return (
    <Card className='bs-full'>
      <CardHeader title='My Tasks' />
      <CardContent className='flex flex-col gap-4'>
        {loading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className='flex items-center justify-between gap-4'>
                <div className='flex items-center gap-4'>
                  <Skeleton variant='rectangular' width={40} height={24} />
                  <Skeleton variant='text' width={100} height={24} />
                </div>
                <Skeleton variant='rectangular' width={32} height={32} />
              </div>
            ))}
          </>
        ) : (
          data.map((item, i) => (
            <div 
              key={i} 
              className='flex items-center justify-between gap-4 cursor-pointer hover:bg-actionHover rounded p-2 -m-2 transition-colors'
              onClick={() => handleCategoryClick(item.status)}
            >
              <div className='flex items-center gap-4'>
                <Chip 
                  label={item.count} 
                  color={item.color} 
                  size='small'
                  className='min-is-[40px] justify-center'
                />
                <Typography className='font-medium' color='text.primary'>
                  {item.label}
                </Typography>
              </div>
              <CustomIconButton variant='outlined' color='secondary' className='min-is-fit'>
                <DirectionalIcon ltrIconClass='ri-arrow-right-s-line' rtlIconClass='ri-arrow-left-s-line' />
              </CustomIconButton>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export default MyTasksCard

