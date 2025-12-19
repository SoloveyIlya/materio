// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'

// Third-party Imports
import classnames from 'classnames'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'
import api from '@/lib/api'

const TaskCard = ({ activeTab }) => {
  // States
  const [stats, setStats] = useState({
    pending: 0,
    under_review: 0,
    approved: 0,
    rejected: 0,
    revision: 0
  })

  // Hooks
  const isBelowMdScreen = useMediaQuery(theme => theme.breakpoints.down('md'))
  const isBelowSmScreen = useMediaQuery(theme => theme.breakpoints.down('sm'))

  useEffect(() => {
    loadStats()
  }, [activeTab])

  const loadStats = async () => {
    try {
      const response = await api.get('/admin/tasks')
      const tasks = response.data.data || response.data || []
      
      setStats({
        under_review: tasks.filter(t => t.status === 'under_admin_review').length,
        pending: tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
        approved: tasks.filter(t => t.status === 'approved').length,
        rejected: tasks.filter(t => t.status === 'rejected').length,
        revision: tasks.filter(t => t.status === 'sent_for_revision').length
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const data = [
    {
      value: stats.under_review,
      title: 'Under Review',
      icon: 'ri-eye-line'
    },
    {
      value: stats.pending,
      title: 'Pending',
      icon: 'ri-calendar-2-line'
    },
    {
      value: stats.approved,
      title: 'Approved',
      icon: 'ri-check-double-line'
    },
    {
      value: stats.rejected,
      title: 'Rejected',
      icon: 'ri-close-circle-line'
    },
    {
      value: stats.revision,
      title: 'Revision',
      icon: 'ri-refresh-line'
    }
  ]

  return (
    <Card>
      <CardContent>
        <Grid container spacing={6}>
          {data.map((item, index) => (
            <Grid
              size={{ xs: 12, sm: 6, md: 3 }}
              key={index}
              className={classnames({
                '[&:nth-of-type(odd)>div]:pie-6 [&:nth-of-type(odd)>div]:border-ie':
                  isBelowMdScreen && !isBelowSmScreen,
                '[&:not(:last-child)>div]:pie-6 [&:not(:last-child)>div]:border-ie': !isBelowMdScreen
              })}
            >
              <div className='flex justify-between gap-4'>
                <div className='flex flex-col items-start'>
                  <Typography variant='h4'>{item.value.toLocaleString()}</Typography>
                  <Typography>{item.title}</Typography>
                </div>
                <CustomAvatar variant='rounded' size={42} skin='light'>
                  <i className={classnames(item.icon, 'text-[26px]')} />
                </CustomAvatar>
              </div>
              {isBelowMdScreen && !isBelowSmScreen && index < data.length - 2 && (
                <Divider
                  className={classnames('mbs-6', {
                    'mie-6': index % 2 === 0
                  })}
                />
              )}
              {isBelowSmScreen && index < data.length - 1 && <Divider className='mbs-6' />}
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  )
}

export default TaskCard
