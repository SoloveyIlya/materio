'use client'

// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'

// Component Imports
import api from '@/lib/api'

const DAYS_OF_WEEK = [
  { value: 'Sunday', label: 'Sunday' },
  { value: 'Monday', label: 'Monday' },
  { value: 'Tuesday', label: 'Tuesday' },
  { value: 'Wednesday', label: 'Wednesday' },
  { value: 'Thursday', label: 'Thursday' },
  { value: 'Friday', label: 'Friday' },
  { value: 'Saturday', label: 'Saturday' },
]

const WorkScheduleEditor = ({ userId, userRole, workSchedule: initialWorkSchedule, onUpdate }) => {
  const [workSchedule, setWorkSchedule] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialWorkSchedule && Array.isArray(initialWorkSchedule) && initialWorkSchedule.length > 0) {
      // Убеждаемся, что все дни присутствуют
      const scheduleMap = new Map(initialWorkSchedule.map(item => [item.day, item]))
      const completeSchedule = DAYS_OF_WEEK.map(day => {
        const existing = scheduleMap.get(day.value)
        return existing || {
          day: day.value,
          enabled: false,
          start_time: '',
          end_time: '',
        }
      })
      setWorkSchedule(completeSchedule)
    } else {
      // Инициализируем пустой график для всех дней
      const defaultSchedule = DAYS_OF_WEEK.map(day => ({
        day: day.value,
        enabled: false,
        start_time: '',
        end_time: '',
      }))
      setWorkSchedule(defaultSchedule)
    }
  }, [initialWorkSchedule])

  const handleDayToggle = (dayValue) => {
    setWorkSchedule(prev => 
      prev.map(item => 
        item.day === dayValue 
          ? { ...item, enabled: !item.enabled }
          : item
      )
    )
  }

  const handleTimeChange = (dayValue, field, value) => {
    setWorkSchedule(prev => 
      prev.map(item => 
        item.day === dayValue 
          ? { ...item, [field]: value }
          : item
      )
    )
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      const rolePrefix = userRole === 'admin' ? 'admin' : 'moderator'
      await api.put(`/${rolePrefix}/profile/work-schedule`, {
        work_schedule: workSchedule,
      })
      
      if (onUpdate) {
        onUpdate(workSchedule)
      }
      
      setDialogOpen(false)
    } catch (error) {
      console.error('Error saving work schedule:', error)
      alert('Error saving work schedule: ' + (error.response?.data?.message || error.message))
    } finally {
      setLoading(false)
    }
  }

  const formatScheduleDisplay = () => {
    const enabledDays = workSchedule.filter(item => item.enabled)
    if (enabledDays.length === 0) {
      return 'Not set'
    }
    
    return enabledDays.map(item => {
      const dayLabel = DAYS_OF_WEEK.find(d => d.value === item.day)?.label || item.day
      const timeStr = item.start_time && item.end_time 
        ? `${item.start_time} - ${item.end_time}`
        : 'No time set'
      return `${dayLabel}: ${timeStr}`
    }).join(', ')
  }

  return (
    <>
      <Card>
        <CardHeader 
          title='Work Schedule'
          action={
            <IconButton size='small' onClick={() => setDialogOpen(true)}>
              <i className='ri-edit-line' />
            </IconButton>
          }
        />
        <CardContent>
          <Typography variant='body2' color='text.secondary'>
            {formatScheduleDisplay()}
          </Typography>
        </CardContent>
      </Card>

      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>Edit Work Schedule</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            {DAYS_OF_WEEK.map((day) => {
              const scheduleItem = workSchedule.find(item => item.day === day.value) || {
                day: day.value,
                enabled: false,
                start_time: '',
                end_time: '',
              }
              
              return (
                <Box
                  key={day.value}
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: scheduleItem.enabled ? 'action.hover' : 'transparent',
                  }}
                >
                  <Grid container spacing={2} alignItems='center'>
                    <Grid size={{ xs: 12, sm: 3 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={scheduleItem.enabled}
                            onChange={() => handleDayToggle(day.value)}
                          />
                        }
                        label={day.label}
                      />
                    </Grid>
                    {scheduleItem.enabled && (
                      <>
                        <Grid size={{ xs: 6, sm: 4 }}>
                          <TextField
                            label='Start Time'
                            type='time'
                            value={scheduleItem.start_time || ''}
                            onChange={(e) => handleTimeChange(day.value, 'start_time', e.target.value)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ step: 300 }} // 5 minutes
                          />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4 }}>
                          <TextField
                            label='End Time'
                            type='time'
                            value={scheduleItem.end_time || ''}
                            onChange={(e) => handleTimeChange(day.value, 'end_time', e.target.value)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ step: 300 }} // 5 minutes
                          />
                        </Grid>
                      </>
                    )}
                  </Grid>
                </Box>
              )
            })}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant='contained' disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default WorkScheduleEditor
