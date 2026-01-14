'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Box from '@mui/material/Box'

const ModeratorUserDetails = ({ user, stats, onUserUpdate }) => {
  if (!user) return null

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
            label={user.is_online ? 'Online' : 'Offline'}
            color={user.is_online ? 'success' : 'default'}
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
                
                const date = new Date(dateString)
                if (isNaN(date.getTime())) {
                  return '—'
                }
                
                const timezone = user.timezone || 'UTC'
                // Используем Intl.DateTimeFormat для конвертации UTC времени в указанный timezone
                const formatter = new Intl.DateTimeFormat('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                  timeZone: timezone
                })
                return formatter.format(date)
              } catch (error) {
                console.error('Error formatting date:', error)
                return new Date(user.last_seen_at).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                })
              }
            })()}
          </Typography>
        </div>
      </div>
    </div>
  )
}

export default ModeratorUserDetails

