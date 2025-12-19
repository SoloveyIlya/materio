'use client'

// React Imports
import { useState, useEffect, useMemo } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid'
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Alert, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails, 
  TextField, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  List, 
  ListItem, 
  ListItemText,
  Chip,
  InputAdornment,
  OutlinedInput,
  FormControl
} from '@mui/material'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import api from '@/lib/api'

// Component Imports
import TrainingHeader from '@/views/apps/training/TrainingHeader'
import TrainingCourses from '@/views/apps/training/TrainingCourses'
import CustomTabList from '@core/components/mui/TabList'

export default function TrainingCenterPage() {
  const [trainingData, setTrainingData] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false)
  const [newQuestion, setNewQuestion] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    loadTraining()
    loadQuestions()
  }, [])

  const loadTraining = async () => {
    try {
      const response = await api.get('/moderator/training')
      setTrainingData(response.data)
    } catch (error) {
      console.error('Error loading training:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadQuestions = async () => {
    try {
      const response = await api.get('/moderator/training/questions')
      setQuestions(response.data?.questions || [])
    } catch (error) {
      console.error('Error loading questions:', error)
    }
  }

  const handleSubmitQuestion = async () => {
    if (!newQuestion.trim()) return

    try {
      await api.post('/moderator/training/questions', { question: newQuestion })
      setNewQuestion('')
      setQuestionDialogOpen(false)
      loadQuestions()
    } catch (error) {
      console.error('Error submitting question:', error)
      alert('Error submitting question')
    }
  }

  // Фильтрация вопросов по поиску и статусу
  const filteredQuestions = useMemo(() => {
    let filtered = questions

    // Фильтр по статусу
    if (activeTab === 'answered') {
      filtered = filtered.filter(q => q.answer && q.is_resolved)
    } else if (activeTab === 'pending') {
      filtered = filtered.filter(q => !q.answer || !q.is_resolved)
    }

    // Фильтр по поиску
    if (searchValue) {
      filtered = filtered.filter(q => 
        q.question.toLowerCase().includes(searchValue.toLowerCase()) ||
        (q.answer && q.answer.toLowerCase().includes(searchValue.toLowerCase()))
      )
    }

    return filtered
  }, [questions, activeTab, searchValue])

  if (loading) {
    return <Box sx={{ p: 6 }}>Loading...</Box>
  }

  if (!trainingData) {
    return <Box sx={{ p: 6 }}>Error loading training center</Box>
  }

  return (
    <Box sx={{ p: 6 }}>
      {/* Header с поиском (по шаблону FAQ) */}
      <Card sx={{ mb: 6, background: 'transparent', boxShadow: 'none' }}>
        <CardContent sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant='h4' color='primary' sx={{ mb: 2 }}>
            Training Center
          </Typography>
          <Typography sx={{ mb: 4 }}>Ask questions about training tasks or browse existing answers</Typography>
          <FormControl fullWidth sx={{ maxWidth: 600, mx: 'auto' }}>
            <OutlinedInput
              placeholder='Ask a question...'
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              startAdornment={
                <InputAdornment position='start'>
                  <i className='ri-search-line' />
                </InputAdornment>
              }
            />
          </FormControl>
        </CardContent>
      </Card>

      {/* Блок рекомендаций перед тестами */}
      {trainingData.recommendations && trainingData.recommendations.length > 0 && (
        <Alert severity="info" sx={{ mb: 6 }}>
          <Typography variant="h6" gutterBottom>Recommendations before tests:</Typography>
          <List>
            {trainingData.recommendations.map((rec, index) => (
              <ListItem key={index}>
                <ListItemText primary={`• ${rec}`} />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}

      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <TrainingCourses searchValue={searchValue} />
        </Grid>

        {/* Вопросы и ответы (по шаблону FAQ) */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent className='flex flex-col gap-6'>
              <div className='flex flex-wrap items-center justify-between gap-4'>
                <div>
                  <Typography variant='h5'>Questions & Answers</Typography>
                  <Typography>Ask questions about training tasks</Typography>
                </div>
                <Button
                  variant='contained'
                  startIcon={<i className='ri-question-line' />}
                  onClick={() => setQuestionDialogOpen(true)}
                >
                  Ask Question
                </Button>
              </div>

              {/* Табы для фильтрации */}
              <TabContext value={activeTab}>
                <CustomTabList onChange={(e, newValue) => setActiveTab(newValue)}>
                  <Tab label="All Questions" value="all" />
                  <Tab label="Answered" value="answered" />
                  <Tab label="Pending" value="pending" />
                </CustomTabList>

                {filteredQuestions.length > 0 ? (
                  <Box sx={{ mt: 3 }}>
                    {filteredQuestions.map((q) => (
                      <Accordion key={q.id} sx={{ mb: 2 }}>
                        <AccordionSummary expandIcon={<i className='ri-arrow-down-s-line' />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                            <Typography variant='body1' fontWeight='bold' sx={{ flex: 1 }}>
                              {q.question}
                            </Typography>
                            {q.answer && q.is_resolved && (
                              <Chip label="Answered" color="success" size="small" />
                            )}
                            {!q.answer && (
                              <Chip label="Pending" color="warning" size="small" />
                            )}
                            {q.task && (
                              <Chip 
                                label={`Task: ${q.task.title}`} 
                                variant="outlined" 
                                size="small" 
                              />
                            )}
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          {q.answer ? (
                            <Box>
                              <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                                {q.answer}
                              </Typography>
                              {q.answered_by && (
                                <Typography variant='caption' color='text.secondary'>
                                  Answered by: {q.answered_by?.name || 'Admin'} • {q.answered_at ? new Date(q.answered_at).toLocaleDateString() : ''}
                                </Typography>
                              )}
                            </Box>
                          ) : (
                            <Typography variant='body2' color='text.secondary' fontStyle='italic'>
                              Waiting for answer from administrator...
                            </Typography>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color='text.secondary'>
                      {searchValue ? 'No questions found matching your search.' : 'No questions yet. Ask your first question!'}
                    </Typography>
                  </Box>
                )}
              </TabContext>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Диалог для вопроса */}
      <Dialog open={questionDialogOpen} onClose={() => setQuestionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ask a Question</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Your Question"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Type your question here..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuestionDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmitQuestion} variant="contained" disabled={!newQuestion.trim()}>
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
