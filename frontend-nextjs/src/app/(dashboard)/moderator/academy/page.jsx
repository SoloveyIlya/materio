'use client'

import { useState, useEffect } from 'react'
import { Box, Grid } from '@mui/material'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import TestHeader from '@/components/tests/TestHeader'
import Tests from '@/components/tests/Tests'

export default function ModeratorAcademyPage() {
  const [tests, setTests] = useState([])
  const [testResults, setTestResults] = useState([])
  const router = useRouter()

  useEffect(() => {
    loadTests()
  }, [])

  const loadTests = async () => {
    try {
      // Загружаем тесты и результаты тестов пользователя
      const [testsResponse, userResponse] = await Promise.all([
        api.get('/moderator/tests'),
        api.get('/auth/user')
      ])
      setTests(testsResponse.data || [])
      setTestResults(userResponse.data?.testResults || [])
    } catch (error) {
      console.error('Error loading tests:', error)
      setTests([])
      setTestResults([])
    }
  }

  const handleStartTest = (test) => {
    // Переходим на страницу прохождения теста
    router.push(`/moderator/academy/test/${test.id}`)
  }

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <TestHeader 
            onAddTest={null}
            onManageLevels={null}
            showButtons={false}
            title="Academy"
            subtitle="Complete training tests to improve your skills and gain access to the platform"
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Tests 
            testData={tests} 
            onEditTest={null}
            onStartTest={handleStartTest}
            readOnly={true}
            testResults={testResults}
          />
        </Grid>
      </Grid>
    </Box>
  )
}

