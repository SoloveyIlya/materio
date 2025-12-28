'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

// Component Imports
import api from '@/lib/api'
import { showToast } from '@/utils/toast'

const ModeratorSecureTab = ({ user, onPasswordChange }) => {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      showToast.error('Please fill in all password fields')
      return
    }

    if (newPassword !== confirmPassword) {
      showToast.error('New passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      showToast.error('Password must be at least 8 characters long')
      return
    }

    try {
      setLoading(true)
      await api.put('/moderator/profile/password', {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword
      })

      showToast.success('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      
      if (onPasswordChange) {
        onPasswordChange()
      }
    } catch (error) {
      console.error('Error changing password:', error)
      showToast.error('Error changing password: ' + (error.response?.data?.message || error.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader title='Change Password' />
      <CardContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            fullWidth
            label='Current Password'
            type='password'
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={loading}
          />
          <TextField
            fullWidth
            label='New Password'
            type='password'
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading}
            helperText='Password must be at least 8 characters'
          />
          <TextField
            fullWidth
            label='Confirm New Password'
            type='password'
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
          />
          <Button
            variant='contained'
            onClick={handleChangePassword}
            disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            sx={{ alignSelf: 'flex-start' }}
          >
            Change Password
          </Button>
        </Box>
      </CardContent>
    </Card>
  )
}

export default ModeratorSecureTab

