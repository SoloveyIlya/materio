'use client'

// React Imports
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

// MUI Imports
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'

// Component Imports
import UserLeftOverview from '@/views/apps/user/view/user-left-overview'
import UserRight from '@/views/apps/user/view/user-right'
import OverViewTab from '@/views/apps/user/view/user-right/overview'
import api from '@/lib/api'

const UserViewPage = () => {
  const params = useParams()
  const userId = params.id
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      loadUser()
    }
  }, [userId])

  const loadUser = async () => {
    try {
      const response = await api.get(`/admin/users/${userId}`)
      setUser(response.data.user)
      setStats(response.data.stats)
    } catch (error) {
      console.error('Error loading user:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Box sx={{ p: 6 }}>Loading...</Box>
  }

  if (!user) {
    return <Box sx={{ p: 6 }}>User not found</Box>
  }

  // Tab content list
  const tabContentList = {
    overview: <OverViewTab userId={userId} />
  }

  return (
    <Box sx={{ p: 6 }}>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, lg: 4, md: 5 }}>
          <UserLeftOverview user={user} stats={stats} />
        </Grid>
        <Grid size={{ xs: 12, lg: 8, md: 7 }}>
          <UserRight tabContentList={tabContentList} />
        </Grid>
      </Grid>
    </Box>
  )
}

export default UserViewPage
