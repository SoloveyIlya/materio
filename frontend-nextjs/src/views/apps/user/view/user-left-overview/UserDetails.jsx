'use client'

// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'

// Util Imports
import { getInitials } from '@/utils/getInitials'
import api from '@/lib/api'
import { API_URL } from '@/lib/api'

// Country from IP component - используем location из базы данных
const CountryFromIP = ({ location, ipAddress }) => {
  const [country, setCountry] = useState(() => {
    // Проверяем, что location не null, не undefined и не пустая строка
    if (location && location !== 'null' && location !== 'undefined') {
      return location
    }
    return '—'
  })

  useEffect(() => {
    // Если location из БД доступно и валидно, используем его
    if (location && location !== 'null' && location !== 'undefined') {
      setCountry(location)
      return
    }

    // Fallback: если location не определено, пытаемся получить через API
    // Но только если это не локальный/приватный IP
    if (!ipAddress || 
        ipAddress === '127.0.0.1' || 
        ipAddress.startsWith('172.') || 
        ipAddress.startsWith('192.168.') || 
        ipAddress.startsWith('10.')) {
      setCountry('—')
      return
    }

    const fetchCountry = async () => {
      try {
        const response = await fetch(`https://ipapi.co/${ipAddress}/country_name/`, {
          mode: 'cors',
          headers: {
            'Accept': 'text/plain'
          }
        })
        if (response.ok) {
          const data = await response.text()
          setCountry(data.trim() || '—')
        } else {
          // Fallback на другой сервис
          try {
            const fallbackResponse = await fetch(`https://ipapi.co/${ipAddress}/json/`, {
              mode: 'cors'
            })
            if (fallbackResponse.ok) {
              const data = await fallbackResponse.json()
              setCountry(data.country_name || '—')
            } else {
              setCountry('—')
            }
          } catch (fallbackError) {
            setCountry('—')
          }
        }
      } catch (error) {
        setCountry('—')
      }
    }

    fetchCountry()
  }, [location, ipAddress])

  return <Typography>{country}</Typography>
}

const UserDetails = ({ user, stats, onUserUpdate }) => {
  const [uploading, setUploading] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [workStartDialogOpen, setWorkStartDialogOpen] = useState(false)
  const [workStartDate, setWorkStartDate] = useState('')
  
  useEffect(() => {
    // Получаем текущего авторизованного пользователя
    const fetchCurrentUser = async () => {
      try {
        const response = await api.get('/auth/user')
        setCurrentUser(response.data)
      } catch (error) {
        console.error('Error fetching current user:', error)
      }
    }
    fetchCurrentUser()
  }, [])
  
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
      
      setWorkStartDialogOpen(false)
      setWorkStartDate('')
      alert('Work start date set successfully!')
    } catch (error) {
      console.error('Error setting work start date:', error)
      alert('Error: ' + (error.response?.data?.message || error.message))
    }
  }
  
  if (!user) return null

  const primaryRole = user.roles?.[0]?.name || 'User'
  const isAdmin = primaryRole === 'admin'
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

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('avatar', file)

      // Если админ обновляет свой собственный профиль, используем /admin/profile
      // Иначе используем /admin/users/{id} для обновления других пользователей
      const isOwnProfile = currentUser && user.id === currentUser.id && isAdmin
      const endpoint = isOwnProfile ? '/admin/profile' : `/admin/users/${user.id}`
      
      console.log('Uploading avatar to:', endpoint, 'isOwnProfile:', isOwnProfile)
      
      // Для FormData используем POST (бэкенд поддерживает POST с method spoofing)
      const response = await api.post(endpoint, formData)

      console.log('Avatar upload response:', response.data)

      if (onUserUpdate) {
        // Оба эндпоинта возвращают user в response.data.user
        const updatedUser = response.data.user || response.data
        console.log('Updated user:', updatedUser)
        onUserUpdate(updatedUser)
      }
    } catch (error) {
      console.error('Error uploading avatar:', error)
      console.error('Error response:', error.response?.data)
      alert('Ошибка загрузки аватара: ' + (error.response?.data?.message || error.message))
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <Card>
      <CardContent className='flex flex-col pbs-12 gap-6'>
        <div className='flex flex-col gap-6'>
          <div className='flex items-center justify-center flex-col gap-4'>
            <div className='flex flex-col items-center gap-4'>
              <Box sx={{ position: 'relative' }}>
                {user.avatar ? (
                  <CustomAvatar 
                    key={user.avatar} 
                    alt={user.name || user.email} 
                    src={getAvatarUrl(user.avatar)} 
                    variant='rounded' 
                    size={120}
                    onError={(e) => {
                      console.error('Avatar load error:', user.avatar, getAvatarUrl(user.avatar))
                      e.target.style.display = 'none'
                    }}
                  />
                ) : (
                  <CustomAvatar alt={user.name || user.email} variant='rounded' size={120}>
                    {getInitials(user.name || user.email || 'User')}
                  </CustomAvatar>
                )}
                {isAdmin && (
                  <Tooltip title='Upload Avatar'>
                    <IconButton
                      component='label'
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        '&:hover': {
                          bgcolor: 'primary.dark',
                        },
                      }}
                      size='small'
                      disabled={uploading}
                    >
                      <i className='ri-camera-line' />
                      <input
                        type='file'
                        hidden
                        accept='image/*'
                        onChange={handleAvatarUpload}
                      />
                    </IconButton>
                  </Tooltip>
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
              {!user.work_start_date && currentUser?.roles?.some(r => r.name === 'admin') && primaryRole === 'moderator' && (
                <Button 
                  size='small' 
                  variant='outlined' 
                  onClick={() => setWorkStartDialogOpen(true)}
                  sx={{ ml: 1 }}
                >
                  Set Date
                </Button>
              )}
            </div>
            <div className='flex items-center flex-wrap gap-x-1.5'>
              <Typography className='font-medium' color='text.primary'>
                IP Address:
              </Typography>
              <div className='flex items-center gap-1'>
                <Typography>{user.ip_address || '—'}</Typography>
                {user.ip_address && (
                  (user.ip_address.startsWith('142.251.') || 
                   user.ip_address.startsWith('172.217.') || 
                   user.ip_address.startsWith('216.58.') ||
                   user.ip_address.startsWith('104.16.') ||
                   user.ip_address.startsWith('104.17.') ||
                   user.ip_address.startsWith('104.18.')) && (
                    <Typography variant='caption' color='text.secondary' sx={{ fontStyle: 'italic' }}>
                      (proxy/VPN)
                    </Typography>
                  )
                )}
              </div>
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
              <CountryFromIP location={user.location} ipAddress={user.ip_address} />
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
              <Typography>
                {(() => {
                  if (!user.last_seen_at) return '—'
                  try {
                    // Проблема: Laravel возвращает строку в формате '2026-01-14 23:26:00' без указания timezone
                    // JavaScript парсит её как локальное время, а не UTC
                    // Решение: если строка не содержит 'Z' или '+', добавляем 'Z' чтобы указать что это UTC
                    let dateString = user.last_seen_at
                    
                    // Если строка в формате 'YYYY-MM-DD HH:mm:ss' без timezone, добавляем 'Z' (UTC)
                    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateString)) {
                      dateString = dateString.replace(' ', 'T') + 'Z'
                    }
                    
                    const date = new Date(dateString)
                    
                    // Если дата невалидна, возвращаем прочерк
                    if (isNaN(date.getTime())) {
                      console.error('Invalid date:', user.last_seen_at, 'parsed as:', dateString)
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
                    
                    const formatted = formatter.format(date)
                    
                    return formatted
                  } catch (error) {
                    console.error('Error formatting date:', error, 'user:', user)
                    // Fallback - показываем как есть
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
      </CardContent>
    </Card>
    
    {/* Dialog for setting work start date */}
    <Dialog open={workStartDialogOpen} onClose={() => setWorkStartDialogOpen(false)} maxWidth='xs' fullWidth>
      <DialogTitle>Set Work Start Date</DialogTitle>
      <DialogContent>
        <Typography variant='body2' sx={{ mb: 3, mt: 2 }}>
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
        <Button onClick={() => setWorkStartDialogOpen(false)}>Cancel</Button>
        <Button onClick={handleStartWork} variant='contained'>
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
    </>
  )
}

export default UserDetails
