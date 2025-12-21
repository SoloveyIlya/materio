// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import HorizontalWithSubtitle from '@/components/card-statistics/HorizontalWithSubtitle'
import api from '@/lib/api'

const UserListCards = ({ activeTab }) => {
  // States
  const [stats, setStats] = useState({
    total: 0,
    online: 0,
    moderators: 0,
    admins: 0
  })

  useEffect(() => {
    loadStats()
  }, [activeTab])

  const loadStats = async () => {
    try {
      const endpoint = activeTab === 0 ? '/admin/moderators' : '/admin/users' // Swapped: 0 is now Moderators
      const response = await api.get(endpoint)
      const users = response.data || []
      
      setStats({
        total: users.length,
        online: users.filter(u => u.is_online).length,
        moderators: users.filter(u => u.roles?.some(r => r.name === 'moderator')).length,
        admins: users.filter(u => u.roles?.some(r => r.name === 'admin')).length
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const data = activeTab === 0 ? [ // activeTab 0 is now Moderators
    {
      title: 'Total Moderators',
      stats: stats.total.toLocaleString(),
      avatarIcon: 'ri-group-line',
      avatarColor: 'primary',
      trend: 'positive',
      trendNumber: '0%',
      subtitle: 'All moderators'
    },
    {
      title: 'Online Moderators',
      stats: stats.online.toLocaleString(),
      avatarIcon: 'ri-user-follow-line',
      avatarColor: 'success',
      trend: 'positive',
      trendNumber: '0%',
      subtitle: 'Currently online'
    },
    {
      title: 'Active',
      stats: (stats.total - stats.online).toLocaleString(),
      avatarIcon: 'ri-user-search-line',
      avatarColor: 'info',
      trend: 'positive',
      trendNumber: '0%',
      subtitle: 'Offline moderators'
    },
    {
      title: 'Pending',
      stats: '0',
      avatarIcon: 'ri-time-line',
      avatarColor: 'warning',
      trend: 'positive',
      trendNumber: '0%',
      subtitle: 'Pending tasks'
    }
  ] : [ // activeTab 1 is now Users
    {
      title: 'Total Users',
      stats: stats.total.toLocaleString(),
      avatarIcon: 'ri-group-line',
      avatarColor: 'primary',
      trend: 'positive',
      trendNumber: '0%',
      subtitle: 'All registered users'
    },
    {
      title: 'Online Users',
      stats: stats.online.toLocaleString(),
      avatarIcon: 'ri-user-follow-line',
      avatarColor: 'success',
      trend: 'positive',
      trendNumber: '0%',
      subtitle: 'Currently online'
    },
    {
      title: 'Admins',
      stats: stats.admins.toLocaleString(),
      avatarIcon: 'ri-vip-crown-line',
      avatarColor: 'error',
      trend: 'positive',
      trendNumber: '0%',
      subtitle: 'Administrators'
    },
    {
      title: 'Moderators',
      stats: stats.moderators.toLocaleString(),
      avatarIcon: 'ri-user-star-line',
      avatarColor: 'warning',
      trend: 'positive',
      trendNumber: '0%',
      subtitle: 'Moderators'
    }
  ]

  return (
    <Grid container spacing={6}>
      {data.map((item, i) => (
        <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle {...item} />
        </Grid>
      ))}
    </Grid>
  )
}

export default UserListCards
