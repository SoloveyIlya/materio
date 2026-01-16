'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Box,
  Typography,
  Checkbox,
  ListItemText,
  Paper,
  FormGroup,
  FormControlLabel,
  OutlinedInput,
  Popover,
  ClickAwayListener,
  IconButton,
} from '@mui/material'
import api from '@/lib/api'
import { API_URL } from '@/lib/api'
import { showToast } from '@/utils/toast'

const TaskFormDialog = ({ open, onClose, task, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_ids: [],
    template_id: '',
    documentation_ids: [],
    tool_ids: [],
    first_name: '',
    last_name: '',
    country: '',
    address: '',
    phone_number: '',
    email: '',
    date_of_birth: '',
    id_type: '',
    id_number: '',
    price: '',
    completion_hours: '',
    due_at: '',
    comment: '',
    document_image: null,
    selfie_image: null,
    is_main_task: false,
  })
  const [categories, setCategories] = useState([])
  const [documentations, setDocumentations] = useState([])
  const [tools, setTools] = useState([])
  const [documentPreview, setDocumentPreview] = useState(null)
  const [documentFileName, setDocumentFileName] = useState(null)
  const [selfiePreview, setSelfiePreview] = useState(null)
  const [categoriesAnchorEl, setCategoriesAnchorEl] = useState(null)
  const [documentationsAnchorEl, setDocumentationsAnchorEl] = useState(null)
  const [toolsAnchorEl, setToolsAnchorEl] = useState(null)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [imageZoom, setImageZoom] = useState(100)

  useEffect(() => {
    if (open) {
      // Сначала загружаем все списки, потом данные задачи
      const loadAll = async () => {
        await Promise.all([
          loadCategories(),
          loadDocumentations(),
          loadTools()
        ])
        
        // После загрузки списков загружаем данные задачи
        if (task && task.id) {
          await loadTaskData(task.id)
        } else {
          resetForm()
        }
      }
      
      loadAll()
    }
  }, [open, task?.id])

  const loadTaskData = async (taskId) => {
    try {
      const response = await api.get(`/admin/tasks/${taskId}`)
      const taskData = response.data
      
      // Явно маппим каждое поле, проверяя его существование и тип
      // Важно: конвертируем все ID в строки для Select компонентов
      const mappedData = {
        title: getStringValue(taskData.title),
        description: getStringValue(taskData.description),
        category_ids: taskData.categories && Array.isArray(taskData.categories) 
          ? taskData.categories.map(cat => String(cat.id))
          : (taskData.category_id ? [String(taskData.category_id)] : []),
        template_id: taskData.template_id ? String(taskData.template_id) : '',
        documentation_ids: taskData.documentations && Array.isArray(taskData.documentations)
          ? taskData.documentations.map(doc => String(doc.id))
          : (taskData.documentation_id ? [String(taskData.documentation_id)] : []),
        tool_ids: taskData.tools && Array.isArray(taskData.tools)
          ? taskData.tools.map(tool => String(tool.id))
          : (taskData.tool_id ? [String(taskData.tool_id)] : []),
        first_name: getStringValue(taskData.first_name),
        last_name: getStringValue(taskData.last_name),
        country: getStringValue(taskData.country),
        address: getStringValue(taskData.address),
        phone_number: getStringValue(taskData.phone_number),
        email: getStringValue(taskData.email),
        date_of_birth: formatDate(taskData.date_of_birth),
        id_type: getStringValue(taskData.id_type),
        id_number: getStringValue(taskData.id_number),
        price: getStringValue(taskData.price),
        completion_hours: getStringValue(taskData.completion_hours),
        due_at: formatDate(taskData.due_at),
        comment: getStringValue(taskData.comment),
        document_image: null,
        selfie_image: null,
        is_main_task: Boolean(taskData.is_main_task),
      }
      
      setFormData(mappedData)
      
      // Обработка изображений и документов
      if (taskData.document_image) {
        const docImage = formatImageUrl(taskData.document_image)
        // Проверяем, является ли это изображением (по расширению или URL)
        const isImage = docImage.match(/\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i)
        if (isImage) {
          setDocumentPreview(docImage)
          setDocumentFileName(null)
        } else {
          // Для документов используем сохраненное оригинальное имя файла
          if (taskData.document_image_name) {
            setDocumentPreview(null)
            setDocumentFileName(taskData.document_image_name)
          } else {
            // Для старых файлов определяем расширение и показываем просто "Document"
            const urlFileName = docImage.split('/').pop().split('?')[0]
            const extensionMatch = urlFileName.match(/\.([^.]+)$/)
            const extension = extensionMatch ? extensionMatch[1] : 'pdf'
            setDocumentPreview(null)
            setDocumentFileName(`Document.${extension}`)
          }
        }
      } else {
        setDocumentPreview(null)
        setDocumentFileName(null)
      }
      
      if (taskData.selfie_image) {
        const selfieImg = formatImageUrl(taskData.selfie_image)
        setSelfiePreview(selfieImg)
      } else {
        setSelfiePreview(null)
      }
    } catch (error) {
      console.error('Error loading task data:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Error loading task data'
      showToast.error(errorMessage)
      resetForm()
    }
  }

  const getStringValue = (value) => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'number') return String(value)
    if (typeof value === 'boolean') return String(value)
    return String(value)
  }

  const formatDate = (dateValue) => {
    if (!dateValue) return ''
    if (typeof dateValue === 'string') {
      // Если это строка с датой
      if (dateValue.includes('T')) {
        return dateValue.split('T')[0]
      }
      if (dateValue.includes(' ')) {
        return dateValue.split(' ')[0]
      }
      // Если это уже в формате YYYY-MM-DD
      if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateValue
      }
    }
    return ''
  }

  const formatImageUrl = (imagePath) => {
    if (!imagePath) return null
    if (imagePath.startsWith('http')) return imagePath
    if (imagePath.startsWith('/storage/')) return `${API_URL}${imagePath}`
    return `${API_URL}/storage/${imagePath}`
  }

  // Handle image click
  const handleImageClick = (imageUrl) => {
    if (imageUrl) {
      setSelectedImage(imageUrl)
      setImageZoom(100)
      setImageDialogOpen(true)
    }
  }

  // Handle zoom in
  const handleZoomIn = () => {
    setImageZoom(prev => Math.min(prev + 25, 500))
  }

  // Handle zoom out
  const handleZoomOut = () => {
    setImageZoom(prev => Math.max(prev - 25, 50))
  }

  // Reset zoom when dialog closes
  const handleImageDialogClose = () => {
    setImageDialogOpen(false)
    setImageZoom(100)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category_ids: [],
      template_id: '',
      documentation_ids: [],
      tool_ids: [],
      first_name: '',
      last_name: '',
      country: '',
      address: '',
      phone_number: '',
      email: '',
      date_of_birth: '',
      id_type: '',
      id_number: '',
      price: '',
      completion_hours: '',
      due_at: '',
      comment: '',
      document_image: null,
      selfie_image: null,
      is_main_task: false,
    })
    setDocumentPreview(null)
    setDocumentFileName(null)
    setSelfiePreview(null)
  }

  const loadCategories = async () => {
    try {
      const response = await api.get('/admin/task-categories')
      const categoriesData = response.data?.data || response.data || []
      setCategories(categoriesData)
      return categoriesData
    } catch (error) {
      console.error('Error loading categories:', error)
      return []
    }
  }

  const loadDocumentations = async () => {
    try {
      const response = await api.get('/admin/documentation-pages')
      const docsData = response.data?.data || response.data || []
      setDocumentations(docsData)
      return docsData
    } catch (error) {
      console.error('Error loading documentations:', error)
      return []
    }
  }

  const loadTools = async () => {
    try {
      const response = await api.get('/admin/tools')
      const toolsData = response.data?.data || response.data || []
      setTools(toolsData)
      return toolsData
    } catch (error) {
      console.error('Error loading tools:', error)
      return []
    }
  }


  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleMultipleChange = (e) => {
    const { name, value } = e.target
    // MUI Select с multiple всегда возвращает массив выбранных значений
    // value уже является массивом
    const arrayValue = Array.isArray(value) ? value.map(v => String(v)) : [String(value)]
    setFormData(prev => ({ ...prev, [name]: arrayValue }))
  }

  const handleCheckboxChange = (field, id) => {
    const idStr = String(id)
    setFormData(prev => {
      const currentArray = Array.isArray(prev[field]) ? prev[field] : []
      const isSelected = currentArray.includes(idStr)
      let newArray
      if (isSelected) {
        newArray = currentArray.filter(item => String(item) !== idStr)
      } else {
        newArray = [...currentArray, idStr]
      }
      console.log('handleCheckboxChange:', { field, id, idStr, currentArray, isSelected, newArray })
      return { ...prev, [field]: newArray }
    })
  }

  const handleOpenDropdown = (field, event) => {
    if (field === 'categories') setCategoriesAnchorEl(event.currentTarget)
    if (field === 'documentations') setDocumentationsAnchorEl(event.currentTarget)
    if (field === 'tools') setToolsAnchorEl(event.currentTarget)
  }

  const handleCloseDropdown = (field) => {
    if (field === 'categories') setCategoriesAnchorEl(null)
    if (field === 'documentations') setDocumentationsAnchorEl(null)
    if (field === 'tools') setToolsAnchorEl(null)
  }

  const getSelectedNames = (field, items) => {
    const selectedIds = formData[field] || []
    if (selectedIds.length === 0) return ''
    return items
      .filter(item => selectedIds.includes(String(item.id)))
      .map(item => item.name || item.title)
      .join(', ')
  }

  const handleFileChange = (e, field) => {
    const file = e.target.files[0]
    if (file) {
      setFormData(prev => ({ ...prev, [field]: file }))
      if (field === 'document_image') {
        // Проверяем, является ли файл изображением
        if (file.type.startsWith('image/')) {
          const reader = new FileReader()
          reader.onloadend = () => {
            setDocumentPreview(reader.result)
            setDocumentFileName(null)
          }
          reader.readAsDataURL(file)
        } else {
          // Для документов показываем только имя файла
          setDocumentPreview(null)
          setDocumentFileName(file.name)
        }
      } else if (field === 'selfie_image') {
        const reader = new FileReader()
        reader.onloadend = () => {
          setSelfiePreview(reader.result)
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const handleSubmit = async () => {
    try {
      // Валидация обязательных полей
      if (!formData.title || !formData.title.trim()) {
        showToast.error('Title is required')
        return
      }
      if (!formData.category_ids || formData.category_ids.length === 0) {
        showToast.error('At least one category is required')
        return
      }
      if (!formData.price || formData.price === '0') {
        showToast.error('Price is required')
        return
      }
      if (!formData.completion_hours) {
        showToast.error('Completion hours is required')
        return
      }

      const formDataToSend = new FormData()
      
      // Явно добавляем каждое поле по отдельности для контроля
      // Основные обязательные поля
      formDataToSend.append('title', formData.title.trim())
      formDataToSend.append('description', formData.description || '')
      
      // Добавляем массивы категорий и тулзов
      // ВАЖНО: всегда отправляем category_ids, даже если массив пустой
      if (formData.category_ids && Array.isArray(formData.category_ids) && formData.category_ids.length > 0) {
        formData.category_ids.forEach(id => {
          formDataToSend.append('category_ids[]', String(id))
        })
      } else {
        // Если массив пустой или не определен, валидация должна показать ошибку
        console.error('category_ids is empty or not an array:', formData.category_ids)
      }
      
      formDataToSend.append('price', String(formData.price || '0'))
      formDataToSend.append('completion_hours', String(formData.completion_hours || '24'))
      
      // Опциональные поля (отправляем пустую строку для nullable полей)
      formDataToSend.append('template_id', formData.template_id || '')
      
      // Добавляем массив документаций
      if (formData.documentation_ids && Array.isArray(formData.documentation_ids)) {
        formData.documentation_ids.forEach(id => {
          formDataToSend.append('documentation_ids[]', String(id))
        })
      }
      
      // Добавляем массив тулзов
      if (formData.tool_ids && Array.isArray(formData.tool_ids)) {
        formData.tool_ids.forEach(id => {
          formDataToSend.append('tool_ids[]', String(id))
        })
      }
      formDataToSend.append('due_at', formData.due_at || '')
      
      // Поля пользователя
      formDataToSend.append('first_name', formData.first_name || '')
      formDataToSend.append('last_name', formData.last_name || '')
      formDataToSend.append('country', formData.country || '')
      formDataToSend.append('address', formData.address || '')
      formDataToSend.append('phone_number', formData.phone_number || '')
      formDataToSend.append('email', formData.email || '')
      formDataToSend.append('date_of_birth', formData.date_of_birth || '')
      formDataToSend.append('id_type', formData.id_type || '')
      formDataToSend.append('id_number', formData.id_number || '')
      formDataToSend.append('comment', formData.comment || '')
      
      // Boolean поля
      formDataToSend.append('is_main_task', formData.is_main_task ? '1' : '0')
      
      // Файлы (только если загружены новые)
      if (formData.document_image) {
        formDataToSend.append('document_image', formData.document_image)
      }
      if (formData.selfie_image) {
        formDataToSend.append('selfie_image', formData.selfie_image)
      }

      if (task && task.id) {
        // Для PUT запросов с FormData в Laravel нужно использовать POST с _method: 'PUT'
        // Это связано с тем, как Laravel обрабатывает multipart/form-data
        formDataToSend.append('_method', 'PUT')
        await api.post(`/admin/tasks/${task.id}`, formDataToSend)
      } else {
        await api.post('/admin/tasks', formDataToSend)
      }

      if (onSave) onSave()
      showToast.success(task && task.id ? 'Task updated successfully' : 'Task created successfully')
      onClose()
    } catch (error) {
      console.error('Error saving task:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error'
      const errors = error.response?.data?.errors
      if (errors) {
        const errorList = Object.entries(errors).map(([field, messages]) => 
          `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`
        ).join(', ')
        showToast.error(`Error saving task: ${errorList}`)
      } else {
        showToast.error('Error saving task: ' + errorMessage)
      }
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{task ? 'Edit Task' : 'Create Task'}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                multiline
                rows={3}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel shrink={!!formData.category_ids?.length}>Categories *</InputLabel>
                <OutlinedInput
                  readOnly
                  label="Categories *"
                  value={getSelectedNames('category_ids', categories)}
                  onClick={(e) => setCategoriesAnchorEl(e.currentTarget)}
                  endAdornment={
                    <Box sx={{ cursor: 'pointer', userSelect: 'none', pr: 1 }} onClick={(e) => {
                      e.stopPropagation()
                      setCategoriesAnchorEl(e.currentTarget)
                    }}>
                      ▼
                    </Box>
                  }
                  required
                  sx={{ cursor: 'pointer' }}
                />
                <Popover
                  open={Boolean(categoriesAnchorEl)}
                  anchorEl={categoriesAnchorEl}
                  onClose={() => setCategoriesAnchorEl(null)}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <Paper 
                    sx={{ p: 2, minWidth: 250, maxHeight: 300, overflow: 'auto' }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <FormGroup>
                      {categories.map((cat) => {
                        const catIdStr = String(cat.id)
                        const isSelected = (formData.category_ids || []).includes(catIdStr)
                        return (
                          <FormControlLabel
                            key={cat.id}
                            control={
                              <Checkbox
                                checked={isSelected}
                                onChange={(e) => {
                                  e.stopPropagation()
                                  handleCheckboxChange('category_ids', cat.id)
                                }}
                              />
                            }
                            label={cat.name}
                            sx={{ cursor: 'pointer' }}
                          />
                        )
                      })}
                    </FormGroup>
                  </Paper>
                </Popover>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel shrink={!!formData.documentation_ids?.length}>Documentations</InputLabel>
                <OutlinedInput
                  readOnly
                  label="Documentations"
                  value={getSelectedNames('documentation_ids', documentations)}
                  onClick={(e) => setDocumentationsAnchorEl(e.currentTarget)}
                  endAdornment={
                    <Box sx={{ cursor: 'pointer', userSelect: 'none' }} onClick={(e) => {
                      e.stopPropagation()
                      setDocumentationsAnchorEl(e.currentTarget)
                    }}>
                      ▼
                    </Box>
                  }
                  sx={{ cursor: 'pointer' }}
                />
                <Popover
                  open={Boolean(documentationsAnchorEl)}
                  anchorEl={documentationsAnchorEl}
                  onClose={() => setDocumentationsAnchorEl(null)}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <Paper 
                    sx={{ p: 2, minWidth: 250, maxHeight: 300, overflow: 'auto' }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <FormGroup>
                      {documentations.map((doc) => {
                        const docIdStr = String(doc.id)
                        const isSelected = (formData.documentation_ids || []).includes(docIdStr)
                        return (
                          <FormControlLabel
                            key={doc.id}
                            control={
                              <Checkbox
                                checked={isSelected}
                                onChange={(e) => {
                                  e.stopPropagation()
                                  handleCheckboxChange('documentation_ids', doc.id)
                                }}
                              />
                            }
                            label={doc.title}
                            sx={{ cursor: 'pointer' }}
                          />
                        )
                      })}
                    </FormGroup>
                  </Paper>
                </Popover>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel shrink={!!formData.tool_ids?.length}>Tools</InputLabel>
                <OutlinedInput
                  readOnly
                  label="Tools"
                  value={getSelectedNames('tool_ids', tools)}
                  onClick={(e) => setToolsAnchorEl(e.currentTarget)}
                  endAdornment={
                    <Box sx={{ cursor: 'pointer', userSelect: 'none' }} onClick={(e) => {
                      e.stopPropagation()
                      setToolsAnchorEl(e.currentTarget)
                    }}>
                      ▼
                    </Box>
                  }
                  sx={{ cursor: 'pointer' }}
                />
                <Popover
                  open={Boolean(toolsAnchorEl)}
                  anchorEl={toolsAnchorEl}
                  onClose={() => setToolsAnchorEl(null)}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <Paper 
                    sx={{ p: 2, minWidth: 250, maxHeight: 300, overflow: 'auto' }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <FormGroup>
                      {tools.map((tool) => {
                        const toolIdStr = String(tool.id)
                        const isSelected = (formData.tool_ids || []).includes(toolIdStr)
                        return (
                          <FormControlLabel
                            key={tool.id}
                            control={
                              <Checkbox
                                checked={isSelected}
                                onChange={(e) => {
                                  e.stopPropagation()
                                  handleCheckboxChange('tool_ids', tool.id)
                                }}
                              />
                            }
                            label={tool.name}
                            sx={{ cursor: 'pointer' }}
                          />
                        )
                      })}
                    </FormGroup>
                  </Paper>
                </Popover>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Price"
                name="price"
                type="number"
                value={formData.price}
                onChange={handleChange}
                required
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Completion Hours"
                name="completion_hours"
                type="number"
                value={formData.completion_hours}
                onChange={handleChange}
                required
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Due Date"
                name="due_at"
                type="date"
                value={formData.due_at}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="First Name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Last Name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Country"
                name="country"
                value={formData.country}
                onChange={handleChange}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Address"
                name="address"
                multiline
                rows={2}
                value={formData.address}
                onChange={handleChange}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Phone Number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Date of Birth"
                name="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="ID Type"
                name="id_type"
                value={formData.id_type}
                onChange={handleChange}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="ID Number"
                name="id_number"
                value={formData.id_number}
                onChange={handleChange}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Button variant="outlined" component="label" fullWidth>
                Upload Document
                <input
                  type="file"
                  hidden
                  accept="image/*,.pdf,.doc,.docx,.txt,.rtf"
                  onChange={(e) => handleFileChange(e, 'document_image')}
                />
              </Button>
              {documentPreview && (
                <Box sx={{ mt: 1 }}>
                  <img 
                    src={documentPreview} 
                    alt="Document preview" 
                    style={{ maxWidth: '100%', maxHeight: 200, cursor: 'pointer' }}
                    onClick={() => handleImageClick(documentPreview)}
                  />
                </Box>
              )}
              {documentFileName && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    File: {documentFileName}
                  </Typography>
                </Box>
              )}
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Button variant="outlined" component="label" fullWidth>
                Upload Selfie
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'selfie_image')}
                />
              </Button>
              {selfiePreview && (
                <Box sx={{ mt: 1 }}>
                  <img 
                    src={selfiePreview} 
                    alt="Selfie preview" 
                    style={{ maxWidth: '100%', maxHeight: 200, cursor: 'pointer' }}
                    onClick={() => handleImageClick(selfiePreview)}
                  />
                </Box>
              )}
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Comment"
                name="comment"
                multiline
                rows={3}
                value={formData.comment}
                onChange={handleChange}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">
          Save
        </Button>
      </DialogActions>

      {/* Image Fullscreen Dialog */}
      <Dialog 
        open={imageDialogOpen} 
        onClose={handleImageDialogClose} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle sx={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <IconButton 
              onClick={handleZoomOut}
              disabled={imageZoom <= 50}
              size="small"
              sx={{ 
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <i className='ri-zoom-out-line' />
            </IconButton>
            <Typography variant="body2" sx={{ minWidth: 60, textAlign: 'center' }}>
              {imageZoom}%
            </Typography>
            <IconButton 
              onClick={handleZoomIn}
              disabled={imageZoom >= 500}
              size="small"
              sx={{ 
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <i className='ri-zoom-in-line' />
            </IconButton>
          </Box>
          <IconButton 
            onClick={handleImageDialogClose} 
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <i className='ri-close-line' />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedImage && (
            <Box 
              sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '50vh',
                overflow: 'auto',
                p: 2
              }}
            >
              <img
                src={selectedImage}
                alt="Full size"
                style={{ 
                  width: `${imageZoom}%`,
                  height: 'auto',
                  objectFit: 'contain',
                  transition: 'width 0.3s ease'
                }}
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

export default TaskFormDialog

