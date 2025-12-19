// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Timeline from '@mui/lab/Timeline'
import TimelineItem from '@mui/lab/TimelineItem'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import TimelineConnector from '@mui/lab/TimelineConnector'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineDot from '@mui/lab/TimelineDot'

// Component Imports
import UserTasksTable from './UserTasksTable'
import api from '@/lib/api'

const OverViewTab = ({ userId }) => {
  const [tasks, setTasks] = useState([])
  const [activityLogs, setActivityLogs] = useState([])

  useEffect(() => {
    if (userId) {
      loadUserTasks()
      loadActivityLogs()
    }
  }, [userId])

  const loadUserTasks = async () => {
    try {
      const response = await api.get(`/admin/users/${userId}/tasks`)
      setTasks(response.data || [])
    } catch (error) {
      console.error('Error loading user tasks:', error)
      setTasks([])
    }
  }

  const loadActivityLogs = async () => {
    try {
      const response = await api.get(`/admin/activity-logs?user_id=${userId}&limit=5`)
      setActivityLogs(response.data?.data || response.data || [])
    } catch (error) {
      console.error('Error loading activity logs:', error)
      setActivityLogs([])
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <UserTasksTable tasks={tasks} />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='User Activity Timeline' />
          <CardContent>
            {activityLogs.length > 0 ? (
              <Timeline>
                {activityLogs.map((log, index) => (
                  <TimelineItem key={log.id || index}>
                    <TimelineSeparator>
                      <TimelineDot color={log.event_type === 'action' ? 'primary' : 'success'} />
                      {index < activityLogs.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent>
                      <div className='flex flex-wrap items-center justify-between gap-x-2 mbe-2.5'>
                        <Typography className='font-medium' color='text.primary'>
                          {log.action}
                        </Typography>
                        <Typography variant='caption'>
                          {new Date(log.created_at).toLocaleString()}
                        </Typography>
                      </div>
                      <Typography className='mbe-2'>{log.route || '—'}</Typography>
                      {log.ip_address && (
                        <Typography variant='body2' color='text.secondary'>
                          IP: {log.ip_address}
                        </Typography>
                      )}
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            ) : (
              <Typography color='text.secondary' className='text-center'>
                No activity logs available
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default OverViewTab
