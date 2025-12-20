'use client'

import { useState, useEffect } from 'react'
import { Box, Grid, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, Button, Checkbox, FormControlLabel, Typography, IconButton, Card } from '@mui/material'
import api from '@/lib/api'
import TestHeader from '@/components/tests/TestHeader'
import Tests from '@/components/tests/Tests'

export default function TestsPage() {
  const [tests, setTests] = useState([])
  const [levels, setLevels] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    level_id: '',
    title: '',
    description: '',
    image: null,
    duration_minutes: 30,
    is_active: true,
    questions: []
  })
  const [editingTest, setEditingTest] = useState(null)

  useEffect(() => {
    loadTests()
    loadLevels()
  }, [])

  const loadTests = async () => {
    try {
      const response = await api.get('/admin/tests')
      setTests(response.data)
    } catch (error) {
      console.error('Error loading tests:', error)
    }
  }

  const loadLevels = async () => {
    try {
      const response = await api.get('/admin/test-levels')
      setLevels(response.data)
    } catch (error) {
      console.error('Error loading levels:', error)
    }
  }

  const handleOpenDialog = (test = null) => {
    if (test) {
      setEditingTest(test)
      setFormData({
        level_id: test.level_id?.toString() || '',
        title: test.title || '',
        description: test.description || '',
        image: null,
        duration_minutes: test.duration_minutes || 30,
        is_active: test.is_active !== undefined ? test.is_active : true,
        questions: test.questions?.map(q => ({
          id: q.id,
          question: q.question,
          image: null,
          video: q.video || '',
          order: q.order || 0,
          answers: q.answers?.map(a => ({
            id: a.id,
            answer: a.answer,
            is_correct: a.is_correct,
            order: a.order || 0
          })) || []
        })) || []
      })
    } else {
      setEditingTest(null)
      setFormData({
        level_id: '',
        title: '',
        description: '',
        image: null,
        duration_minutes: 30,
        is_active: true,
        questions: []
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingTest(null)
    setFormData({
      level_id: '',
      title: '',
      description: '',
      image: null,
      duration_minutes: 30,
      is_active: true,
      questions: []
    })
  }

  const handleSave = async () => {
    try {
      const formDataToSend = new FormData()
      
      formDataToSend.append('level_id', formData.level_id || '')
      formDataToSend.append('title', formData.title)
      formDataToSend.append('description', formData.description || '')
      formDataToSend.append('duration_minutes', formData.duration_minutes)
      formDataToSend.append('is_active', formData.is_active ? '1' : '0')
      
      if (formData.image) {
        formDataToSend.append('image', formData.image)
      }

      // Добавляем вопросы
      formData.questions.forEach((question, qIndex) => {
        if (question.id) {
          formDataToSend.append(`questions[${qIndex}][id]`, question.id)
        }
        formDataToSend.append(`questions[${qIndex}][question]`, question.question)
        if (question.video) {
          formDataToSend.append(`questions[${qIndex}][video]`, question.video)
        }
        if (question.image) {
          formDataToSend.append(`questions[${qIndex}][image]`, question.image)
        }
        formDataToSend.append(`questions[${qIndex}][order]`, question.order || qIndex)

        // Добавляем ответы
        question.answers.forEach((answer, aIndex) => {
          formDataToSend.append(`questions[${qIndex}][answers][${aIndex}][answer]`, answer.answer)
          formDataToSend.append(`questions[${qIndex}][answers][${aIndex}][is_correct]`, answer.is_correct ? '1' : '0')
          formDataToSend.append(`questions[${qIndex}][answers][${aIndex}][order]`, answer.order || aIndex)
          if (answer.id) {
            formDataToSend.append(`questions[${qIndex}][answers][${aIndex}][id]`, answer.id)
          }
        })
      })

      if (editingTest) {
        await api.put(`/admin/tests/${editingTest.id}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      } else {
        await api.post('/admin/tests', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }
      
      handleCloseDialog()
      loadTests()
    } catch (error) {
      console.error('Error saving test:', error)
      alert('Error saving test: ' + (error.response?.data?.message || error.message))
    }
  }

  const handleAddQuestion = () => {
    setFormData({
      ...formData,
      questions: [
        ...formData.questions,
        {
          question: '',
          image: null,
          video: '',
          order: formData.questions.length,
          answers: [
            { answer: '', is_correct: false, order: 0 },
            { answer: '', is_correct: false, order: 1 }
          ]
        }
      ]
    })
  }

  const handleUpdateQuestion = (index, field, value) => {
    const newQuestions = [...formData.questions]
    newQuestions[index] = { ...newQuestions[index], [field]: value }
    setFormData({ ...formData, questions: newQuestions })
  }

  const handleAddAnswer = (questionIndex) => {
    const newQuestions = [...formData.questions]
    newQuestions[questionIndex].answers.push({
      answer: '',
      is_correct: false,
      order: newQuestions[questionIndex].answers.length
    })
    setFormData({ ...formData, questions: newQuestions })
  }

  const handleUpdateAnswer = (questionIndex, answerIndex, field, value) => {
    const newQuestions = [...formData.questions]
    newQuestions[questionIndex].answers[answerIndex] = {
      ...newQuestions[questionIndex].answers[answerIndex],
      [field]: value
    }
    setFormData({ ...formData, questions: newQuestions })
  }

  const handleDeleteQuestion = (index) => {
    const newQuestions = formData.questions.filter((_, i) => i !== index)
    setFormData({ ...formData, questions: newQuestions })
  }

  const handleDeleteAnswer = (questionIndex, answerIndex) => {
    const newQuestions = [...formData.questions]
    newQuestions[questionIndex].answers = newQuestions[questionIndex].answers.filter((_, i) => i !== answerIndex)
    setFormData({ ...formData, questions: newQuestions })
  }

  const handleAddLevel = async () => {
    const name = prompt('Enter level name:')
    if (name) {
      try {
        await api.post('/admin/test-levels', { name })
        loadLevels()
      } catch (error) {
        console.error('Error creating level:', error)
        alert('Error creating level')
      }
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <TestHeader onAddTest={() => handleOpenDialog()} />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Tests testData={tests} onEditTest={handleOpenDialog} />
        </Grid>
      </Grid>

      {/* Add/Edit Test Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth='lg' fullWidth>
        <DialogTitle>{editingTest ? 'Edit' : 'Add'} Test</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <FormControl fullWidth>
              <InputLabel>Level</InputLabel>
              <Select
                value={formData.level_id}
                onChange={(e) => setFormData({ ...formData, level_id: e.target.value })}
                label='Level'
              >
                <MenuItem value=''>None</MenuItem>
                {levels.map((level) => (
                  <MenuItem key={level.id} value={level.id.toString()}>
                    {level.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant='outlined' onClick={handleAddLevel} startIcon={<i className='ri-add-line' />}>
              Add Level
            </Button>
          </Box>

          <TextField
            fullWidth
            label='Title'
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            sx={{ mt: 2 }}
            required
          />

          <TextField
            fullWidth
            label='Description'
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={3}
            sx={{ mt: 2 }}
          />

          <Box sx={{ mt: 2 }}>
            <Button
              variant='outlined'
              component='label'
              fullWidth
              startIcon={<i className='ri-image-line' />}
            >
              {formData.image || (editingTest && editingTest.image) ? 'Change Image' : 'Upload Image'}
              <input
                type='file'
                accept='image/*'
                hidden
                onChange={(e) => setFormData({ ...formData, image: e.target.files[0] })}
              />
            </Button>
            {!formData.image && editingTest && editingTest.image && (
              <Box sx={{ mt: 2 }}>
                <img src={editingTest.image} alt='Test' style={{ maxWidth: '100%', maxHeight: '200px' }} />
              </Box>
            )}
            {formData.image && (
              <Box sx={{ mt: 1 }}>
                <Typography variant='caption'>New image selected</Typography>
              </Box>
            )}
          </Box>

          <TextField
            fullWidth
            label='Duration (minutes)'
            type='number'
            value={formData.duration_minutes}
            onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
            sx={{ mt: 2 }}
            required
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
            }
            label='Active'
            sx={{ mt: 2 }}
          />

          <Box sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant='h6'>Questions</Typography>
              <Button variant='contained' startIcon={<i className='ri-add-line' />} onClick={handleAddQuestion}>
                Add Question
              </Button>
            </Box>

            {formData.questions.map((question, qIndex) => (
              <Card key={qIndex} sx={{ mb: 3, p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant='subtitle1'>Question {qIndex + 1}</Typography>
                  <IconButton size='small' color='error' onClick={() => handleDeleteQuestion(qIndex)}>
                    <i className='ri-delete-bin-line' />
                  </IconButton>
                </Box>

                <TextField
                  fullWidth
                  label='Question'
                  value={question.question}
                  onChange={(e) => handleUpdateQuestion(qIndex, 'question', e.target.value)}
                  multiline
                  rows={2}
                  sx={{ mb: 2 }}
                />

                <Box sx={{ mb: 2 }}>
                  <Button
                    variant='outlined'
                    component='label'
                    size='small'
                    startIcon={<i className='ri-image-line' />}
                    sx={{ mr: 2 }}
                  >
                    {question.image || (editingTest && editingTest.questions?.[qIndex]?.image) ? 'Change Image' : 'Add Image'}
                    <input
                      type='file'
                      accept='image/*'
                      hidden
                      onChange={(e) => handleUpdateQuestion(qIndex, 'image', e.target.files[0])}
                    />
                  </Button>
                  {!question.image && editingTest && editingTest.questions?.[qIndex]?.image && (
                    <Box sx={{ mt: 1 }}>
                      <img src={editingTest.questions[qIndex].image} alt='Question' style={{ maxWidth: '200px', maxHeight: '150px' }} />
                    </Box>
                  )}
                  {question.image && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant='caption'>New image selected</Typography>
                    </Box>
                  )}
                </Box>

                <TextField
                  fullWidth
                  label='Video URL (optional)'
                  value={question.video}
                  onChange={(e) => handleUpdateQuestion(qIndex, 'video', e.target.value)}
                  sx={{ mb: 2 }}
                  placeholder='https://youtube.com/watch?v=...'
                />

                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant='subtitle2'>Answers</Typography>
                    <Button size='small' startIcon={<i className='ri-add-line' />} onClick={() => handleAddAnswer(qIndex)}>
                      Add Answer
                    </Button>
                  </Box>

                  {question.answers.map((answer, aIndex) => (
                    <Box key={aIndex} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                      <TextField
                        fullWidth
                        size='small'
                        label={`Answer ${aIndex + 1}`}
                        value={answer.answer}
                        onChange={(e) => handleUpdateAnswer(qIndex, aIndex, 'answer', e.target.value)}
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={answer.is_correct}
                            onChange={(e) => handleUpdateAnswer(qIndex, aIndex, 'is_correct', e.target.checked)}
                          />
                        }
                        label='Correct'
                      />
                      <IconButton
                        size='small'
                        color='error'
                        onClick={() => handleDeleteAnswer(qIndex, aIndex)}
                        disabled={question.answers.length <= 2}
                      >
                        <i className='ri-delete-bin-line' />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              </Card>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant='contained' disabled={!formData.title || formData.questions.length === 0}>
            {editingTest ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

