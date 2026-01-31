'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import api from '@/lib/api'
import { useWebSocketContext } from '@/contexts/WebSocketContext'

const ModeratorUserDetails = ({ user, stats, onUserUpdate, isAdminView = false }) => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [workStartDate, setWorkStartDate] = useState('')
  
  // Получаем актуальный онлайн-статус
  const { isUserOnline } = useWebSocketContext()
  const isOnline = isUserOnline(user?.id)
  
  if (!user) return null
  
  const handleStartWork = async () => {
    try {
      const dateToSet = workStartDate || new Date().toISOString().split('T')[0]
      await api.put(`/admin/users/${user.id}`, {
        work_start_date: dateToSet
      })
      
      if (onUserUpdate) {
        onUserUpdate({
          ...user,
          work_start_date: dateToSet
        })
      }
      
      setDialogOpen(false)
      setWorkStartDate('')
      alert('Work start date set successfully!')
    } catch (error) {
      console.error('Error setting work start date:', error)
      alert('Error: ' + (error.response?.data?.message || error.message))
    }
  }

  return (
    <div>
      <Typography variant='h5'>Details</Typography>
      <Divider className='mlb-4' />
      <div className='flex flex-col gap-2'>
        <div className='flex items-center flex-wrap gap-x-1.5'>
          <Typography className='font-medium' color='text.primary'>
            Status:
          </Typography>
          <Chip
            label={isOnline ? 'Online' : 'Offline'}
            color={isOnline ? 'success' : 'default'}
            size='small'
            variant='tonal'
          />
        </div>
        <div className='flex items-center flex-wrap gap-x-1.5'>
          <Typography className='font-medium' color='text.primary'>
            Email:
          </Typography>
          <Typography>{user.email}</Typography>
        </div>
        <div className='flex items-center flex-wrap gap-x-1.5'>
          <Typography className='font-medium' color='text.primary'>
            Timezone:
          </Typography>
          <Typography>{user.timezone || 'UTC'}</Typography>
        </div>
        <div className='flex items-center flex-wrap gap-x-1.5'>
          <Typography className='font-medium' color='text.primary'>
            Work Start Date:
          </Typography>
          <Typography>{user.work_start_date ? new Date(user.work_start_date).toLocaleDateString() : '—'}</Typography>
          {!user.work_start_date && isAdminView && (
            <Button 
              size='small' 
              variant='outlined' 
              onClick={() => setDialogOpen(true)}
              sx={{ ml: 1 }}
            >
              Set Date
            </Button>
          )}
        </div>
        {user.moderatorProfile && (
          <>
            <div className='flex items-center flex-wrap' style={{ gap: '8px' }}>
              <Typography className='font-medium' color='text.primary'>
                W-4:
              </Typography>
              {user.moderatorProfile.has_w4 ? (
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    bgcolor: 'success.main',
                    color: 'success.contrastText'
                  }}
                >
                  <i className='ri-check-line' style={{ fontSize: '14px' }} />
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    bgcolor: 'error.main',
                    color: 'error.contrastText'
                  }}
                >
                  <i className='ri-close-line' style={{ fontSize: '14px' }} />
                </Box>
              )}
            </div>
            <div className='flex items-center flex-wrap' style={{ gap: '8px' }}>
              <Typography className='font-medium' color='text.primary'>
                I-9:
              </Typography>
              {user.moderatorProfile.has_i9 ? (
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    bgcolor: 'success.main',
                    color: 'success.contrastText'
                  }}
                >
                  <i className='ri-check-line' style={{ fontSize: '14px' }} />
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    bgcolor: 'error.main',
                    color: 'error.contrastText'
                  }}
                >
                  <i className='ri-close-line' style={{ fontSize: '14px' }} />
                </Box>
              )}
            </div>
            <div className='flex items-center flex-wrap' style={{ gap: '8px' }}>
              <Typography className='font-medium' color='text.primary'>
                Direct:
              </Typography>
              {user.moderatorProfile.has_direct ? (
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    bgcolor: 'success.main',
                    color: 'success.contrastText'
                  }}
                >
                  <i className='ri-check-line' style={{ fontSize: '14px' }} />
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    bgcolor: 'error.main',
                    color: 'error.contrastText'
                  }}
                >
                  <i className='ri-close-line' style={{ fontSize: '14px' }} />
                </Box>
              )}
            </div>
          </>
        )}
        <div className='flex items-center flex-wrap gap-x-1.5'>
          <Typography className='font-medium' color='text.primary'>
            Last Activity:
          </Typography>
          <Typography>
            {(() => {
              if (!user.last_seen_at) return '—'
              try {
                // Если строка в формате 'YYYY-MM-DD HH:mm:ss' без timezone, добавляем 'Z' (UTC)
                let dateString = user.last_seen_at
                if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateString)) {
                  dateString = dateString.replace(' ', 'T') + 'Z'
                }
                return new Date(dateString).toLocaleString()
              } catch (e) {
                return '—'
              }
            })()}
          </Typography>
        </div>
      </div>
      
      {/* Dialog for setting work start date */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>Set Work Start Date</DialogTitle>
        <DialogContent>
          <Typography variant='body2' sx={{ mb: 3 }}>
            Set the date when this moderator started working. This is required before sending tasks.
          </Typography>
          <TextField
            fullWidth
            type='date'
            label='Work Start Date'
            value={workStartDate || new Date().toISOString().split('T')[0]}
            onChange={(e) => setWorkStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleStartWork} variant='contained'>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default ModeratorUserDetails
