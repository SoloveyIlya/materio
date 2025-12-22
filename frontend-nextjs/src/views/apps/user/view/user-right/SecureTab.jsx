'use client'

// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import InputAdornment from '@mui/material/InputAdornment'

// Component Imports
import api from '@/lib/api'

const SecureTab = ({ userId, user }) => {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchingPassword, setFetchingPassword] = useState(false)

  // Загружаем и обновляем пароль
  useEffect(() => {
    const loadPassword = async () => {
      if (!userId) return
      try {
        setFetchingPassword(true)
        const response = await api.get(`/admin/users/${userId}`)
        const userPassword = response.data.user?.registration_password
        // Устанавливаем пароль, даже если он null (будет пустая строка)
        setPassword(userPassword || '')
      } catch (error) {
        console.error('Error loading password:', error)
      } finally {
        setFetchingPassword(false)
      }
    }
    loadPassword()
  }, [userId])

  // Также обновляем пароль при изменении user
  useEffect(() => {
    if (user?.registration_password !== undefined) {
      setPassword(user.registration_password || '')
    }
  }, [user])

  const handleUpdatePassword = async () => {
    if (!password || !password.trim()) {
      return // Не сохраняем пустой пароль
    }
    try {
      setLoading(true)
      const response = await api.put(`/admin/users/${userId}`, {
        password: password.trim()
      })
      // Обновляем пароль после успешного обновления
      if (response.data?.registration_password) {
        setPassword(response.data.registration_password)
      } else if (response.data?.user?.registration_password) {
        setPassword(response.data.user.registration_password)
      }
      // Перезагружаем данные пользователя
      const userResponse = await api.get(`/admin/users/${userId}`)
      if (userResponse.data.user?.registration_password) {
        setPassword(userResponse.data.user.registration_password)
      }
    } catch (error) {
      console.error('Error updating password:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(password)
    // Можно показать уведомление об успешном копировании
  }

  return (
    <Card>
      <CardHeader title='Change Password' />
      <CardContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            fullWidth
            label='Password'
            type='text'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={fetchingPassword}
            placeholder={fetchingPassword ? 'Loading...' : password ? password : 'Enter password'}
            sx={{
              '& input': {
                fontFamily: 'monospace'
              }
            }}
            slotProps={{
              input: {
                endAdornment: password && (
                  <InputAdornment position='end'>
                    <IconButton onClick={handleCopyPassword} edge='end' title='Copy password'>
                      <i className='ri-file-copy-line' />
                    </IconButton>
                  </InputAdornment>
                )
              }
            }}
          />
          <Button
            variant='contained'
            onClick={handleUpdatePassword}
            disabled={loading || !password}
            sx={{ alignSelf: 'flex-start' }}
          >
            Update Password
          </Button>
        </Box>
      </CardContent>
    </Card>
  )
}

export default SecureTab

