'use client'

import { useState, useEffect } from 'react'
import { Box, Typography, Tabs, Tab, Grid, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Card, CardContent } from '@mui/material'
import api from '@/lib/api'
import { API_URL } from '@/lib/api'

// Component Imports
import TaskListTable from '@/views/apps/tasks/list/TaskListTable'
import TaskCard from '@/views/apps/tasks/list/TaskCard'

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState([])
  const [selectedTask, setSelectedTask] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [moderationComment, setModerationComment] = useState('')
  const [activeTab, setActiveTab] = useState(0) // По умолчанию "Under Review"

  useEffect(() => {
    loadTasks()
  }, [activeTab])

  const loadTasks = async () => {
    try {
      const statusMap = {
        0: 'under_admin_review', // Under Review (первый таб, по умолчанию)
        1: 'pending,in_progress', // Pending - включает pending и in_progress
        2: 'approved',
        3: 'rejected',
        4: 'sent_for_revision',
      }
      const params = new URLSearchParams()
      if (statusMap[activeTab]) {
        params.append('status', statusMap[activeTab])
      }

      const response = await api.get(`/admin/tasks?${params}`)
      setTasks(response.data.data || response.data || [])
    } catch (error) {
      console.error('Error loading tasks:', error)
      setTasks([])
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

  const handleMessageModerator = (task) => {
    const moderatorId = task.assigned_user?.id || task.assignedUser?.id
    if (moderatorId) {
      window.location.href = `/messages?moderator_id=${moderatorId}&task_id=${task.id}&type=message`
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

  return (
    <Box sx={{ p: 6 }}>
      <Typography variant='h4' gutterBottom>Tasks</Typography>

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 6 }}>
        <Tab label='Under Review' />
        <Tab label='Pending' />
        <Tab label='Approved' />
        <Tab label='Rejected' />
        <Tab label='Revision' />
      </Tabs>

      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <TaskCard activeTab={activeTab} />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TaskListTable
            tableData={tasks}
            onViewResult={handleViewResult}
            onMessageModerator={handleMessageModerator}
          />
        </Grid>
      </Grid>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Task Result - {selectedTask?.title}</DialogTitle>
        <DialogContent>
          {selectedTask?.result && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Answers</Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {typeof selectedTask.result.answers === 'object' 
                          ? JSON.stringify(selectedTask.result.answers, null, 2)
                          : selectedTask.result.answers || 'No answers provided'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                {selectedTask.result.screenshots && Array.isArray(selectedTask.result.screenshots) && selectedTask.result.screenshots.length > 0 && (
                  <Grid size={{ xs: 12 }}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Screenshots</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                          {selectedTask.result.screenshots.map((screenshot, index) => {
                            const imageUrl = typeof screenshot === 'string' 
                              ? (screenshot.startsWith('http') ? screenshot : `${API_URL}${screenshot}`)
                              : (screenshot.url || screenshot.path || '')
                            return (
                              <Box
                                key={index}
                                component="img"
                                src={imageUrl}
                                alt={`Screenshot ${index + 1}`}
                                sx={{
                                  maxWidth: 200,
                                  maxHeight: 200,
                                  objectFit: 'cover',
                                  border: '1px solid #ddd',
                                  borderRadius: 1,
                                  cursor: 'pointer',
                                }}
                                onClick={() => window.open(imageUrl, '_blank')}
                              />
                            )
                          })}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {selectedTask.result.attachments && Array.isArray(selectedTask.result.attachments) && selectedTask.result.attachments.length > 0 && (
                  <Grid size={{ xs: 12 }}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Attachments</Typography>
                        {selectedTask.result.attachments.map((attachment, index) => {
                          const fileUrl = typeof attachment === 'string'
                            ? (attachment.startsWith('http') ? attachment : `${API_URL}${attachment}`)
                            : (attachment.url || attachment.path || '')
                          return (
                            <Button
                              key={index}
                              variant="outlined"
                              startIcon={<i className="ri-file-line" />}
                              href={fileUrl}
                              target="_blank"
                              sx={{ mr: 1, mb: 1 }}
                            >
                              Attachment {index + 1}
                            </Button>
                          )
                        })}
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {selectedTask.result.moderator_comment && (
                  <Grid size={{ xs: 12 }}>
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
                  <Grid size={{ xs: 12 }}>
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

                <Grid size={{ xs: 12 }}>
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
          {selectedTask?.status === 'under_admin_review' && (
            <>
              <Button onClick={() => handleModerate('reject')} color="error">
                Reject
              </Button>
              <Button onClick={() => handleModerate('revision')} color="warning">
                Send for Revision
              </Button>
              <Button onClick={() => handleModerate('approve')} color="success" variant="contained">
                Approve
              </Button>
            </>
          )}
          {selectedTask?.status !== 'under_admin_review' && (
            <Button onClick={() => setDialogOpen(false)} variant="contained">
              Close
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  )
}
