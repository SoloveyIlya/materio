'use client'

import { useState, useEffect } from 'react'
import { Box, Grid } from '@mui/material'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import TestHeader from '@/components/tests/TestHeader'
import Tests from '@/components/tests/Tests'

export default function ModeratorAcademyPage() {
  const [tests, setTests] = useState([])
  const router = useRouter()

  useEffect(() => {
    loadTests()
  }, [])

  const loadTests = async () => {
    try {
      // Загружаем тесты через модераторский API
      const response = await api.get('/moderator/tests')
      setTests(response.data || [])
    } catch (error) {
      console.error('Error loading tests:', error)
      setTests([])
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
          />
        </Grid>
      </Grid>
    </Box>
  )
}

