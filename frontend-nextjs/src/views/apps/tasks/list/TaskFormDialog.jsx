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
} from '@mui/material'
import api from '@/lib/api'
import { API_URL } from '@/lib/api'
import { showToast } from '@/utils/toast'

const TaskFormDialog = ({ open, onClose, task, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    template_id: '',
    documentation_id: '',
    tool_id: '',
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
  const [selfiePreview, setSelfiePreview] = useState(null)

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
        category_id: taskData.category_id ? String(taskData.category_id) : '',
        template_id: taskData.template_id ? String(taskData.template_id) : '',
        documentation_id: taskData.documentation_id ? String(taskData.documentation_id) : '',
        tool_id: taskData.tool_id ? String(taskData.tool_id) : '',
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
      
      // Обработка изображений
      if (taskData.document_image) {
        const docImage = formatImageUrl(taskData.document_image)
        setDocumentPreview(docImage)
      } else {
        setDocumentPreview(null)
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

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category_id: '',
      template_id: '',
      documentation_id: '',
      tool_id: '',
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

  const handleFileChange = (e, field) => {
    const file = e.target.files[0]
    if (file) {
      setFormData(prev => ({ ...prev, [field]: file }))
      const reader = new FileReader()
      reader.onloadend = () => {
        if (field === 'document_image') {
          setDocumentPreview(reader.result)
        } else if (field === 'selfie_image') {
          setSelfiePreview(reader.result)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async () => {
    try {
      // Валидация обязательных полей
      if (!formData.title || !formData.title.trim()) {
        showToast.error('Title is required')
        return
      }
      if (!formData.category_id) {
        showToast.error('Category is required')
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
      formDataToSend.append('category_id', String(formData.category_id))
      formDataToSend.append('price', String(formData.price || '0'))
      formDataToSend.append('completion_hours', String(formData.completion_hours || '24'))
      
      // Опциональные поля (отправляем пустую строку для nullable полей)
      formDataToSend.append('template_id', formData.template_id || '')
      formDataToSend.append('documentation_id', formData.documentation_id || '')
      formDataToSend.append('tool_id', formData.tool_id || '')
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
        await api.put(`/admin/tasks/${task.id}`, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      } else {
        await api.post('/admin/tasks', formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
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
                <InputLabel>Category</InputLabel>
                <Select
                  name="category_id"
                  value={formData.category_id ? String(formData.category_id) : ''}
                  onChange={handleChange}
                  label="Category"
                  required
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Documentation</InputLabel>
                <Select
                  name="documentation_id"
                  value={formData.documentation_id ? String(formData.documentation_id) : ''}
                  onChange={handleChange}
                  label="Documentation"
                >
                  <MenuItem value="">None</MenuItem>
                  {documentations.map((doc) => (
                    <MenuItem key={doc.id} value={String(doc.id)}>
                      {doc.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Tool</InputLabel>
                <Select
                  name="tool_id"
                  value={formData.tool_id ? String(formData.tool_id) : ''}
                  onChange={handleChange}
                  label="Tool"
                >
                  <MenuItem value="">None</MenuItem>
                  {tools.map((tool) => (
                    <MenuItem key={tool.id} value={String(tool.id)}>
                      {tool.name}
                    </MenuItem>
                  ))}
                </Select>
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
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'document_image')}
                />
              </Button>
              {documentPreview && (
                <Box sx={{ mt: 1 }}>
                  <img src={documentPreview} alt="Document preview" style={{ maxWidth: '100%', maxHeight: 200 }} />
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
                  <img src={selfiePreview} alt="Selfie preview" style={{ maxWidth: '100%', maxHeight: 200 }} />
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
    </Dialog>
  )
}

export default TaskFormDialog

