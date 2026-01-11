'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Box, Typography, Grid, Card, CardContent, CardMedia, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, List, ListItem, ListItemButton, ListItemText, ListItemIcon, Divider } from '@mui/material'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
import api from '@/lib/api'
import { API_URL } from '@/lib/api'
import CustomAvatar from '@core/components/mui/Avatar'
import CustomTabList from '@/@core/components/mui/TabList'
import classnames from 'classnames'

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
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [activeTab, setActiveTab] = useState(0) // 0 = Task, 1 = Report
  const [selectedTool, setSelectedTool] = useState(null) // Для выбранного инструмента
  const [additionalInfo, setAdditionalInfo] = useState('') // Локальное состояние для дополнительной информации
  const [toolDescriptions, setToolDescriptions] = useState({}) // Локальное состояние для описаний инструментов
  const [pendingToolDescription, setPendingToolDescription] = useState(null) // Отложенное сохранение инструмента
  const [pendingAdditionalInfo, setPendingAdditionalInfo] = useState(null) // Отложенное сохранение дополнительной информации

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
      // Обновляем локальные состояния только при первой загрузке или переключении вкладки
      // Не перезаписываем, если пользователь уже редактирует
      if (task.result) {
        // Обновляем additionalInfo только если он пустой или совпадает с сохраненным
        const savedAdditionalInfo = task.result.additional_info || ''
        if (additionalInfo === '' || additionalInfo === savedAdditionalInfo) {
          setAdditionalInfo(savedAdditionalInfo)
        }
        
        if (task.result.tool_data && Array.isArray(task.result.tool_data)) {
          const toolDescs = {}
          task.result.tool_data.forEach(td => {
            if (td.tool_id) {
              toolDescs[td.tool_id] = td.description || ''
            }
          })
          // Обновляем только те инструменты, которые не были изменены пользователем
          setToolDescriptions(prev => {
            const updated = { ...prev }
            Object.keys(toolDescs).forEach(toolId => {
              // Обновляем только если значение не было изменено пользователем
              if (!prev[toolId] || prev[toolId] === toolDescs[toolId]) {
                updated[toolId] = toolDescs[toolId]
              }
            })
            return updated
          })
        }
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

  // Debounce сохранение данных инструмента
  useEffect(() => {
    if (pendingToolDescription === null) return

    const timer = setTimeout(async () => {
      try {
        await api.put(`/moderator/tasks/${taskId}/report/tool`, {
          tool_id: pendingToolDescription.toolId,
          description: pendingToolDescription.description
        })
        // Обновляем локальное состояние задачи БЕЗ перезаписи локальных состояний
        // Это предотвратит сброс того, что пользователь вводит
        setTask(prev => {
          const result = prev.result || {}
          const tool_data = result.tool_data || []
          const existingIndex = tool_data.findIndex(td => td.tool_id === pendingToolDescription.toolId)
          
          let newToolData
          if (existingIndex >= 0) {
            newToolData = [...tool_data]
            newToolData[existingIndex] = {
              ...newToolData[existingIndex],
              description: pendingToolDescription.description
            }
          } else {
            newToolData = [...tool_data, {
              tool_id: pendingToolDescription.toolId,
              description: pendingToolDescription.description
            }]
          }
          
          return {
            ...prev,
            result: {
              ...result,
              tool_data: newToolData
            }
          }
        })
        // НЕ обновляем toolDescriptions здесь - они уже актуальны
      } catch (error) {
        console.error('Error saving tool data:', error)
        // При ошибке откатываем к сохраненному значению
        const toolData = task?.result?.tool_data?.find(td => td.tool_id === pendingToolDescription.toolId)
        setToolDescriptions(prev => ({
          ...prev,
          [pendingToolDescription.toolId]: toolData?.description || ''
        }))
      } finally {
        setPendingToolDescription(null)
      }
    }, 1000) // Задержка 1 секунда

    return () => clearTimeout(timer)
  }, [pendingToolDescription, taskId, task])

  // Debounce сохранение дополнительной информации
  useEffect(() => {
    if (pendingAdditionalInfo === null) return

    const timer = setTimeout(async () => {
      try {
        await api.put(`/moderator/tasks/${taskId}/report/additional`, {
          additional_info: pendingAdditionalInfo
        })
        // Обновляем локальное состояние задачи БЕЗ перезаписи локального состояния
        // Это предотвратит сброс того, что пользователь вводит
        setTask(prev => ({
          ...prev,
          result: {
            ...(prev.result || {}),
            additional_info: pendingAdditionalInfo
          }
        }))
        // НЕ обновляем additionalInfo здесь - оно уже актуально
      } catch (error) {
        console.error('Error saving additional info:', error)
        // При ошибке откатываем к сохраненному значению
        setAdditionalInfo(task?.result?.additional_info || '')
      } finally {
        setPendingAdditionalInfo(null)
      }
    }, 1000) // Задержка 1 секунда

    return () => clearTimeout(timer)
  }, [pendingAdditionalInfo, taskId, task])

  const loadTask = async () => {
    try {
      const response = await api.get(`/moderator/tasks/${taskId}`)
      setTask(response.data)
      // Инициализируем локальное состояние из результата задачи
      if (response.data?.result) {
        setAdditionalInfo(response.data.result.additional_info || '')
        // Инициализируем описания инструментов
        if (response.data.result.tool_data && Array.isArray(response.data.result.tool_data)) {
          const toolDescs = {}
          response.data.result.tool_data.forEach(td => {
            if (td.tool_id) {
              toolDescs[td.tool_id] = td.description || ''
            }
          })
          setToolDescriptions(toolDescs)
        }
      } else {
        setAdditionalInfo('')
        setToolDescriptions({})
      }
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

  const images = []
  if (task.document_image) {
    images.push(task.document_image.startsWith('http') ? task.document_image : `${API_URL}/storage/${task.document_image}`)
  }
  if (task.selfie_image) {
    images.push(task.selfie_image.startsWith('http') ? task.selfie_image : `${API_URL}/storage/${task.selfie_image}`)
  }

  // Получаем список инструментов (может быть task.tools или task.tool)
  const tools = task.tools || (task.tool ? [task.tool] : [])

  // Функция для получения URL изображения
  const getImageUrl = (path) => {
    if (!path) return ''
    if (path.startsWith('http')) return path
    if (path.startsWith('/storage')) return `${API_URL}${path}`
    return `${API_URL}/storage/${path}`
  }

  // Получаем первую категорию для отображения
  const category = task.categories?.length > 0 ? task.categories[0] : (task.category || null)

  // Получаем данные для выбранного инструмента из результата
  const getToolData = (toolId) => {
    if (!task.result?.tool_data || !Array.isArray(task.result.tool_data)) return null
    return task.result.tool_data.find(td => td.tool_id === toolId)
  }

  return (
    <Box sx={{ p: 6 }}>
      {/* Header Section - баннер с title и категорией */}
      <Card sx={{ mb: 4, overflow: 'hidden' }}>
        <CardMedia 
          image='/images/pages/profile-banner.png'
          sx={{ 
            height: 250,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
              justifyContent: 'center',
              padding: 4,
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
            {category && (
              <Chip
                label={category.name}
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
      </Card>

      {/* Tabs */}
      <TabContext value={activeTab.toString()}>
        <CustomTabList
          onChange={(e, newValue) => setActiveTab(parseInt(newValue))}
          aria-label='task tabs'
        >
          <Tab value='0' label='Task' />
          <Tab value='1' label='Report' />
        </CustomTabList>

        {/* Tab: Task */}
        <TabPanel value='0' className='p-0'>
          <Grid container spacing={6}>
        {/* Left Side - Task Info */}
        <Grid size={{ xs: 12, lg: 4, md: 5 }}>
          <Card>
            <CardContent className='flex flex-col pbs-12 gap-6'>
              <div className='flex flex-col gap-6'>
                <div className='flex items-center justify-center flex-col gap-4'>
                  <div className='flex flex-col items-center gap-4'>
                    <Typography variant='h5'>{task.title}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <Chip 
                        label={getStatusLabel(task.status)} 
                        color={getStatusColor(task.status)}
                        size='small'
                        variant='tonal'
                      />
                      {task.assigned_at && task.completion_hours && (
                        <Chip 
                          label={`Completions Time: ${getRemainingTime()}`}
                          size='small'
                          variant='tonal'
                          sx={{
                            bgcolor: 'action.hover',
                            color: 'text.primary',
                          }}
                        />
                      )}
                    </Box>
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
                            {(task.tool || (task.result?.admin_comment && task.status === 'sent_for_revision')) && (
                              <Box
                                sx={{
                                  position: 'absolute',
                                  left: 5,
                                  top: 12,
                                  width: 2,
                                  height: task.tool ? 80 : 60,
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
                              color: 'text.primary',
                              fontSize: '1.1rem'
                            }}
                          >
                            Документация
                          </Typography>
                        </Box>
                        <Box sx={{ pl: 4, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <i className='ri-file-text-line' style={{ fontSize: '20px', color: '#4CAF50' }} />
                            <Typography variant='body1' sx={{ color: 'text.primary' }}>{task.documentation.title}</Typography>
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
                            {task.result?.admin_comment && task.status === 'sent_for_revision' && (
                              <Box
                                sx={{
                                  position: 'absolute',
                                  left: 5,
                                  top: 12,
                                  width: 2,
                                  height: 40,
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
                              color: 'text.primary',
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
                              <Typography variant='body1' sx={{ color: 'text.primary' }}>{tool.name}</Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}

                    {/* Revision Section */}
                    {task.result?.admin_comment && task.status === 'sent_for_revision' && (
                      <Box sx={{ position: 'relative' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              bgcolor: '#FF9800',
                              flexShrink: 0
                            }}
                          />
                          <Typography 
                            variant='h6' 
                            sx={{ 
                              fontWeight: 700, 
                              color: 'text.primary',
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
                <Box
                  onClick={() => task.document_image && handleImageClick(getImageUrl(task.document_image))}
                  sx={{
                    width: '100%',
                    maxHeight: '400px',
                    cursor: task.document_image ? 'pointer' : 'default',
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
                      opacity: task.document_image ? 0.8 : 1,
                    },
                  }}
                >
                  {task.document_image ? (
                    <img
                      src={getImageUrl(task.document_image)}
                      alt='Passport photo'
                      style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
                    />
                  ) : (
                    <Box sx={{ textAlign: 'center', padding: '16px' }}>
                      <i className='ri-image-line' style={{ fontSize: '48px', color: 'rgba(0, 0, 0, 0.38)', opacity: 0.5 }} />
                      <Typography 
                        variant='body2'
                        sx={{
                          marginTop: '8px',
                          color: 'text.secondary',
                          fontSize: '0.875rem',
                        }}
                      >
                        No image available
                      </Typography>
                    </Box>
                  )}
                </Box>
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
                <Box
                  onClick={() => task.document_image && handleImageClick(getImageUrl(task.document_image))}
                  sx={{
                    width: '100%',
                    maxHeight: '400px',
                    cursor: task.document_image ? 'pointer' : 'default',
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
                      opacity: task.document_image ? 0.8 : 1,
                    },
                  }}
                >
                  {task.document_image ? (
                    <img
                      src={getImageUrl(task.document_image)}
                      alt='ID number photo'
                      style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
                    />
                  ) : (
                    <Box sx={{ textAlign: 'center', padding: '16px' }}>
                      <i className='ri-image-line' style={{ fontSize: '48px', color: 'rgba(0, 0, 0, 0.38)', opacity: 0.5 }} />
                      <Typography 
                        variant='body2'
                        sx={{
                          marginTop: '8px',
                          color: 'text.secondary',
                          fontSize: '0.875rem',
                        }}
                      >
                        No image available
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Grid>

            {/* Moderator Comment and Answers */}
            {task.result && (
              <>
                {/* Moderator Comment */}
                {task.result.moderator_comment && (
                  <Grid size={{ xs: 12 }}>
                    <Card>
                      <CardContent>
                        <Typography variant='h6' gutterBottom>Moderator Comment</Typography>
                        <Typography variant='body1' sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}>
                          {task.result.moderator_comment}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Answers */}
                {task.result.answers && (
                  <Grid size={{ xs: 12 }}>
                    <Card>
                      <CardContent>
                        <Typography variant='h6' gutterBottom>Answers</Typography>
                        <Box
                          sx={{
                            bgcolor: 'action.hover',
                            p: 2,
                            borderRadius: 1,
                            mt: 2,
                          }}
                        >
                          <Typography
                            variant='body2'
                            component='pre'
                            sx={{
                              whiteSpace: 'pre-wrap',
                              fontFamily: 'monospace',
                              color: 'text.secondary',
                              margin: 0,
                            }}
                          >
                            {typeof task.result.answers === 'object'
                              ? JSON.stringify(task.result.answers, null, 2)
                              : task.result.answers}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </>
            )}

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

          </Grid>
        </Grid>
      </Grid>
      </TabPanel>

      {/* Tab: Report */}
      <TabPanel value='1' className='p-0'>
        <Box>
          <Grid container spacing={4}>
            {/* Left Column - Tools */}
            <Grid size={{ xs: 12, md: 4, lg: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant='h6' gutterBottom sx={{ mb: 3 }}>Tools</Typography>
                  <List className='gap-2'>
                    {tools.map((tool, index) => (
                      <ListItem key={tool.id || index} disablePadding className='mbe-1'>
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
                      value={additionalInfo}
                      onChange={(e) => {
                        const value = e.target.value
                        setAdditionalInfo(value)
                        // Откладываем сохранение (debounce)
                        setPendingAdditionalInfo(value)
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Right Column - Tool Content */}
            <Grid size={{ xs: 12, md: 8, lg: 9 }}>
              {selectedTool ? (
                <Card>
                  <CardContent>
                    <Typography variant='h5' gutterBottom>{selectedTool.name}</Typography>
                    {(() => {
                      const toolData = getToolData(selectedTool.id)
                      const currentDescription = toolDescriptions[selectedTool.id] || toolData?.description || ''
                      return (
                        <Box sx={{ mt: 2 }}>
                          <TextField
                            fullWidth
                            multiline
                            rows={10}
                            placeholder='Enter information for this tool...'
                            value={currentDescription}
                            onChange={(e) => {
                              const value = e.target.value
                              // Обновляем локальное состояние немедленно для отображения
                              setToolDescriptions(prev => ({
                                ...prev,
                                [selectedTool.id]: value
                              }))
                              // Откладываем сохранение на сервер (debounce)
                              setPendingToolDescription({
                                toolId: selectedTool.id,
                                description: value
                              })
                            }}
                          />
                          
                          {/* Submit Button - под полем ввода тулзы */}
                          {task.status === 'in_progress' && (
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
                              <Button
                                variant='contained'
                                color='primary'
                                size='large'
                                onClick={async () => {
                                  try {
                                    // Сначала сохраняем все несохранённые изменения
                                    const tools = task.tools || (task.tool ? [task.tool] : [])
                                    
                                    // Сохраняем все описания инструментов, которые есть в toolDescriptions
                                    for (const [toolId, description] of Object.entries(toolDescriptions)) {
                                      const tool = tools.find(t => t.id === parseInt(toolId))
                                      if (tool) {
                                        try {
                                          await api.put(`/moderator/tasks/${taskId}/report/tool`, {
                                            tool_id: parseInt(toolId),
                                            description: description
                                          })
                                        } catch (err) {
                                          console.error(`Error saving tool ${toolId}:`, err)
                                        }
                                      }
                                    }

                                    // Сохраняем дополнительную информацию, если она изменилась
                                    if (additionalInfo !== (task.result?.additional_info || '')) {
                                      try {
                                        await api.put(`/moderator/tasks/${taskId}/report/additional`, {
                                          additional_info: additionalInfo
                                        })
                                      } catch (err) {
                                        console.error('Error saving additional info:', err)
                                      }
                                    }

                                    // Формируем ответы из данных инструментов
                                    const toolDataArray = []
                                    tools.forEach(tool => {
                                      const savedData = task.result?.tool_data?.find(td => td.tool_id === tool.id)
                                      const unsavedData = toolDescriptions[tool.id]
                                      toolDataArray.push({
                                        tool_id: tool.id,
                                        description: unsavedData || savedData?.description || ''
                                      })
                                    })

                                    const answers = {
                                      tools: toolDataArray,
                                      additional_info: additionalInfo || task.result?.additional_info || ''
                                    }

                                    // Отправляем задачу на проверку
                                    const formData = new FormData()
                                    formData.append('answers', JSON.stringify(answers))
                                    formData.append('comment', additionalInfo || task.result?.additional_info || '')

                                    await api.post(`/moderator/tasks/${taskId}/complete`, formData, {
                                      headers: {
                                        'Content-Type': 'multipart/form-data',
                                      },
                                    })

                                    alert('Report submitted successfully for review!')
                                    // Перезагружаем задачу
                                    loadTask()
                                  } catch (error) {
                                    console.error('Error submitting report:', error)
                                    alert('Error submitting report: ' + (error.response?.data?.message || error.message))
                                  }
                                }}
                                disabled={loading}
                              >
                                Submit for Review
                              </Button>
                            </Box>
                          )}
                        </Box>
                      )
                    })()}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent>
                    <Typography variant='body1' sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                      Select a tool from the list to add information
                    </Typography>
                  </CardContent>
                </Card>
              )}
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

