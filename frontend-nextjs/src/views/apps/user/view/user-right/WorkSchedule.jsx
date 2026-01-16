'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'

const DAYS_OF_WEEK = [
  { value: 'Sunday', label: 'Sunday' },
  { value: 'Monday', label: 'Monday' },
  { value: 'Tuesday', label: 'Tuesday' },
  { value: 'Wednesday', label: 'Wednesday' },
  { value: 'Thursday', label: 'Thursday' },
  { value: 'Friday', label: 'Friday' },
  { value: 'Saturday', label: 'Saturday' },
]

const WorkSchedule = ({ moderatorProfile, adminProfile }) => {
  const workSchedule = moderatorProfile?.work_schedule || adminProfile?.work_schedule || null

  if (!workSchedule || !Array.isArray(workSchedule) || workSchedule.length === 0) {
    return (
      <Card>
        <CardHeader title='Work Schedule' />
        <CardContent>
          <Typography color='text.secondary'>No work schedule set</Typography>
        </CardContent>
      </Card>
    )
  }

  const enabledDays = workSchedule.filter(item => item.enabled)

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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1
                }}
              >
                <Typography variant='subtitle1' className='font-medium'>
                  {dayLabel}
                </Typography>
                <Typography variant='body1' color='text.secondary'>
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

export default WorkSchedule
