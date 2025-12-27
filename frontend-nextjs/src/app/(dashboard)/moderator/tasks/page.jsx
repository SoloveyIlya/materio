'use client'

import { useState, useEffect } from 'react'
import { Box, Typography, Tabs, Tab, Grid, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material'
import api from '@/lib/api'

// Component Imports
import ModeratorTaskListTable from '@/views/apps/tasks/list/ModeratorTaskListTable'

export default function ModeratorTasksPage() {
  const [tasks, setTasks] = useState([])
  const [activeTab, setActiveTab] = useState(0)
  const [selectedTask, setSelectedTask] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    answers: '',
    screenshots: [],
    attachments: [],
    comment: '',
  })

  useEffect(() => {
    loadTasks()
  }, [activeTab])

  const loadTasks = async () => {
    try {
      const groupMap = {
        0: 'waiting',
        1: 'in_work',
        2: 'history',
      }
      const params = new URLSearchParams()
      if (groupMap[activeTab]) {
        params.append('group', groupMap[activeTab])
      }

      const response = await api.get(`/moderator/tasks?${params}`)
      console.log('Tasks loaded:', response.data)
      setTasks(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Error loading tasks:', error)
      console.error('Error response:', error.response?.data)
      setTasks([])
    }
  }

  const handleStart = async (task) => {
    try {
      await api.post(`/moderator/tasks/${task.id}/start`)
      loadTasks()
    } catch (error) {
      console.error('Error starting task:', error)
      alert('Error starting task')
    }
  }

  const handleComplete = async (task) => {
    setSelectedTask(task)
    setDialogOpen(true)
  }

  const handleSubmitComplete = async () => {
    try {
      const formDataToSend = new FormData()
      formDataToSend.append('answers', formData.answers)
      formDataToSend.append('comment', formData.comment)
      
      formData.screenshots.forEach((file, index) => {
        if (file instanceof File) {
          formDataToSend.append(`screenshots[${index}]`, file)
        } else {
          formDataToSend.append(`screenshots[${index}]`, file)
        }
      })

      formData.attachments.forEach((file, index) => {
        if (file instanceof File) {
          formDataToSend.append(`attachments[${index}]`, file)
        } else {
          formDataToSend.append(`attachments[${index}]`, file)
        }
      })

      await api.post(`/moderator/tasks/${selectedTask.id}/complete`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      setDialogOpen(false)
      setFormData({ answers: '', screenshots: [], attachments: [], comment: '' })
      setSelectedTask(null)
      loadTasks()
      alert('Task completed successfully')
    } catch (error) {
      console.error('Error completing task:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error'
      alert('Error completing task: ' + errorMessage)
    }
  }

  const handleFileChange = (e, type) => {
    const files = Array.from(e.target.files)
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], ...files],
    }))
  }

  const handleMessage = (task) => {
    window.location.href = `/chat?task_id=${task.id}`
  }

  return (
    <Box sx={{ p: 6 }}>
      <Typography variant='h4' gutterBottom>Tasks</Typography>

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 6 }}>
        <Tab label='Waiting' />
        <Tab label='In Work' />
        <Tab label='History' />
      </Tabs>

      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <ModeratorTaskListTable
            tableData={tasks}
            onStart={handleStart}
            onComplete={handleComplete}
            onMessage={handleMessage}
          />
        </Grid>
      </Grid>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Complete Task - {selectedTask?.title}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={6}
                label="Answers"
                value={formData.answers}
                onChange={(e) => setFormData({ ...formData, answers: e.target.value })}
                placeholder="Enter your answers..."
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<i className="ri-image-line" />}
                fullWidth
              >
                Upload Screenshots
                <input
                  type="file"
                  hidden
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'screenshots')}
                />
              </Button>
              {formData.screenshots.length > 0 && (
                <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                  {formData.screenshots.length} file(s) selected
                </Typography>
              )}
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<i className="ri-file-line" />}
                fullWidth
              >
                Upload Attachments
                <input
                  type="file"
                  hidden
                  multiple
                  onChange={(e) => handleFileChange(e, 'attachments')}
                />
              </Button>
              {formData.attachments.length > 0 && (
                <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                  {formData.attachments.length} file(s) selected
                </Typography>
              )}
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Comment"
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder="Add a comment (optional)..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmitComplete} variant="contained" color="success">
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
