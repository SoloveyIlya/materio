'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Box, Grid, Card, CardContent, Typography, Button, Radio, RadioGroup, FormControlLabel, FormControl, Alert, Chip, CircularProgress, Divider } from '@mui/material'
import api from '@/lib/api'
import { showToast } from '@/utils/toast'

export default function ModeratorTestPage() {
  const params = useParams()
  const router = useRouter()
  const testId = params?.id

  const [test, setTest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [started, setStarted] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [timeRemaining, setTimeRemaining] = useState(null)
  const [startTime, setStartTime] = useState(null)
  const [testCompleted, setTestCompleted] = useState(false)
  const [testPassed, setTestPassed] = useState(null)

  useEffect(() => {
    if (testId) {
      loadTest()
    }
  }, [testId])

  useEffect(() => {
    if (started && timeRemaining !== null && timeRemaining > 0) {
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleTimeUp()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [started, timeRemaining])

  const loadTest = async () => {
    try {
      setLoading(true)
      // Используем модераторский API для получения теста
      const response = await api.get(`/moderator/tests/${testId}`)
      const testData = response.data
      
      setTest(testData)
    } catch (error) {
      console.error('Error loading test:', error)
      showToast.error('Error loading test')
      router.push('/moderator/academy')
    } finally {
      setLoading(false)
    }
  }

  const handleStart = () => {
    if (!test) {
      showToast.error('Test not found')
      return
    }
    
    // Use default duration of 30 minutes if not set or is 0
    const durationMinutes = test.duration_minutes && test.duration_minutes > 0 
      ? test.duration_minutes 
      : 30
    
    setStarted(true)
    setStartTime(new Date())
    setTimeRemaining(durationMinutes * 60) // Convert minutes to seconds
  }

  const handleTimeUp = () => {
    showToast.error('Time is up! Submitting your answers...')
    handleSubmitTest()
  }

  const handleAnswerChange = (questionId, answerId) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answerId
    }))
  }

  const handleNextQuestion = () => {
    const currentQuestion = test.questions[currentQuestionIndex]
    
    if (!selectedAnswers[currentQuestion.id]) {
      showToast.error('Please select an answer before proceeding')
      return
    }

    if (currentQuestionIndex < test.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    } else {
      handleSubmitTest()
    }
  }

  const handleSubmitTest = async () => {
    try {
      const answers = test.questions.map(question => {
        const selectedAnswerId = selectedAnswers[question.id]
        return {
          question_id: question.id,
          answer_id: selectedAnswerId ? parseInt(selectedAnswerId) : null
        }
      })

      const endTime = new Date()
      const timeSpent = startTime ? Math.floor((endTime - startTime) / 1000) : 0

      const response = await api.post('/moderator/tests/submit', {
        test_id: parseInt(testId),
        answers: answers,
        time_spent: timeSpent
      })

      setTestCompleted(true)
      setTestPassed(response.data.is_passed)
      
      if (response.data.is_passed) {
        showToast.success(`Test passed! Score: ${response.data.score}/${response.data.total} (${response.data.percentage}%)`)
      } else {
        showToast.warning(`Test completed. Score: ${response.data.score}/${response.data.total} (${response.data.percentage}%)`)
      }
      
      // Redirect to results page or back to academy
      setTimeout(() => {
        router.push('/moderator/academy')
      }, 3000)
    } catch (error) {
      console.error('Error submitting test:', error)
      showToast.error('Error submitting test: ' + (error.response?.data?.message || error.message))
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null
    if (imagePath.startsWith('http')) return imagePath
    if (imagePath.startsWith('/storage')) {
      return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${imagePath}`
    }
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/storage/${imagePath}`
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!test) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Test not found</Alert>
      </Box>
    )
  }

  if (testCompleted) {
    const isPassed = testPassed === true
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert 
          severity={isPassed ? "success" : "error"} 
          sx={{ 
            mb: 2,
            bgcolor: isPassed ? 'success.light' : 'error.light',
            color: isPassed ? 'success.dark' : 'error.dark',
            '& .MuiAlert-icon': {
              color: isPassed ? 'success.dark' : 'error.dark',
            }
          }}
        >
          {isPassed ? 'Test completed successfully!' : 'Test failed'}
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => router.push('/moderator/academy')}
          sx={{
            bgcolor: isPassed ? 'success.main' : 'error.main',
            '&:hover': {
              bgcolor: isPassed ? 'success.dark' : 'error.dark',
            }
          }}
        >
          Back to Academy
        </Button>
      </Box>
    )
  }

  const currentQuestion = test.questions?.[currentQuestionIndex]
  const progress = test.questions ? ((currentQuestionIndex + 1) / test.questions.length) * 100 : 0

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={6}>
        {/* Left Sidebar - Test Info */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant='h5' sx={{ mb: 2 }}>
                {test.title}
              </Typography>
              {test.description && (
                <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
                  {test.description}
                </Typography>
              )}
              
              {started && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Box sx={{ mb: 2 }}>
                    <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                      Time Remaining
                    </Typography>
                    <Chip 
                      label={formatTime(timeRemaining)} 
                      color={timeRemaining < 60 ? 'error' : 'primary'}
                      sx={{ fontSize: '1.2rem', fontWeight: 'bold', py: 2 }}
                    />
                  </Box>
                  <Box>
                    <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                      Progress
                    </Typography>
                    <Typography variant='h6'>
                      {currentQuestionIndex + 1} / {test.questions?.length || 0}
                    </Typography>
                    <Box sx={{ width: '100%', height: 8, bgcolor: 'action.hover', borderRadius: 1, mt: 1 }}>
                      <Box 
                        sx={{ 
                          width: `${progress}%`, 
                          height: '100%', 
                          bgcolor: 'primary.main', 
                          borderRadius: 1,
                          transition: 'width 0.3s'
                        }} 
                      />
                    </Box>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Side - Questions and Answers */}
        <Grid size={{ xs: 12, md: 8 }}>
          {!started ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant='h4' sx={{ mb: 2 }}>
                  Ready to Start?
                </Typography>
                <Typography variant='body1' color='text.secondary' sx={{ mb: 4 }}>
                  This test has {test.questions?.length || 0} questions and will take approximately {test.duration_minutes && test.duration_minutes > 0 ? test.duration_minutes : 30} minutes.
                </Typography>
                <Button
                  variant='contained'
                  size='large'
                  onClick={handleStart}
                  startIcon={<i className='ri-play-line' />}
                >
                  Start Test
                </Button>
              </CardContent>
            </Card>
          ) : currentQuestion ? (
            <Card>
              <CardContent>
                {/* Question Number and Text */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant='h6' color='primary' sx={{ mb: 2 }}>
                    Question {currentQuestionIndex + 1} of {test.questions.length}
                  </Typography>
                  <Typography variant='h5' sx={{ mb: 3 }}>
                    {currentQuestion.question}
                  </Typography>

                  {/* Question Image */}
                  {currentQuestion.image && (
                    <Box sx={{ mb: 3, textAlign: 'center' }}>
                      <img
                        src={getImageUrl(currentQuestion.image)}
                        alt='Question'
                        style={{
                          maxWidth: '100%',
                          maxHeight: '400px',
                          borderRadius: '8px',
                          objectFit: 'contain'
                        }}
                      />
                    </Box>
                  )}

                  {/* Question Video */}
                  {currentQuestion.video && (
                    <Box sx={{ mb: 3 }}>
                      {currentQuestion.video.startsWith('http') || currentQuestion.video.includes('youtube') || currentQuestion.video.includes('vimeo') ? (
                        <Box
                          component="iframe"
                          src={currentQuestion.video}
                          sx={{
                            width: '100%',
                            height: '400px',
                            borderRadius: 1,
                            border: 'none'
                          }}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <Box
                          component="video"
                          src={getImageUrl(currentQuestion.video)}
                          controls
                          sx={{
                            width: '100%',
                            maxHeight: '400px',
                            borderRadius: 1
                          }}
                        />
                      )}
                    </Box>
                  )}
                </Box>

                {/* Answers */}
                <FormControl component="fieldset" fullWidth sx={{ mb: 4 }}>
                  <RadioGroup
                    value={selectedAnswers[currentQuestion.id] || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  >
                    {currentQuestion.answers?.map((answer, index) => (
                      <FormControlLabel
                        key={answer.id || index}
                        value={answer.id?.toString() || index.toString()}
                        control={<Radio />}
                        label={
                          <Typography variant='body1' sx={{ py: 1 }}>
                            {answer.answer}
                          </Typography>
                        }
                        sx={{
                          mb: 2,
                          p: 2,
                          border: '1px solid',
                          borderColor: selectedAnswers[currentQuestion.id] === (answer.id?.toString() || index.toString())
                            ? 'primary.main'
                            : 'divider',
                          borderRadius: 1,
                          bgcolor: selectedAnswers[currentQuestion.id] === (answer.id?.toString() || index.toString())
                            ? 'action.selected'
                            : 'transparent',
                          '&:hover': {
                            bgcolor: 'action.hover'
                          }
                        }}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>

                {/* Submit Button */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant='contained'
                    size='large'
                    onClick={handleNextQuestion}
                    endIcon={
                      currentQuestionIndex < test.questions.length - 1 
                        ? <i className='ri-arrow-right-line' />
                        : <i className='ri-check-line' />
                    }
                  >
                    {currentQuestionIndex < test.questions.length - 1 ? 'Next Question' : 'Submit Test'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent>
                <Alert severity="info">No questions available</Alert>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  )
}

