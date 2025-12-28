'use client'

// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import api from '@/lib/api'
import TestList from '../user-right/TestList'
import TaskList from '../user-right/TaskList'

const ModeratorOverviewTab = ({ user }) => {
  const [tests, setTests] = useState([])
  const [testResults, setTestResults] = useState([])

  useEffect(() => {
    if (user?.id) {
      loadTests()
    }
  }, [user])

  const loadTests = async () => {
    try {
      const [testsResponse, userResponse] = await Promise.all([
        api.get('/moderator/tests'),
        api.get('/auth/user')
      ])
      setTests(testsResponse.data || [])
      setTestResults(userResponse.data?.testResults || [])
    } catch (error) {
      console.error('Error loading tests:', error)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <TestList userId={user?.id} tests={tests} testResults={testResults} />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TaskList tasks={user?.tasks || []} userId={user?.id} />
      </Grid>
    </Grid>
  )
}

export default ModeratorOverviewTab

