'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Box, Typography, Grid, Card, CardContent, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton } from '@mui/material'
import api from '@/lib/api'
import { API_URL } from '@/lib/api'
import CustomAvatar from '@core/components/mui/Avatar'

export default function ModeratorTaskViewPage() {
  const params = useParams()
  const taskId = params.id
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reportData, setReportData] = useState({
    text: '',
    files: [],
  })

  useEffect(() => {
    if (taskId) {
      loadTask()
    }
  }, [taskId])

  const loadTask = async () => {
    try {
      const response = await api.get(`/moderator/tasks/${taskId}`)
      setTask(response.data)
    } catch (error) {
      console.error('Error loading task:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl)
    setImageDialogOpen(true)
  }

  const handleCreateReport = () => {
    setReportDialogOpen(true)
  }

  const handleSubmitReport = async () => {
    try {
      const formData = new FormData()
      formData.append('text', reportData.text)
      
      reportData.files.forEach((file, index) => {
        if (file instanceof File) {
          formData.append(`files[${index}]`, file)
        }
      })

      // This endpoint might need to be created on the backend
      await api.post(`/moderator/tasks/${taskId}/report`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setReportDialogOpen(false)
      setReportData({ text: '', files: [] })
      alert('Report created successfully')
    } catch (error) {
      console.error('Error creating report:', error)
      alert('Error creating report: ' + (error.response?.data?.message || error.message))
    }
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    setReportData(prev => ({
      ...prev,
      files: [...prev.files, ...files],
    }))
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'default',
      in_progress: 'warning',
      completed_by_moderator: 'info',
      under_admin_review: 'primary',
      approved: 'success',
      rejected: 'error',
      sent_for_revision: 'warning',
    }
    return colors[status] || 'default'
  }

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      in_progress: 'In Progress',
      completed_by_moderator: 'Completed by Moderator',
      under_admin_review: 'Under Admin Review',
      approved: 'Approved',
      rejected: 'Rejected',
      sent_for_revision: 'Sent for Revision',
    }
    return labels[status] || status
  }

  if (loading) {
    return <Box sx={{ p: 6 }}>Loading...</Box>
  }

  if (!task) {
    return <Box sx={{ p: 6 }}>Task not found</Box>
  }

  const images = []
  if (task.document_image) {
    images.push(task.document_image.startsWith('http') ? task.document_image : `${API_URL}/storage/${task.document_image}`)
  }
  if (task.selfie_image) {
    images.push(task.selfie_image.startsWith('http') ? task.selfie_image : `${API_URL}/storage/${task.selfie_image}`)
  }

  return (
    <Box sx={{ p: 6 }}>
      <Grid container spacing={6}>
        {/* Left Side - Task Info */}
        <Grid size={{ xs: 12, lg: 4, md: 5 }}>
          <Card>
            <CardContent className='flex flex-col pbs-12 gap-6'>
              <div className='flex flex-col gap-6'>
                <div className='flex items-center justify-center flex-col gap-4'>
                  <div className='flex flex-col items-center gap-4'>
                    <Typography variant='h5'>{task.title}</Typography>
                    <Chip 
                      label={getStatusLabel(task.status)} 
                      color={getStatusColor(task.status)}
                      size='small'
                      variant='tonal'
                    />
                  </div>
                </div>
              </div>
              <div>
                <Typography variant='h5'>Task Details</Typography>
                <div className='flex flex-col gap-2 mbs-4'>
                  {task.first_name && (
                    <div className='flex items-center flex-wrap gap-x-1.5'>
                      <Typography className='font-medium' color='text.primary'>
                        First Name:
                      </Typography>
                      <Typography>{task.first_name}</Typography>
                    </div>
                  )}
                  {task.last_name && (
                    <div className='flex items-center flex-wrap gap-x-1.5'>
                      <Typography className='font-medium' color='text.primary'>
                        Last Name:
                      </Typography>
                      <Typography>{task.last_name}</Typography>
                    </div>
                  )}
                  {task.email && (
                    <div className='flex items-center flex-wrap gap-x-1.5'>
                      <Typography className='font-medium' color='text.primary'>
                        Email:
                      </Typography>
                      <Typography>{task.email}</Typography>
                    </div>
                  )}
                  {task.country && (
                    <div className='flex items-center flex-wrap gap-x-1.5'>
                      <Typography className='font-medium' color='text.primary'>
                        Country:
                      </Typography>
                      <Typography>{task.country}</Typography>
                    </div>
                  )}
                  {task.address && (
                    <div className='flex items-center flex-wrap gap-x-1.5'>
                      <Typography className='font-medium' color='text.primary'>
                        Address:
                      </Typography>
                      <Typography>{task.address}</Typography>
                    </div>
                  )}
                  {task.phone_number && (
                    <div className='flex items-center flex-wrap gap-x-1.5'>
                      <Typography className='font-medium' color='text.primary'>
                        Phone Number:
                      </Typography>
                      <Typography>{task.phone_number}</Typography>
                    </div>
                  )}
                  {task.date_of_birth && (
                    <div className='flex items-center flex-wrap gap-x-1.5'>
                      <Typography className='font-medium' color='text.primary'>
                        Date of Birth:
                      </Typography>
                      <Typography>{new Date(task.date_of_birth).toLocaleDateString()}</Typography>
                    </div>
                  )}
                  {task.id_type && (
                    <div className='flex items-center flex-wrap gap-x-1.5'>
                      <Typography className='font-medium' color='text.primary'>
                        ID Type:
                      </Typography>
                      <Typography>{task.id_type}</Typography>
                    </div>
                  )}
                  {task.id_number && (
                    <div className='flex items-center flex-wrap gap-x-1.5'>
                      <Typography className='font-medium' color='text.primary'>
                        ID Number:
                      </Typography>
                      <Typography>{task.id_number}</Typography>
                    </div>
                  )}
                  {task.comment && (
                    <div className='flex items-center flex-wrap gap-x-1.5'>
                      <Typography className='font-medium' color='text.primary'>
                        Comment:
                      </Typography>
                      <Typography>{task.comment}</Typography>
                    </div>
                  )}
                  {task.price && (
                    <div className='flex items-center flex-wrap gap-x-1.5'>
                      <Typography className='font-medium' color='text.primary'>
                        Price:
                      </Typography>
                      <Typography>${task.price}</Typography>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Side - Additional Info */}
        <Grid size={{ xs: 12, lg: 8, md: 7 }}>
          <Grid container spacing={6}>
            {/* Additional Materials */}
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardContent>
                  <Typography variant='h6' gutterBottom>Additional Materials</Typography>
                  {task.documentation && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant='subtitle2'>Documentation:</Typography>
                      <Typography>{task.documentation.title}</Typography>
                    </Box>
                  )}
                  {task.tool && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant='subtitle2'>Tool:</Typography>
                      <Typography>{task.tool.name}</Typography>
                    </Box>
                  )}
                  {task.result?.admin_comment && task.status === 'sent_for_revision' && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                      <Typography variant='subtitle2' color='warning.dark'>Sent for re-checking</Typography>
                      <Typography variant='body2' sx={{ mt: 1 }}>{task.result.admin_comment}</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Images */}
            {images.length > 0 && (
              <Grid size={{ xs: 12 }}>
                <Card>
                  <CardContent>
                    <Typography variant='h6' gutterBottom>Images</Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
                      {images.map((imageUrl, index) => (
                        <Box
                          key={index}
                          onClick={() => handleImageClick(imageUrl)}
                          sx={{
                            width: 150,
                            height: 150,
                            cursor: 'pointer',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            overflow: 'hidden',
                            '&:hover': {
                              opacity: 0.8,
                            },
                          }}
                        >
                          <img
                            src={imageUrl}
                            alt={`Image ${index + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Create Report Button */}
            <Grid size={{ xs: 12 }}>
              <Button
                variant='contained'
                fullWidth
                onClick={handleCreateReport}
                startIcon={<i className='ri-file-add-line' />}
              >
                Create Report
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Image Fullscreen Dialog */}
      <Dialog open={imageDialogOpen} onClose={() => setImageDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <IconButton onClick={() => setImageDialogOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <i className='ri-close-line' />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedImage && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
              <img
                src={selectedImage}
                alt="Full size"
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Report Dialog */}
      <Dialog open={reportDialogOpen} onClose={() => setReportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Report</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={6}
            label="Report Text"
            value={reportData.text}
            onChange={(e) => setReportData({ ...reportData, text: e.target.value })}
            sx={{ mt: 2 }}
          />
          <Button
            variant="outlined"
            component="label"
            fullWidth
            startIcon={<i className='ri-file-line' />}
            sx={{ mt: 2 }}
          >
            Add Files (Images, Videos, Documents)
            <input
              type="file"
              hidden
              multiple
              onChange={handleFileChange}
            />
          </Button>
          {reportData.files.length > 0 && (
            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
              {reportData.files.length} file(s) selected
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setReportDialogOpen(false); setReportData({ text: '', files: [] }) }}>Cancel</Button>
          <Button onClick={handleSubmitReport} variant="contained">Submit Report</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

