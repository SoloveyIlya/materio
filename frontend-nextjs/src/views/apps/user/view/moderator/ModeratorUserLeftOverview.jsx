'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Box from '@mui/material/Box'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'
import ModeratorUserDetails from './ModeratorUserDetails'
import UserPlan from '../user-left-overview/UserPlan'
import WorkScheduleManager from '@/components/WorkScheduleManager'

// Util Imports
import { getInitials } from '@/utils/getInitials'
import { API_URL } from '@/lib/api'

const ModeratorUserLeftOverview = ({ user, stats, onUserUpdate }) => {
  if (!user) return null

  const primaryRole = user.roles?.[0]?.name || 'moderator'
  const roleColors = {
    admin: 'error',
    moderator: 'warning',
    user: 'primary'
  }

  const getAvatarUrl = (avatar) => {
    if (!avatar) return null
    if (avatar.startsWith('http')) return avatar
    if (avatar.startsWith('/storage')) return `${API_URL}${avatar}`
    return `${API_URL}/storage/${avatar}`
  }

  return (
    <div className='flex flex-col gap-6'>
      <Card>
        <CardContent className='flex flex-col pbs-12 gap-6'>
          <div className='flex flex-col gap-6'>
            <div className='flex items-center justify-center flex-col gap-4'>
              <div className='flex flex-col items-center gap-4'>
                <Box sx={{ position: 'relative' }}>
                  {user.avatar ? (
                    <CustomAvatar alt={user.name || user.email} src={getAvatarUrl(user.avatar)} variant='rounded' size={120} />
                  ) : (
                    <CustomAvatar alt={user.name || user.email} variant='rounded' size={120}>
                      {getInitials(user.name || user.email || 'User')}
                    </CustomAvatar>
                  )}
                </Box>
                <Typography variant='h5'>{user.name || user.email}</Typography>
              </div>
              <Chip label={primaryRole} color={roleColors[primaryRole] || 'primary'} size='small' variant='tonal' />
            </div>
            {stats && (
              <div className='flex items-center justify-around gap-4' style={{ flexWrap: 'nowrap' }}>
                <div className='flex items-center gap-4'>
                  <CustomAvatar variant='rounded' color='success' skin='light'>
                    <i className='ri-check-line' />
                  </CustomAvatar>
                  <div>
                    <Typography variant='h5'>{stats.completed_tasks || 0}</Typography>
                    <Typography>Completed</Typography>
                  </div>
                </div>
                <div className='flex items-center gap-4'>
                  <CustomAvatar variant='rounded' color='error' skin='light'>
                    <i className='ri-close-line' />
                  </CustomAvatar>
                  <div>
                    <Typography variant='h5'>{stats.pending_tasks + stats.in_progress_tasks || 0}</Typography>
                    <Typography>Not Completed</Typography>
                  </div>
                </div>
              </div>
            )}
          </div>
          <ModeratorUserDetails user={user} stats={stats} onUserUpdate={onUserUpdate} />
        </CardContent>
      </Card>
      <WorkScheduleManager 
        userId={user?.id} 
        userRole='moderator' 
        workSchedule={user?.moderatorProfile?.work_schedule}
        onUpdate={(updatedSchedule) => {
          if (onUserUpdate && user?.moderatorProfile) {
            onUserUpdate({
              ...user,
              moderatorProfile: {
                ...user.moderatorProfile,
                work_schedule: updatedSchedule
              }
            })
          }
        }}
        canEdit={true}
      />
      <UserPlan stats={stats} />
    </div>
  )
}

export default ModeratorUserLeftOverview
