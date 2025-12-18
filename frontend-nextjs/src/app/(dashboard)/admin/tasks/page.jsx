'use client'

import { useState, useEffect } from 'react'
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Tabs, Tab, Grid, Card, CardContent } from '@mui/material'
import api from '@/lib/api'
import { API_URL } from '@/lib/api'

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState([])
  const [selectedTask, setSelectedTask] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [moderationComment, setModerationComment] = useState('')
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    loadTasks()
  }, [activeTab])

  const loadTasks = async () => {
    try {
      const statusMap = {
        0: null, // Все
        1: 'under_admin_review',
        2: 'approved',
        3: 'rejected',
        4: 'sent_for_revision',
      }
      const params = new URLSearchParams()
      if (statusMap[activeTab]) {
        params.append('status', statusMap[activeTab])
      }

      const response = await api.get(`/admin/tasks?${params}`)
      setTasks(response.data.data || response.data)
    } catch (error) {
      console.error('Error loading tasks:', error)
    }
  }

  const handleViewResult = async (task) => {
    try {
      const response = await api.get(`/admin/tasks/${task.id}`)
      setSelectedTask(response.data)
      setDialogOpen(true)
    } catch (error) {
      console.error('Error loading task:', error)
    }
  }

  const handleModerate = async (action) => {
    try {
      await api.post(`/admin/tasks/${selectedTask.id}/moderate`, {
        action,
        comment: moderationComment,
      })
      setDialogOpen(false)
      setModerationComment('')
      setSelectedTask(null)
      loadTasks()
      alert('Task moderated successfully')
    } catch (error) {
      console.error('Error moderating task:', error)
      alert('Error moderating task')
    }
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
        <Tab label="All" />
        <Tab label="Under Review" />
        <Tab label="Approved" />
        <Tab label="Rejected" />
        <Tab label="Revision" />
      </Tabs>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Moderator</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Completed At</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell>{task.id}</TableCell>
                <TableCell>{task.title}</TableCell>
                <TableCell>{task.assigned_user?.name || '—'}</TableCell>
                <TableCell>{task.category?.name || '—'}</TableCell>
                <TableCell>${task.price}</TableCell>
                <TableCell>
                  <Chip label={task.status} color={getStatusColor(task.status)} size="small" />
                </TableCell>
                <TableCell>
                  {task.completed_at ? new Date(task.completed_at).toLocaleString() : '—'}
                </TableCell>
                <TableCell align="right">
                  {task.status === 'under_admin_review' && (
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleViewResult(task)}
                    >
                      <i className="ri-eye-line" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Task Result - {selectedTask?.title}</DialogTitle>
        <DialogContent>
          {selectedTask?.result && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Answers</Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {selectedTask.result.answers || 'No answers provided'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                {selectedTask.result.screenshots && selectedTask.result.screenshots.length > 0 && (
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Screenshots</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                          {selectedTask.result.screenshots.map((screenshot, index) => (
                            <Box
                              key={index}
                              component="img"
                              src={screenshot.startsWith('http') ? screenshot : `${API_URL}${screenshot}`}
                              alt={`Screenshot ${index + 1}`}
                              sx={{
                                maxWidth: 200,
                                maxHeight: 200,
                                objectFit: 'cover',
                                border: '1px solid #ddd',
                                borderRadius: 1,
                                cursor: 'pointer',
                              }}
                              onClick={() => window.open(screenshot.startsWith('http') ? screenshot : `${API_URL}${screenshot}`, '_blank')}
                            />
                          ))}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {selectedTask.result.attachments && selectedTask.result.attachments.length > 0 && (
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Attachments</Typography>
                        {selectedTask.result.attachments.map((attachment, index) => (
                          <Button
                            key={index}
                            variant="outlined"
                            startIcon={<i className="ri-file-line" />}
                            href={attachment.startsWith('http') ? attachment : `${API_URL}${attachment}`}
                            target="_blank"
                            sx={{ mr: 1, mb: 1 }}
                          >
                            Attachment {index + 1}
                          </Button>
                        ))}
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {selectedTask.result.moderator_comment && (
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Moderator Comment</Typography>
                        <Typography variant="body2">
                          {selectedTask.result.moderator_comment}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {selectedTask.result.admin_comment && (
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Admin Comment</Typography>
                        <Typography variant="body2">
                          {selectedTask.result.admin_comment}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Moderation Comment"
                    value={moderationComment}
                    onChange={(e) => setModerationComment(e.target.value)}
                    placeholder="Add your comment..."
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => handleModerate('reject')} color="error">
            Reject
          </Button>
          <Button onClick={() => handleModerate('revision')} color="warning">
            Send for Revision
          </Button>
          <Button onClick={() => handleModerate('approve')} color="success" variant="contained">
            Approve
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
