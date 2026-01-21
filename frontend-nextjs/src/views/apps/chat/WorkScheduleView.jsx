'use client'

// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'

const DAYS_OF_WEEK = [
  { value: 'Sunday', label: 'Sun' },
  { value: 'Monday', label: 'Mon' },
  { value: 'Tuesday', label: 'Tue' },
  { value: 'Wednesday', label: 'Wed' },
  { value: 'Thursday', label: 'Thu' },
  { value: 'Friday', label: 'Fri' },
  { value: 'Saturday', label: 'Sat' },
]

const WorkScheduleView = ({ workSchedule }) => {
  const [schedule, setSchedule] = useState([])

  useEffect(() => {
    if (workSchedule && Array.isArray(workSchedule) && workSchedule.length > 0) {
      // Убеждаемся, что все дни присутствуют
      const scheduleMap = new Map(workSchedule.map(item => [item.day, item]))
      const completeSchedule = DAYS_OF_WEEK.map(day => {
        const existing = scheduleMap.get(day.value)
        return existing || {
          day: day.value,
          enabled: false,
          start_time: '',
          end_time: '',
        }
      })
      setSchedule(completeSchedule)
    } else {
      // Инициализируем пустой график для всех дней
      const defaultSchedule = DAYS_OF_WEEK.map(day => ({
        day: day.value,
        enabled: false,
        start_time: '',
        end_time: '',
      }))
      setSchedule(defaultSchedule)
    }
  }, [workSchedule])

  const enabledDays = schedule.filter(item => item.enabled)

  if (enabledDays.length === 0) {
    return (
      <Card>
        <CardHeader title='Work Schedule' />
        <CardContent>
          <Typography color='text.secondary'>No work schedule set</Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader title='Work Schedule' />
      <CardContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {enabledDays.map((item) => {
            const dayLabel = DAYS_OF_WEEK.find(d => d.value === item.day)?.label || item.day
            const timeStr = item.start_time && item.end_time 
              ? `${item.start_time} - ${item.end_time}`
              : 'No time set'
            
            return (
              <Box 
                key={item.day}
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.5,
                  borderRadius: 1,
                }}
              >
                <Chip 
                  label={dayLabel} 
                  size='small' 
                  color='primary' 
                  variant='outlined'
                />
                <Typography variant='body2' color='text.secondary'>
                  {timeStr}
                </Typography>
              </Box>
            )
          })}
        </Box>
      </CardContent>
    </Card>
  )
}

export default WorkScheduleView
