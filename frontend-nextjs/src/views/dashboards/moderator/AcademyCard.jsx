'use client'

// React Imports
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

// Components Imports
import CustomAvatar from '@core/components/mui/Avatar'
import api from '@/lib/api'

const AcademyCard = () => {
  const [testData, setTestData] = useState(null)
  const [allTestsPassed, setAllTestsPassed] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadTestData()
  }, [])

  const loadTestData = async () => {
    try {
      // Загружаем результаты тестов пользователя
      const userResponse = await api.get('/auth/user')
      const user = userResponse.data

      // Получаем результаты тестов пользователя
      const testResults = user.testResults || []

      // Проверяем, прошёл ли пользователь все 3 теста успешно
      const passedTests = testResults.filter(tr => tr.is_passed === true)
      const allPassed = passedTests.length >= 3

      setTestData({
        totalTests: 3,
        passedTests: passedTests.length,
        tests: []
      })
      setAllTestsPassed(allPassed)
    } catch (error) {
      console.error('Error loading test data:', error)
      // Fallback данные
      setTestData({
        totalTests: 3,
        passedTests: 0,
        tests: []
      })
    }
  }

  const handleStartClick = () => {
    router.push('/moderator/training')
  }

  const data = [
    { icon: 'ri-calendar-line', title: `${testData?.totalTests || 3} Tests`, value: 'Tests' },
    { icon: 'ri-time-line', title: '30 Minutes', value: 'Duration' }
  ]

  return (
    <Card>
      <CardContent className='flex flex-col gap-6'>
        <div className='flex justify-center pli-2.5 pbs-2.5 rounded bg-primaryLight'>
          <img src='/images/illustrations/characters/14.png' className='bs-[140px]' alt='Academy' />
        </div>
        <div>
          <Typography variant='h5' className='mbe-1'>
            Academy
          </Typography>
          <Typography>All new workers must successfully complete the onboarding tests before gaining full access.</Typography>
        </div>
        <div className='flex flex-wrap justify-between gap-4'>
          {data.map((item, i) => (
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
          ))}
        </div>
        <Button 
          variant='contained' 
          onClick={handleStartClick}
          disabled={allTestsPassed}
        >
          {allTestsPassed ? 'Completed' : 'Start'}
        </Button>
      </CardContent>
    </Card>
  )
}

export default AcademyCard

