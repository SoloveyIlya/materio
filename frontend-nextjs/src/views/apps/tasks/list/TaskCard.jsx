// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'

// Third-party Imports
import classnames from 'classnames'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'
import api from '@/lib/api'

const TaskCard = ({ activeTab, selectedAdminId }) => {
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
  }, [activeTab, selectedAdminId])

  const loadStats = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedAdminId) {
        params.append('administrator_id', selectedAdminId)
      }
      const url = `/admin/tasks${params.toString() ? `?${params.toString()}` : ''}`
      const response = await api.get(url)
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
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: { xs: 2, sm: 3, md: 3 },
            '@media (max-width: 600px)': {
              flexDirection: 'column'
            }
          }}
        >
          {data.map((item, index) => (
            <Box
              key={index}
              sx={{
                flex: { 
                  xs: '1 1 100%', 
                  sm: '1 1 calc(50% - 12px)', 
                  md: '1 1 0',
                  lg: '1 1 0'
                },
                maxWidth: { md: '20%', lg: '20%' },
                minWidth: 0,
                ...(index < data.length - 1 && {
                  '@media (min-width: 900px)': {
                    borderRight: '1px solid',
                    borderColor: 'divider',
                    paddingRight: 3
                  }
                })
              }}
              className={classnames({
                '[&:nth-of-type(odd)>div]:pie-6 [&:nth-of-type(odd)>div]:border-ie':
                  isBelowMdScreen && !isBelowSmScreen
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
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  )
}

export default TaskCard
