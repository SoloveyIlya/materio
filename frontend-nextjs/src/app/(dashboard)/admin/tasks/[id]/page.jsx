'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardHeader,
  CardContent, 
  CardMedia,
  Chip, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  Paper,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Alert,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Checkbox,
  InputAdornment
} from '@mui/material'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
import api from '@/lib/api'
import { API_URL } from '@/lib/api'
import CustomAvatar from '@core/components/mui/Avatar'
import CustomTabList from '@/@core/components/mui/TabList'
import classnames from 'classnames'

export default function AdminTaskViewPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.id
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [activeTab, setActiveTab] = useState(0) // 0 = Task, 1 = Report
  const [selectedTool, setSelectedTool] = useState(null) // Для выбранного инструмента
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false)
  const [revisionComment, setRevisionComment] = useState('')
  const [currentTime, setCurrentTime] = useState(Date.now())

  useEffect(() => {
    if (taskId) {
      loadTask()
    }
  }, [taskId])

  // Автоматически выбираем первый тулз при загрузке задачи или переключении на вкладку Report
  useEffect(() => {
    if (task && activeTab === 1) {
      const taskTools = task.tools || (task.tool ? [task.tool] : [])
      if (taskTools.length > 0 && !selectedTool) {
        setSelectedTool(taskTools[0])
      }
    }
  }, [task, activeTab])

  // Обновляем время каждую секунду для таймера
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const loadTask = async () => {
    try {
      const response = await api.get(`/admin/tasks/${taskId}`)
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

  const handleApprove = async () => {
    try {
      await api.post(`/admin/tasks/${taskId}/moderate`, {
        action: 'approve'
      })
      await loadTask()
    } catch (error) {
      console.error('Error approving task:', error)
    }
  }

  const handleReject = async () => {
    try {
      await api.post(`/admin/tasks/${taskId}/moderate`, {
        action: 'reject'
      })
      await loadTask()
    } catch (error) {
      console.error('Error rejecting task:', error)
    }
  }

  const handleSendForRevision = async () => {
    try {
      await api.post(`/admin/tasks/${taskId}/moderate`, {
        action: 'revision',
        comment: revisionComment
      })
      setRevisionDialogOpen(false)
      setRevisionComment('')
      await loadTask()
    } catch (error) {
      console.error('Error sending task for revision:', error)
    }
  }

  const handleOpenRevisionDialog = () => {
    setRevisionDialogOpen(true)
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
      cancelled: 'default',
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
      cancelled: 'Cancelled',
    }
    return labels[status] || status
  }

  // Вычисляем оставшееся время до дедлайна (от момента получения задачи модератором)
  const getRemainingTime = () => {
    if (!task.assigned_at || !task.completion_hours) return null
    
    const assignedAt = new Date(task.assigned_at)
    const deadline = new Date(assignedAt.getTime() + task.completion_hours * 60 * 60 * 1000)
    const now = new Date(currentTime)
    const remainingMs = deadline.getTime() - now.getTime()
    
    if (remainingMs <= 0) return 'Expired'
    
    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60))
    const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (remainingHours > 0) {
      return `${remainingHours}h ${remainingMinutes}m`
    }
    return `${remainingMinutes}m`
  }

  if (loading) {
    return <Box sx={{ p: 6 }}>Loading...</Box>
  }

  if (!task) {
    return <Box sx={{ p: 6 }}>Task not found</Box>
  }


  // Получаем список инструментов (может быть task.tools или task.tool)
  const tools = task.tools || (task.tool ? [task.tool] : [])

  // Получаем данные для выбранного инструмента из результата
  const getToolData = (toolId) => {
    if (!task.result?.tool_data || !Array.isArray(task.result.tool_data)) return null
    return task.result.tool_data.find(td => td.tool_id === toolId)
  }

  // Функция для получения URL изображения
  const getImageUrl = (path) => {
    if (!path) return ''
    if (path.startsWith('http')) return path
    if (path.startsWith('/storage')) return `${API_URL}${path}`
    return `${API_URL}/storage/${path}`
  }

  // Рендер контента для Report
  const renderReportContent = () => {
    if (selectedTool) {
      // Показываем данные по выбранному инструменту
      const toolData = getToolData(selectedTool.id)
      return (
        <Card>
          <CardContent>
            <Typography variant='h5' gutterBottom>{selectedTool.name}</Typography>
            <Box sx={{ mt: 2 }}>
                    <Typography variant='body1' sx={{ whiteSpace: 'pre-wrap' }}>
                {toolData?.description || ''}
                    </Typography>
                  </Box>
          </CardContent>
        </Card>
      )
    }

        return (
              <Card>
                <CardContent>
          <Typography variant='body1' sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
            Select a tool from the list to view information
                  </Typography>
                </CardContent>
              </Card>
    )
  }

  return (
    <Box sx={{ p: 6 }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          variant='outlined'
          startIcon={<i className='ri-arrow-left-line' />}
          onClick={() => router.back()}
        >
          Back
        </Button>
      </Box>

      {/* Header Section - баннер, аватар, имя, кнопки в стиле шаблона */}
      <Card sx={{ mb: 4, overflow: 'hidden' }}>
        <CardMedia 
          image='/images/pages/profile-banner.png'
          sx={{ 
            height: 250,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.5))',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              padding: 4,
              paddingTop: 6,
              textAlign: 'center',
            }}
          >
            <Typography 
              variant='h3' 
              sx={{ 
                color: 'white', 
                fontWeight: 700,
                mb: 2,
                textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
              }}
            >
              {task.title || 'Task'}
            </Typography>
            {task.categories?.length > 0 && (
              <Chip
                label={task.categories[0].name}
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                  color: 'primary.main',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  height: 32,
                }}
              />
            )}
          </Box>
        </CardMedia>
        <CardContent className='flex gap-6 justify-center flex-col items-center md:items-end md:flex-row !pt-0 md:justify-start'>
          <div className='flex rounded-bs-md mbs-[-45px] border-[5px] border-backgroundPaper bg-backgroundPaper'>
            <CustomAvatar 
              src={task.assigned_user?.avatar}
              sx={{ width: 120, height: 120 }}
            >
              {task.assigned_user?.name ? task.assigned_user.name.charAt(0).toUpperCase() : 'M'}
            </CustomAvatar>
          </div>
          <div className='flex is-full flex-wrap justify-center flex-col items-center sm:flex-row sm:justify-between sm:items-end gap-5'>
                  <div className='flex flex-col items-center sm:items-start gap-2' style={{ marginTop: '20px' }}>
                    <Typography variant='h4'>{task.assigned_user?.name || task.assigned_user?.email || 'Moderator'}</Typography>
                  </div>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'row', 
                    gap: 2, 
                    alignItems: 'center', 
                    flexWrap: 'wrap', 
                    justifyContent: 'flex-end',
                    ml: 'auto',
                    width: { xs: '100%', sm: 'auto' }, 
                    mt: { xs: 2, sm: 0 } 
                  }}>
                    <Chip 
                      label={getStatusLabel(task.status)} 
                      color={getStatusColor(task.status)}
                      size='medium'
                      variant='tonal'
                    />
                    {task.assigned_at && task.completion_hours && (
                      <Chip 
                        label={`Completions Time: ${getRemainingTime()}`}
                        size='medium'
                        variant='tonal'
                        sx={{
                          bgcolor: 'action.hover',
                          color: 'text.primary',
                        }}
                      />
                    )}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <Button 
                        variant='contained' 
                        color='success'
                        onClick={handleApprove}
                        disabled={task.status === 'approved' || task.status === 'rejected'}
                        startIcon={<i className='ri-check-line' />}
                      >
                        Approve
                      </Button>
                      <Button 
                        variant='contained' 
                        color='error'
                        onClick={handleReject}
                        disabled={task.status === 'approved' || task.status === 'rejected'}
                        startIcon={<i className='ri-close-line' />}
                      >
                        Reject
                      </Button>
                      <Button 
                        variant='contained' 
                        color='warning'
                        onClick={handleOpenRevisionDialog}
                        disabled={task.status === 'approved' || task.status === 'rejected'}
                        startIcon={<i className='ri-send-plane-line' />}
                      >
                        Send for Revision
                      </Button>
                    </Box>
                  </Box>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <TabContext value={activeTab.toString()}>
        <Box sx={{ mb: 4 }}>
          <CustomTabList onChange={(e, newValue) => setActiveTab(parseInt(newValue))} variant='scrollable' pill='true'>
            <Tab
              label={
                <div className='flex items-center gap-1.5'>
                  <i className='ri-task-line text-lg' />
                  Task
                </div>
              }
              value='0'
            />
            <Tab
              label={
                <div className='flex items-center gap-1.5'>
                  <i className='ri-file-text-line text-lg' />
                  Report
                </div>
              }
              value='1'
            />
          </CustomTabList>
        </Box>

      {/* Tab: Task */}
      <TabPanel value='0' className='p-0'>
        <Grid container spacing={6}>
          {/* Left Side - Task Info в стиле user profile AboutOverview */}
          <Grid size={{ xs: 12, md: 5, lg: 4 }}>
            <Grid container spacing={6}>
              {/* About Card */}
              <Grid size={{ xs: 12 }}>
                <Card>
                  <CardContent className='flex flex-col gap-6'>
                    <div className='flex flex-col gap-4'>
                      <Typography variant='caption' className='uppercase'>
                        About
                      </Typography>
                      {task.first_name && (
                        <div className='flex items-center gap-2'>
                          <i className='ri-user-line text-textSecondary' />
                          <div className='flex items-center flex-wrap gap-2'>
                            <Typography className='font-medium'>First name:</Typography>
                            <Typography>{task.first_name}</Typography>
                          </div>
                        </div>
                      )}
                      {task.last_name && (
                        <div className='flex items-center gap-2'>
                          <i className='ri-user-line text-textSecondary' />
                          <div className='flex items-center flex-wrap gap-2'>
                            <Typography className='font-medium'>Last name:</Typography>
                            <Typography>{task.last_name}</Typography>
                          </div>
                        </div>
                      )}
                      {task.date_of_birth && (
                        <div className='flex items-center gap-2'>
                          <i className='ri-calendar-line text-textSecondary' />
                          <div className='flex items-center flex-wrap gap-2'>
                            <Typography className='font-medium'>Date of birth:</Typography>
                            <Typography>{new Date(task.date_of_birth).toLocaleDateString()}</Typography>
                          </div>
                        </div>
                      )}
                      {task.country && (
                        <div className='flex items-center gap-2'>
                          <i className='ri-map-pin-line text-textSecondary' />
                          <div className='flex items-center flex-wrap gap-2'>
                            <Typography className='font-medium'>Country:</Typography>
                            <Typography>{task.country}</Typography>
                          </div>
                        </div>
                      )}
                      {task.address && (
                        <div className='flex items-center gap-2'>
                          <i className='ri-community-line text-textSecondary' />
                          <div className='flex items-center flex-wrap gap-2'>
                            <Typography className='font-medium'>Address:</Typography>
                            <Typography>{task.address}</Typography>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className='flex flex-col gap-4'>
                      <Typography variant='caption' className='uppercase'>
                        Contacts
                      </Typography>
                      {task.phone_number && (
                        <div className='flex items-center gap-2'>
                          <i className='ri-phone-line text-textSecondary' />
                          <div className='flex items-center flex-wrap gap-2'>
                            <Typography className='font-medium'>Phone number:</Typography>
                            <Typography>{task.phone_number}</Typography>
                          </div>
                        </div>
                      )}
                      {task.email && (
                        <div className='flex items-center gap-2'>
                          <i className='ri-mail-line text-textSecondary' />
                          <div className='flex items-center flex-wrap gap-2'>
                            <Typography className='font-medium'>Email:</Typography>
                            <Typography>{task.email}</Typography>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Grid>

              {/* Price and Comment Card */}
              <Grid size={{ xs: 12 }}>
                <Card>
                  <CardContent className='flex flex-col gap-6'>
                    {task.price && (
                      <div className='flex flex-col gap-4'>
                        <Typography variant='caption' className='uppercase'>
                          Price
                        </Typography>
                        <div className='flex items-center gap-2'>
                          <i className='ri-money-dollar-circle-line text-textSecondary' />
                          <div className='flex items-center flex-wrap gap-2'>
                            <Typography className='font-medium'>Price:</Typography>
                            <Typography>${task.price}</Typography>
                          </div>
                        </div>
                      </div>
                    )}
                    {task.comment && (
                      <div className='flex flex-col gap-4'>
                        <Typography variant='caption' className='uppercase'>
                          Comment
                        </Typography>
                        <div className='flex items-start gap-2'>
                          <i className='ri-message-3-line text-textSecondary' style={{ marginTop: '4px' }} />
                          <Typography sx={{ whiteSpace: 'pre-wrap' }}>{task.comment}</Typography>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Grid>

            </Grid>
          </Grid>

          {/* Right Side - Additional Info */}
          <Grid size={{ xs: 12, lg: 8, md: 7 }}>
            <Grid container spacing={6}>
              {/* Additional Materials */}
              <Grid size={{ xs: 12 }}>
                <Card>
                  <CardContent>
                    <Typography variant='h6' gutterBottom sx={{ mb: 4 }}>Additional Materials</Typography>
                    
                    <Box sx={{ position: 'relative', pl: 2 }}>
                      {/* Documentation Section */}
                      {task.documentation && (
                        <Box sx={{ mb: 4, position: 'relative' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  bgcolor: '#4CAF50',
                                  flexShrink: 0,
                                  zIndex: 2
                                }}
                              />
                              {(() => {
                                const hasNextSections = (task.result?.admin_comment && task.status === 'sent_for_revision') || 
                                                       task.result?.moderator_comment || 
                                                       task.result?.answers;
                                if (!hasNextSections) return null;
                                
                                let height = 60; // Base height
                                if (task.result?.admin_comment && task.status === 'sent_for_revision') height += 40;
                                if (task.result?.moderator_comment) height += 40;
                                if (task.result?.answers) height += 40;
                                
                                return (
                                  <Box
                                    sx={{
                                      position: 'absolute',
                                      left: 5,
                                      top: 12,
                                      width: 2,
                                      height: height,
                                      bgcolor: '#E0E0E0',
                                      zIndex: 1
                                    }}
                                  />
                                );
                              })()}
                            </Box>
                            <Typography 
                              variant='h6' 
                              sx={{ 
                                fontWeight: 700, 
                                color: '#000',
                                fontSize: '1.1rem'
                              }}
                            >
                              Документация
                            </Typography>
                          </Box>
                          <Box sx={{ pl: 4, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <i className='ri-file-text-line' style={{ fontSize: '20px', color: '#4CAF50' }} />
                              <Typography variant='body1'>{task.documentation.title}</Typography>
                            </Box>
                          </Box>
                        </Box>
                      )}

                      {/* Tools Section */}
                      {tools.length > 0 && (
                        <Box sx={{ mb: 4, position: 'relative' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  bgcolor: '#2196F3',
                                  flexShrink: 0,
                                  zIndex: 2
                                }}
                              />
                              {(() => {
                                const hasNextSections = (task.result?.admin_comment && task.status === 'sent_for_revision') || 
                                                       task.result?.moderator_comment || 
                                                       task.result?.answers;
                                if (!hasNextSections) return null;
                                
                                let height = 60; // Base height
                                if (task.result?.admin_comment && task.status === 'sent_for_revision') height += 40;
                                if (task.result?.moderator_comment) height += 40;
                                if (task.result?.answers) height += 40;
                                
                                return (
                                  <Box
                                    sx={{
                                      position: 'absolute',
                                      left: 5,
                                      top: 12,
                                      width: 2,
                                      height: height,
                                      bgcolor: '#E0E0E0',
                                      zIndex: 1
                                    }}
                                  />
                                );
                              })()}
                            </Box>
                            <Typography 
                              variant='h6' 
                              sx={{ 
                                fontWeight: 700, 
                                color: '#000',
                                fontSize: '1.1rem'
                              }}
                            >
                              Tools
                            </Typography>
                          </Box>
                          <Box sx={{ pl: 4, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {tools.map((tool, index) => (
                              <Box key={tool.id || index} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <i className='ri-tools-line' style={{ fontSize: '20px', color: '#2196F3' }} />
                                <Typography variant='body1'>{tool.name}</Typography>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      )}

                      {/* Revision Section */}
                      {task.result?.admin_comment && task.status === 'sent_for_revision' && (
                        <Box sx={{ mb: 4, position: 'relative' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  bgcolor: '#FF9800',
                                  flexShrink: 0,
                                  zIndex: 2
                                }}
                              />
                              {(task.result?.moderator_comment || task.result?.answers) && (
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    left: 5,
                                    top: 12,
                                    width: 2,
                                    height: task.result?.moderator_comment && task.result?.answers ? 100 : 60,
                                    bgcolor: '#E0E0E0',
                                    zIndex: 1
                                  }}
                                />
                              )}
                            </Box>
                            <Typography 
                              variant='h6' 
                              sx={{ 
                                fontWeight: 700, 
                                color: '#000',
                                fontSize: '1.1rem'
                              }}
                            >
                              Отправка на исправление
                            </Typography>
                          </Box>
                          <Box sx={{ pl: 4, mt: 1 }}>
                            <Typography variant='body2' sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                              {task.result.admin_comment}
                            </Typography>
                          </Box>
                        </Box>
                      )}

                      {/* Moderator Comment Section */}
                      {task.result?.moderator_comment && (
                        <Box sx={{ mb: 4, position: 'relative' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  bgcolor: '#9C27B0',
                                  flexShrink: 0,
                                  zIndex: 2
                                }}
                              />
                              {task.result?.answers && (
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    left: 5,
                                    top: 12,
                                    width: 2,
                                    height: 60,
                                    bgcolor: '#E0E0E0',
                                    zIndex: 1
                                  }}
                                />
                              )}
                            </Box>
                            <Typography 
                              variant='h6' 
                              sx={{ 
                                fontWeight: 700, 
                                color: '#000',
                                fontSize: '1.1rem'
                              }}
                            >
                              Moderator Comment
                            </Typography>
                          </Box>
                          <Box sx={{ pl: 4, mt: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                              <i className='ri-message-3-line' style={{ fontSize: '20px', color: '#9C27B0', marginTop: '2px' }} />
                              <Typography variant='body2' sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                                {task.result.moderator_comment}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      )}

                      {/* Answers Section */}
                      {task.result?.answers && (
                        <Box sx={{ position: 'relative' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                bgcolor: '#3F51B5',
                                flexShrink: 0
                              }}
                            />
                            <Typography 
                              variant='h6' 
                              sx={{ 
                                fontWeight: 700, 
                                color: '#000',
                                fontSize: '1.1rem'
                              }}
                            >
                              Answers
                            </Typography>
                          </Box>
                          <Box sx={{ pl: 4, mt: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                              <i className='ri-question-answer-line' style={{ fontSize: '20px', color: '#3F51B5', marginTop: '2px' }} />
                              <Typography 
                                variant='body2' 
                                sx={{ 
                                  whiteSpace: 'pre-wrap', 
                                  bgcolor: 'action.hover', 
                                  p: 2, 
                                  borderRadius: 1,
                                  color: 'text.secondary',
                                  lineHeight: 1.7,
                                  flex: 1
                                }}
                              >
                                {typeof task.result.answers === 'object' 
                                  ? JSON.stringify(task.result.answers, null, 2)
                                  : task.result.answers}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* ID Type - Separate Card */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Box
                  sx={{
                    backgroundColor: 'background.paper',
                    borderRadius: '8px',
                    padding: '24px',
                    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography 
                    variant='h6' 
                    gutterBottom
                    sx={{
                      fontSize: '1.25rem',
                      fontWeight: 600,
                      marginBottom: '16px',
                      color: 'text.primary',
                    }}
                  >
                    ID Type
                  </Typography>
                  <Typography 
                    variant='body1'
                    sx={{
                      marginBottom: '16px',
                      color: 'text.secondary',
                      fontSize: '1rem',
                    }}
                  >
                    {task.id_type || 'N/A'}
                  </Typography>
                  {task.document_image && (
                    <Box
                      onClick={() => handleImageClick(getImageUrl(task.document_image))}
                      sx={{
                        width: '100%',
                        maxHeight: '400px',
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '200px',
                        backgroundColor: 'action.hover',
                        transition: 'opacity 0.2s',
                        '&:hover': {
                          opacity: 0.8,
                        },
                      }}
                    >
                      <img
                        src={getImageUrl(task.document_image)}
                        alt='Passport photo'
                        style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
                      />
                    </Box>
                  )}
                </Box>
              </Grid>

              {/* ID Number - Separate Card */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Box
                  sx={{
                    backgroundColor: 'background.paper',
                    borderRadius: '8px',
                    padding: '24px',
                    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography 
                    variant='h6' 
                    gutterBottom
                    sx={{
                      fontSize: '1.25rem',
                      fontWeight: 600,
                      marginBottom: '16px',
                      color: 'text.primary',
                    }}
                  >
                    ID Number
                  </Typography>
                  <Typography 
                    variant='body1'
                    sx={{
                      marginBottom: '16px',
                      color: 'text.secondary',
                      fontSize: '1rem',
                    }}
                  >
                    {task.id_number || 'N/A'}
                  </Typography>
                  {task.selfie_image && (
                    <Box
                      onClick={() => handleImageClick(getImageUrl(task.selfie_image))}
                      sx={{
                        width: '100%',
                        maxHeight: '400px',
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '200px',
                        backgroundColor: 'action.hover',
                        transition: 'opacity 0.2s',
                        '&:hover': {
                          opacity: 0.8,
                        },
                      }}
                    >
                      <img
                        src={getImageUrl(task.selfie_image)}
                        alt='ID number photo'
                        style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
                      />
                    </Box>
                  )}
                </Box>
              </Grid>

              {/* Video */}
              {task.video && (
                <Grid size={{ xs: 12 }}>
                  <Card>
                    <CardContent>
                      <Typography variant='h6' gutterBottom>Video</Typography>
                      <Box sx={{ mt: 2 }}>
                          <Box
                            sx={{
                            width: '100%',
                            maxWidth: '800px',
                            position: 'relative',
                            paddingTop: '56.25%', // 16:9 aspect ratio
                            backgroundColor: 'action.hover',
                              borderRadius: 1,
                              overflow: 'hidden',
                            border: '1px solid',
                            borderColor: 'divider',
                            }}
                          >
                          <video
                            controls
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                            }}
                            src={getImageUrl(task.video)}
                          >
                            Your browser does not support the video tag.
                          </video>
                          </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}
                </Grid>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab: Report */}
      <TabPanel value='1' className='p-0'>
        <Box>

          {/* Report Content - две колонки */}
          <Grid container spacing={4}>
            {/* Left Column - Tools */}
            <Grid size={{ xs: 12, md: 4, lg: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant='h6' gutterBottom sx={{ mb: 3 }}>Tools</Typography>
                  <List className='gap-2'>
                        {tools.map((tool) => (
                          <ListItem key={tool.id} disablePadding className='mbe-1'>
                            <ListItemButton 
                              selected={selectedTool?.id === tool.id}
                          onClick={() => setSelectedTool(tool)}
                              className={classnames({
                                'bg-primaryLightOpacity': selectedTool?.id === tool.id
                              })}
                            >
                              <ListItemIcon>
                                <i className='ri-tools-line text-xl' />
                              </ListItemIcon>
                              <ListItemText primary={tool.name} />
                            </ListItemButton>
                          </ListItem>
                        ))}
                  </List>
                  
                  {/* Divider after tools */}
                  {tools.length > 0 && (
                    <Divider sx={{ my: 3 }} />
                  )}
                  
                  {/* Additionally Section */}
                  <Box>
                    <Typography variant='h6' gutterBottom sx={{ mb: 2 }}>Additionally</Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={6}
                      placeholder='Enter additional information...'
                      value={task.result?.additional_info || ''}
                      disabled
                      sx={{ 
                        '& .MuiInputBase-input': { 
                          color: 'text.secondary',
                          cursor: 'not-allowed'
                        } 
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Right Column - Content */}
            <Grid size={{ xs: 12, md: 8, lg: 9 }}>
              {renderReportContent()}
            </Grid>
          </Grid>
        </Box>
      </TabPanel>
      </TabContext>

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

      {/* Revision Dialog */}
      <Dialog 
        open={revisionDialogOpen} 
        onClose={() => {
          setRevisionDialogOpen(false)
          setRevisionComment('')
        }}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiDialog-container': {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }
        }}
      >
        <DialogTitle>
          Send for Revision
        </DialogTitle>
        <DialogContent>
          <Typography variant='body2' sx={{ mb: 2 }}>
            Please specify the reason why the task is being sent for revision:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label='Причина отправки на доработку'
            value={revisionComment}
            onChange={(e) => setRevisionComment(e.target.value)}
            placeholder='Введите причину...'
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setRevisionDialogOpen(false)
            setRevisionComment('')
          }}>
            Отмена
          </Button>
          <Button 
            variant='contained' 
            color='warning'
            onClick={handleSendForRevision}
            disabled={!revisionComment.trim()}
          >
            Отправить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

