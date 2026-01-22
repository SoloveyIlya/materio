'use client'

// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'

import api from '@/lib/api'

const DAYS_SHORT = [
  { value: 'Sunday', label: 'Su', fullLabel: 'Sunday' },
  { value: 'Monday', label: 'Mo', fullLabel: 'Monday' },
  { value: 'Tuesday', label: 'Tu', fullLabel: 'Tuesday' },
  { value: 'Wednesday', label: 'We', fullLabel: 'Wednesday' },
  { value: 'Thursday', label: 'Th', fullLabel: 'Thursday' },
  { value: 'Friday', label: 'Fr', fullLabel: 'Friday' },
  { value: 'Saturday', label: 'Sa', fullLabel: 'Saturday' },
]

// Convert 24h time to 12h AM/PM format
const convertTo12Hour = (time24) => {
  if (!time24) return ''
  const [hours, minutes] = time24.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

// Convert 12h AM/PM time to 24h format
const convertTo24Hour = (time12) => {
  if (!time12) return ''
  const match = time12.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return time12
  
  let [, hours, minutes, ampm] = match
  hours = parseInt(hours, 10)
  
  if (ampm.toUpperCase() === 'PM' && hours !== 12) {
    hours += 12
  } else if (ampm.toUpperCase() === 'AM' && hours === 12) {
    hours = 0
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes}`
}

const WorkScheduleManager = ({ userId, userRole, workSchedule: initialWorkSchedule, onUpdate, canEdit = true }) => {
  const [workSchedule, setWorkSchedule] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Динамически вычисляем hasSchedule на основе текущего состояния workSchedule
  const hasSchedule = workSchedule && Array.isArray(workSchedule) && 
    workSchedule.some(item => item.enabled && item.start_time && item.end_time)

  useEffect(() => {
    if (initialWorkSchedule && Array.isArray(initialWorkSchedule) && initialWorkSchedule.length > 0) {
      const scheduleMap = new Map(initialWorkSchedule.map(item => [item.day, item]))
      const completeSchedule = DAYS_SHORT.map(day => {
        const existing = scheduleMap.get(day.value)
        return existing || {
          day: day.value,
          enabled: false,
          start_time: '',
          end_time: '',
          break_hours: '',
        }
      })
      setWorkSchedule(completeSchedule)
    } else {
      const defaultSchedule = DAYS_SHORT.map(day => ({
        day: day.value,
        enabled: false,
        start_time: '',
        end_time: '',
        break_hours: '',
      }))
      setWorkSchedule(defaultSchedule)
    }
  }, [initialWorkSchedule])

  const handleTimeChange = (dayValue, field, value) => {
    setWorkSchedule(prev => 
      prev.map(item => 
        item.day === dayValue 
          ? { ...item, [field]: value, enabled: true }
          : item
      )
    )
  }

  const handleBreakChange = (dayValue, value) => {
    setWorkSchedule(prev => 
      prev.map(item => 
        item.day === dayValue 
          ? { ...item, break_hours: value }
          : item
      )
    )
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      const rolePrefix = userRole === 'admin' ? 'admin' : 'moderator'
      
      // Filter out days without times and convert to 24h format for backend
      const scheduleToSave = workSchedule
        .filter(item => item.start_time && item.end_time)
        .map(item => ({
          day: item.day,
          enabled: true,
          start_time: item.start_time,
          end_time: item.end_time,
          break_hours: item.break_hours || null,
        }))
      
      const response = await api.put(`/${rolePrefix}/profile/work-schedule`, {
        work_schedule: scheduleToSave,
      })
      
      // Обновляем локальное состояние сразу после успешного сохранения
      if (response.data && response.data.work_schedule) {
        const updatedSchedule = response.data.work_schedule
        const scheduleMap = new Map(updatedSchedule.map(item => [item.day, item]))
        const completeSchedule = DAYS_SHORT.map(day => {
          const existing = scheduleMap.get(day.value)
          return existing || {
            day: day.value,
            enabled: false,
            start_time: '',
            end_time: '',
            break_hours: '',
          }
        })
        setWorkSchedule(completeSchedule)
      }
      
      if (onUpdate) {
        onUpdate(scheduleToSave)
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
    const enabledDays = workSchedule.filter(item => item.enabled && item.start_time && item.end_time)
    if (enabledDays.length === 0) {
      return null
    }
    
    return enabledDays.map(item => {
      const dayLabel = DAYS_SHORT.find(d => d.value === item.day)?.label || item.day.substring(0, 2)
      
      // Format times to 12-hour with AM/PM
      const startTime = convertTo12Hour(item.start_time)
      const endTime = convertTo12Hour(item.end_time)
      
      return (
        <Box
          key={item.day}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 1.5,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'action.hover'
          }}
        >
          <Typography variant='body2' className='font-medium'>
            {dayLabel}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant='body2' color='text.secondary'>
              {startTime} - {endTime}
            </Typography>
            {item.break_hours && (
              <Typography variant='caption' color='text.secondary' sx={{ fontStyle: 'italic' }}>
                (Break: {item.break_hours}h)
              </Typography>
            )}
          </Box>
        </Box>
      )
    })
  }

  return (
    <>
      <Card>
        <CardHeader title='Work Schedule' />
        <CardContent>
          {!hasSchedule ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
              <Typography color='text.secondary'>No work schedule set</Typography>
              {canEdit && (
                <Button 
                  variant='contained' 
                  size='small'
                  startIcon={<i className='ri-add-line' />}
                  onClick={() => setDialogOpen(true)}
                >
                  Add
                </Button>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {formatScheduleDisplay()}
              </Box>
              {canEdit && (
                <Button 
                  variant='outlined' 
                  size='small'
                  startIcon={<i className='ri-edit-line' />}
                  onClick={() => setDialogOpen(true)}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Edit
                </Button>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth='sm'
        fullWidth
        PaperProps={{
          sx: {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            m: 0
          }
        }}
      >
        <DialogTitle>Work Schedule</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {DAYS_SHORT.map((day) => {
              const scheduleItem = workSchedule.find(item => item.day === day.value) || {
                day: day.value,
                enabled: false,
                start_time: '',
                end_time: '',
                break_hours: '',
              }
              
              return (
                <Box
                  key={day.value}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: scheduleItem.start_time && scheduleItem.end_time ? 'action.hover' : 'transparent',
                  }}
                >
                  <Typography 
                    variant='subtitle2' 
                    sx={{ 
                      minWidth: 35, 
                      fontWeight: 'bold',
                      textAlign: 'center' 
                    }}
                  >
                    {day.label}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField
                        label='Start'
                        type='time'
                        value={scheduleItem.start_time || ''}
                        onChange={(e) => handleTimeChange(day.value, 'start_time', e.target.value)}
                        size='small'
                        sx={{ flex: 1 }}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ 
                          step: 900, // 15 minutes
                        }}
                      />
                      <Typography variant='body2' color='text.secondary'>-</Typography>
                      <TextField
                        label='Finish'
                        type='time'
                        value={scheduleItem.end_time || ''}
                        onChange={(e) => handleTimeChange(day.value, 'end_time', e.target.value)}
                        size='small'
                        sx={{ flex: 1 }}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ 
                          step: 900, // 15 minutes
                        }}
                      />
                    </Box>
                    
                    {(scheduleItem.start_time || scheduleItem.end_time) && (
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <TextField
                          label='Break (hours)'
                          type='number'
                          value={scheduleItem.break_hours || ''}
                          onChange={(e) => handleBreakChange(day.value, e.target.value)}
                          size='small'
                          placeholder='0'
                          inputProps={{ 
                            min: 0, 
                            max: 8, 
                            step: 0.5 
                          }}
                          sx={{ width: '100%' }}
                        />
                      </Box>
                    )}
                  </Box>
                </Box>
              )
            })}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDialogOpen(false)} color='secondary'>
            Cancel
          </Button>
          <Button onClick={handleSave} variant='contained' disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default WorkScheduleManager
