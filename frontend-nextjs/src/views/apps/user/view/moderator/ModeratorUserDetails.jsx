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
          <Typography>{user.last_seen_at ? new Date(user.last_seen_at).toLocaleString() : '—'}</Typography>
        </div>
      </div>
    </div>
  )
}

export default ModeratorUserDetails

