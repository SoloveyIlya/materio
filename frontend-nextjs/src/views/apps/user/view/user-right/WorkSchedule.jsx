'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

const WorkSchedule = ({ moderatorProfile }) => {
  const formatTime = (time) => {
    if (!time) return null
    // Если время в формате строки "HH:MM:SS" или "HH:MM"
    if (typeof time === 'string') {
      const parts = time.split(':')
      if (parts.length >= 2) {
        const hours = parts[0].padStart(2, '0')
        const minutes = parts[1].padStart(2, '0')
        return `${hours}:${minutes}`
      }
      return time
    }
    return time
  }

  const startTime = moderatorProfile ? formatTime(moderatorProfile.task_start_time) : null
  const endTime = moderatorProfile ? formatTime(moderatorProfile.task_end_time) : null
  const timezone = moderatorProfile?.task_timezone
  const minInterval = moderatorProfile?.task_min_interval
  const maxInterval = moderatorProfile?.task_max_interval

  return (
    <Card>
      <CardHeader title='Work Schedule' />
      <CardContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant='subtitle2' color='text.secondary'>
                Work Hours
              </Typography>
              <Typography variant='body1' className='font-medium'>
                {startTime && endTime ? `${startTime} - ${endTime}` : 'Not set'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant='subtitle2' color='text.secondary'>
                Timezone
              </Typography>
              <Typography variant='body1' className='font-medium'>
                {timezone || 'Not set'}
              </Typography>
            </Box>
            {minInterval && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant='subtitle2' color='text.secondary'>
                  Min Interval
                </Typography>
                <Typography variant='body1' className='font-medium'>
                  {minInterval} min
                </Typography>
              </Box>
            )}
            {maxInterval && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant='subtitle2' color='text.secondary'>
                  Max Interval
                </Typography>
                <Typography variant='body1' className='font-medium'>
                  {maxInterval} min
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default WorkSchedule
