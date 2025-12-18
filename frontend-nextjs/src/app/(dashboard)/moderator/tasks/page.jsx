'use client'

import { useState, useEffect } from 'react'
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Button, Tabs, Tab, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Grid, Card, CardContent } from '@mui/material'
import api from '@/lib/api'
import { API_URL } from '@/lib/api'

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
      setTasks(response.data)
    } catch (error) {
      console.error('Error loading tasks:', error)
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

  const handleComplete = async () => {
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
      alert('Error completing task')
    }
  }

  const handleFileChange = (e, type) => {
    const files = Array.from(e.target.files)
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], ...files],
    }))
  }

  const formatDeadline = (seconds) => {
    if (!seconds || seconds < 0) return 'Expired'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'default',
      in_progress: 'info',
      completed_by_moderator: 'warning',
      under_admin_review: 'primary',
      approved: 'success',
      rejected: 'error',
      sent_for_revision: 'warning',
    }
    return colors[status] || 'default'
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Tasks</Typography>

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Waiting" />
        <Tab label="In Work" />
        <Tab label="History" />
      </Tabs>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Deadline</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell>{task.id}</TableCell>
                <TableCell>{task.title}</TableCell>
                <TableCell>{task.category?.name || '—'}</TableCell>
                <TableCell>${task.price}</TableCell>
                <TableCell>
                  <Chip label={task.status} color={getStatusColor(task.status)} size="small" />
                </TableCell>
                <TableCell>
                  {task.deadline_timer !== null ? formatDeadline(task.deadline_timer) : '—'}
                </TableCell>
                <TableCell align="right">
                  {task.status === 'pending' && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleStart(task)}
                    >
                      Start
                    </Button>
                  )}
                  {task.status === 'in_progress' && (
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      onClick={() => {
                        setSelectedTask(task)
                        setDialogOpen(true)
                      }}
                    >
                      Complete
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Complete Task - {selectedTask?.title}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
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

            <Grid item xs={12}>
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

            <Grid item xs={12}>
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

            <Grid item xs={12}>
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
          <Button onClick={handleComplete} variant="contained" color="success">
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
