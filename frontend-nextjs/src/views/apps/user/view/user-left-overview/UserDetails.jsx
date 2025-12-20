// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'

// Util Imports
import { getInitials } from '@/utils/getInitials'

const UserDetails = ({ user, stats }) => {
  if (!user) return null

  const primaryRole = user.roles?.[0]?.name || 'User'
  const roleColors = {
    admin: 'error',
    moderator: 'warning',
    user: 'primary'
  }

  return (
    <Card>
      <CardContent className='flex flex-col pbs-12 gap-6'>
        <div className='flex flex-col gap-6'>
          <div className='flex items-center justify-center flex-col gap-4'>
            <div className='flex flex-col items-center gap-4'>
              {user.avatar ? (
                <CustomAvatar alt={user.name || user.email} src={user.avatar} variant='rounded' size={120} />
              ) : (
                <CustomAvatar alt={user.name || user.email} variant='rounded' size={120}>
                  {getInitials(user.name || user.email || 'User')}
                </CustomAvatar>
              )}
              <Typography variant='h5'>{user.name || user.email}</Typography>
            </div>
            <Chip label={primaryRole} color={roleColors[primaryRole] || 'primary'} size='small' variant='tonal' />
          </div>
          {stats && (
            <div className='flex items-center justify-around flex-wrap gap-4'>
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
          {user.administrator && (
            <div>
              <Typography variant='h6' sx={{ mb: 2 }}>Assigned Admin</Typography>
              <Divider sx={{ mb: 2 }} />
              <div className='flex items-center gap-2'>
                <CustomAvatar size={40}>
                  {getInitials(user.administrator.name || user.administrator.email || 'Admin')}
                </CustomAvatar>
                <div>
                  <Typography className='font-medium'>{user.administrator.name || user.administrator.email}</Typography>
                  <Typography variant='caption' color='text.secondary'>{user.administrator.email}</Typography>
                </div>
              </div>
            </div>
          )}
        </div>
        <div>
          <Typography variant='h5'>Details</Typography>
          <Divider className='mlb-4' />
          <div className='flex flex-col gap-2'>
            <div className='flex items-center flex-wrap gap-x-1.5'>
              <Typography className='font-medium' color='text.primary'>
                Email:
              </Typography>
              <Typography>{user.email}</Typography>
            </div>
            <div className='flex items-center flex-wrap gap-x-1.5'>
              <Typography className='font-medium' color='text.primary'>
                ID:
              </Typography>
              <Typography>{user.id}</Typography>
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
            <div className='flex items-center flex-wrap gap-x-1.5'>
              <Typography className='font-medium' color='text.primary'>
                IP Address:
              </Typography>
              <Typography>{user.ip_address || '—'}</Typography>
            </div>
            <div className='flex items-center flex-wrap gap-x-1.5'>
              <Typography className='font-medium' color='text.primary'>
                Platform:
              </Typography>
              <Typography>{user.platform || '—'}</Typography>
            </div>
            <div className='flex items-center flex-wrap gap-x-1.5'>
              <Typography className='font-medium' color='text.primary'>
                Country (from IP):
              </Typography>
              <Typography>{user.location || user.ip_address || '—'}</Typography>
            </div>
            {user.moderatorProfile && (
              <>
                <div className='flex items-center flex-wrap gap-x-1.5'>
                  <Typography className='font-medium' color='text.primary'>
                    W-4:
                  </Typography>
                  <Typography>{user.moderatorProfile.has_w4 ? '✅' : '❌'}</Typography>
                </div>
                <div className='flex items-center flex-wrap gap-x-1.5'>
                  <Typography className='font-medium' color='text.primary'>
                    I-9:
                  </Typography>
                  <Typography>{user.moderatorProfile.has_i9 ? '✅' : '❌'}</Typography>
                </div>
                <div className='flex items-center flex-wrap gap-x-1.5'>
                  <Typography className='font-medium' color='text.primary'>
                    Direct:
                  </Typography>
                  <Typography>{user.moderatorProfile.has_direct ? '✅' : '❌'}</Typography>
                </div>
              </>
            )}
            {user.registration_password && (
              <div className='flex items-center flex-wrap gap-x-1.5'>
                <Typography className='font-medium' color='text.primary'>
                  Registration Password:
                </Typography>
                <Typography sx={{ fontFamily: 'monospace' }}>{user.registration_password}</Typography>
              </div>
            )}
            <div className='flex items-center flex-wrap gap-x-1.5'>
              <Typography className='font-medium' color='text.primary'>
                Last Activity:
              </Typography>
              <Typography>{user.last_seen_at ? new Date(user.last_seen_at).toLocaleString() : '—'}</Typography>
            </div>
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
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default UserDetails
