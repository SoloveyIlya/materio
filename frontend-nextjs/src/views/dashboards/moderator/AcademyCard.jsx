'use client'

// React Imports
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemIcon from '@mui/material/ListItemIcon'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'

// Components Imports
import CustomAvatar from '@core/components/mui/Avatar'
import api from '@/lib/api'

const AcademyCard = () => {
  const [testData, setTestData] = useState(null)
  const [allTestsPassed, setAllTestsPassed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  useEffect(() => {
    loadTestData()
    
    // Listen for page visibility changes to reload when returning to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadTestData()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const loadTestData = async () => {
    try {
      setLoading(true)
      // Загружаем результаты тестов пользователя и все доступные тесты
      const [userResponse, testsResponse, statusResponse] = await Promise.all([
        api.get('/auth/user'),
        api.get('/moderator/tests'),
        api.get('/moderator/tests/status/all')
      ])
      const user = userResponse.data
      const allTests = testsResponse.data || []

      // Получаем результаты тестов пользователя (API возвращает test_results в snake_case)
      const testResults = user.test_results || []

      // Создаем мапу результатов для быстрого доступа
      const resultsMap = {}
      testResults.forEach(result => {
        if (result.test_id) {
          resultsMap[result.test_id] = result
        }
      })

      // Добавляем статус к каждому тесту
      const testsWithStatus = allTests.map(test => ({
        ...test,
        isPassed: resultsMap[test.id]?.is_passed || false,
        result: resultsMap[test.id]
      }))

      // Проверяем, прошёл ли пользователь все доступные тесты успешно
      const passedTests = testResults.filter(tr => tr.is_passed === true)
      const allPassed = statusResponse.data?.all_tests_passed || false

      setTestData({
        totalTests: allTests.length,
        passedTests: passedTests.length,
        tests: testsWithStatus
      })
      setAllTestsPassed(allPassed)
    } catch (error) {
      console.error('Error loading test data:', error)
      // Fallback данные
      setTestData({
        totalTests: 0,
        passedTests: 0,
        tests: []
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStartClick = () => {
    // Перезагружаем данные перед открытием диалога
    loadTestData()
    setDialogOpen(true)
  }

  const handleTestClick = (test) => {
    if (!test.isPassed) {
      router.push(`/moderator/academy/test/${test.id}`)
    }
  }

  const filteredTests = testData?.tests?.filter(test => 
    test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    test.level?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const data = [
    { icon: 'ri-calendar-line', title: `${testData?.totalTests || 0} Tests`, value: 'Tests' },
    { icon: 'ri-time-line', title: '30 Minutes', value: 'Duration' }
  ]

  return (
    <Card>
      <CardContent className='flex flex-col gap-6'>
        <div className='flex justify-center pli-2.5 pbs-2.5 rounded bg-primaryLight'>
          {loading ? (
            <Skeleton variant='rectangular' width={140} height={140} />
          ) : (
            <img src='/images/illustrations/characters/14.png' className='bs-[140px]' alt='Academy' />
          )}
        </div>
        <div>
          {loading ? (
            <>
              <Skeleton variant='text' width={100} height={32} className='mbe-1' />
              <Skeleton variant='text' width='100%' height={20} />
              <Skeleton variant='text' width='80%' height={20} />
            </>
          ) : (
            <>
              <Typography variant='h5' className='mbe-1'>
                Academy
              </Typography>
              <Typography>All new workers must successfully complete the onboarding tests before gaining full access.</Typography>
            </>
          )}
        </div>
        <div className='flex flex-wrap justify-between gap-4'>
          {loading ? (
            <>
              {[1, 2].map((i) => (
                <div key={i} className='flex items-center gap-4'>
                  <Skeleton variant='rectangular' width={40} height={40} />
                  <div className='flex flex-col gap-0.5'>
                    <Skeleton variant='text' width={80} height={20} />
                    <Skeleton variant='text' width={60} height={16} />
                  </div>
                </div>
              ))}
            </>
          ) : (
            data.map((item, i) => (
              <div key={i} className='flex items-center gap-4'>
                <CustomAvatar variant='rounded' skin='light' color='primary'>
                  <i className={item.icon} />
                </CustomAvatar>
                <div className='flex flex-col gap-0.5'>
                  <Typography color='text.primary'>{item.title}</Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {item.value}
                  </Typography>
                </div>
              </div>
            ))
          )}
        </div>
        {loading ? (
          <Skeleton variant='rectangular' width='100%' height={36} />
        ) : (
          <Button 
            variant='contained' 
            onClick={handleStartClick}
            disabled={allTestsPassed}
            sx={allTestsPassed ? {
              bgcolor: 'success.main',
              '&:hover': {
                bgcolor: 'success.dark',
              },
              '&:disabled': {
                bgcolor: 'success.main',
                color: 'white'
              }
            } : {}}
          >
            {allTestsPassed ? 'Success' : 'Start'}
          </Button>
        )}
      </CardContent>

      {/* Modal Dialog with Test List */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          Test List
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            placeholder='Search Task'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <Box sx={{ mr: 1 }}>
                  <i className='ri-search-line' />
                </Box>
              )
            }}
          />
          
          <Divider sx={{ mb: 2 }} />
          
          <Typography variant='subtitle2' sx={{ mb: 2 }}>
            Test List
          </Typography>
          
          <List sx={{ p: 0 }}>
            {filteredTests.length === 0 ? (
              <Typography variant='body2' color='text.secondary' sx={{ textAlign: 'center', py: 3 }}>
                No tests found
              </Typography>
            ) : (
              filteredTests.map((test, index) => (
                <ListItem
                  key={test.id}
                  onClick={() => handleTestClick(test)}
                  sx={{
                    cursor: test.isPassed ? 'default' : 'pointer',
                    bgcolor: 'background.paper',
                    mb: 1,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': test.isPassed ? {} : {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <ListItemText
                      primary={test.title}
                      secondary={
                        <Chip 
                          label={test.level?.name || 'No level'} 
                          size='small'
                          variant='outlined'
                          sx={{ mt: 0.5 }}
                        />
                      }
                    />
                  </Box>
                  <ListItemIcon sx={{ minWidth: 'auto', ml: 2 }}>
                    {test.isPassed ? (
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          bgcolor: 'success.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <i className='ri-check-line' style={{ color: 'white', fontSize: 24 }} />
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          bgcolor: 'error.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <i className='ri-close-line' style={{ color: 'white', fontSize: 24 }} />
                      </Box>
                    )}
                  </ListItemIcon>
                </ListItem>
              ))
            )}
          </List>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant='subtitle2' sx={{ mb: 1 }}>
            Task List
          </Typography>
          
          <TextField
            fullWidth
            placeholder='Search Task'
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <Box sx={{ mr: 1 }}>
                  <i className='ri-search-line' />
                </Box>
              )
            }}
          />
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default AcademyCard
