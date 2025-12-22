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
import api, { API_URL } from '@/lib/api'
import CustomAvatar from '@core/components/mui/Avatar'

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

  // Сортировка по order (меньший order первым), затем по created_at
  const sortedTests = [...tests].sort((a, b) => {
    const orderA = a.order ?? 999999
    const orderB = b.order ?? 999999
    if (orderA !== orderB) {
      return orderA - orderB
    }
    return new Date(b.created_at) - new Date(a.created_at)
  })

  // Создаем мапу результатов тестов для быстрого поиска
  const resultsMap = {}
  if (testResults) {
    testResults.forEach(result => {
      resultsMap[result.test_id] = result
    })
  }

  const getImageUrl = (path) => {
    if (!path) return null
    if (path.startsWith('http')) return path
    if (path.startsWith('/storage')) return `${API_URL}${path}`
    return `${API_URL}/storage/${path}`
  }

  return (
    <Card>
      <CardHeader title='Test List' />
      <CardContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sortedTests.map((test) => {
            const result = resultsMap[test.id]
            const isPassed = result?.is_passed || false
            const imageUrl = getImageUrl(test.image)
            
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                  {imageUrl && (
                    <CustomAvatar
                      src={imageUrl}
                      variant='rounded'
                      size={40}
                      sx={{ borderRadius: '50%', flexShrink: 0 }}
                    >
                      {test.title?.charAt(0)}
                    </CustomAvatar>
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant='subtitle1' className='font-medium'>
                      {test.title}
                    </Typography>
                    {test.level && (
                      <Chip label={test.level.name} size='small' variant='outlined' sx={{ mt: 1 }} />
                    )}
                  </Box>
                </Box>
                {isPassed ? (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: 'success.main',
                      color: 'success.contrastText'
                    }}
                  >
                    <i className='ri-check-line' style={{ fontSize: '18px' }} />
                  </Box>
                ) : (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: 'error.main',
                      color: 'error.contrastText'
                    }}
                  >
                    <i className='ri-close-line' style={{ fontSize: '18px' }} />
                  </Box>
                )}
              </Box>
            )
          })}
        </Box>
      </CardContent>
    </Card>
  )
}

export default TestList

