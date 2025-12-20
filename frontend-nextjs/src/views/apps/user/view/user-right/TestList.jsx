'use client'

// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'

// Component Imports
import api from '@/lib/api'

const TestList = ({ userId, tests, testResults }) => {
  if (!tests || tests.length === 0) {
    return (
      <Card>
        <CardHeader title='Test List' />
        <CardContent>
          <Typography color='text.secondary'>No tests available</Typography>
        </CardContent>
      </Card>
    )
  }

  // Создаем мапу результатов тестов для быстрого поиска
  const resultsMap = {}
  if (testResults) {
    testResults.forEach(result => {
      resultsMap[result.test_id] = result
    })
  }

  return (
    <Card>
      <CardHeader title='Test List' />
      <CardContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {tests.map((test) => {
            const result = resultsMap[test.id]
            const isPassed = result?.is_passed || false
            
            return (
              <Box
                key={test.id}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1
                }}
              >
                <Box>
                  <Typography variant='subtitle1' className='font-medium'>
                    {test.title}
                  </Typography>
                  {test.level && (
                    <Chip label={test.level.name} size='small' variant='outlined' sx={{ mt: 1 }} />
                  )}
                </Box>
                <Typography variant='h6' color={isPassed ? 'success.main' : 'error.main'}>
                  {isPassed ? '✅' : '❌'}
                </Typography>
              </Box>
            )
          })}
        </Box>
      </CardContent>
    </Card>
  )
}

export default TestList

