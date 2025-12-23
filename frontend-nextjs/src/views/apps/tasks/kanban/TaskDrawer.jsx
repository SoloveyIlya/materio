// React Imports
import { useEffect, useState } from 'react'

// MUI Imports
import Drawer from '@mui/material/Drawer'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'

// Component Imports
import api from '@/lib/api'
import { API_URL } from '@/lib/api'
import { showToast } from '@/utils/toast'

const TaskDrawer = props => {
  // Props
  const { drawerOpen, setDrawerOpen, task, column, onSave } = props

  // States
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
    work_day: '',
    is_main_task: false,
    document_image: null,
    selfie_image: null,
  })
  const [categories, setCategories] = useState([])
  const [documentations, setDocumentations] = useState([])
  const [tools, setTools] = useState([])
  const [documentPreview, setDocumentPreview] = useState(null)
  const [documentFileName, setDocumentFileName] = useState(null)
  const [selfiePreview, setSelfiePreview] = useState(null)

  useEffect(() => {
    if (drawerOpen) {
      loadCategories()
      loadDocumentations()
      loadTools()
      if (task) {
        setFormData({
          title: String(task.title || ''),
          description: String(task.description || ''),
          category_id: task.category_id ? String(task.category_id) : '',
          template_id: task.template_id ? String(task.template_id) : '',
          documentation_id: task.documentation_id ? String(task.documentation_id) : '',
          tool_id: task.tool_id ? String(task.tool_id) : '',
          first_name: String(task.first_name || ''),
          last_name: String(task.last_name || ''),
          country: String(task.country || ''),
          address: String(task.address || ''),
          phone_number: String(task.phone_number || ''),
          email: String(task.email || ''),
          date_of_birth: task.date_of_birth ? (task.date_of_birth.includes('T') ? task.date_of_birth.split('T')[0] : task.date_of_birth.split(' ')[0]) : '',
          id_type: String(task.id_type || ''),
          id_number: String(task.id_number || ''),
          price: task.price !== null && task.price !== undefined ? String(task.price) : '',
          completion_hours: task.completion_hours !== null && task.completion_hours !== undefined ? String(task.completion_hours) : '',
          due_at: task.due_at ? (task.due_at.includes('T') ? task.due_at.split('T')[0] : task.due_at.split(' ')[0]) : '',
          comment: String(task.comment || ''),
          work_day: task.work_day ? String(task.work_day) : '',
          is_main_task: Boolean(task.is_main_task || false),
          document_image: null,
          selfie_image: null,
        })
        if (task.document_image) {
          let docUrl
          if (task.document_image.startsWith('http')) {
            docUrl = task.document_image
          } else if (task.document_image.startsWith('/storage/')) {
            docUrl = `${API_URL}${task.document_image}`
          } else {
            docUrl = `${API_URL}/storage/${task.document_image}`
          }
          // Проверяем, является ли это изображением (по расширению или URL)
          const isImage = docUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i)
          if (isImage) {
            setDocumentPreview(docUrl)
            setDocumentFileName(null)
          } else {
            // Для документов используем сохраненное оригинальное имя файла
            if (task.document_image_name) {
              setDocumentPreview(null)
              setDocumentFileName(task.document_image_name)
            } else {
              // Для старых файлов определяем расширение и показываем просто "Document"
              const urlFileName = docUrl.split('/').pop().split('?')[0]
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
        if (task.selfie_image) {
          let selfieUrl
          if (task.selfie_image.startsWith('http')) {
            selfieUrl = task.selfie_image
          } else if (task.selfie_image.startsWith('/storage/')) {
            selfieUrl = `${API_URL}${task.selfie_image}`
          } else {
            selfieUrl = `${API_URL}/storage/${task.selfie_image}`
          }
          setSelfiePreview(selfieUrl)
        } else {
          setSelfiePreview(null)
        }
      } else {
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
          work_day: column && column.id <= 5 ? column.id.toString() : '',
          is_main_task: false,
          document_image: null,
          selfie_image: null,
        })
        setDocumentPreview(null)
        setDocumentFileName(null)
        setSelfiePreview(null)
      }
    }
  }, [drawerOpen, task])

  const loadCategories = async () => {
    try {
      const response = await api.get('/admin/task-categories')
      setCategories(response.data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadDocumentations = async () => {
    try {
      const response = await api.get('/admin/documentation-pages')
      setDocumentations(response.data?.data || response.data || [])
    } catch (error) {
      console.error('Error loading documentations:', error)
    }
  }

  const loadTools = async () => {
    try {
      const response = await api.get('/admin/tools')
      setTools(response.data?.data || response.data || [])
    } catch (error) {
      console.error('Error loading tools:', error)
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

  // Close Drawer
  const handleClose = () => {
    setDrawerOpen(false)
  }

  // Update Task
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      // Валидация обязательных полей с детальными проверками
      const errors = []
      
      if (!formData.title || !formData.title.trim()) {
        errors.push('Title is required')
      }
      if (!formData.category_id || formData.category_id === '' || formData.category_id === null || formData.category_id === undefined) {
        errors.push('Category is required')
      }
      if (!formData.price || formData.price === '' || formData.price === '0' || formData.price === null || formData.price === undefined) {
        errors.push('Price is required')
      }
      if (!formData.completion_hours || formData.completion_hours === '' || formData.completion_hours === null || formData.completion_hours === undefined) {
        errors.push('Completion hours is required')
      }
      
      if (errors.length > 0) {
        showToast.error('Please fill in all required fields: ' + errors.join(', '))
        console.error('Validation errors:', errors)
        console.error('Current formData:', formData)
        return
      }

      const formDataToSend = new FormData()
      
      // Отладочная информация
      console.log('FormData before sending:', {
        title: formData.title,
        category_id: formData.category_id,
        price: formData.price,
        completion_hours: formData.completion_hours
      })
      
      // Явно добавляем каждое поле по отдельности для контроля
      // Основные обязательные поля - после валидации они точно заполнены
      const titleValue = formData.title.trim()
      const categoryIdValue = String(formData.category_id)
      const priceValue = String(formData.price)
      const completionHoursValue = String(formData.completion_hours)
      
      formDataToSend.append('title', titleValue)
      formDataToSend.append('description', formData.description || '')
      formDataToSend.append('category_id', categoryIdValue)
      formDataToSend.append('price', priceValue)
      formDataToSend.append('completion_hours', completionHoursValue)
      
      // Проверяем, что обязательные поля добавлены
      console.log('FormData values check:', {
        title: formDataToSend.get('title'),
        category_id: formDataToSend.get('category_id'),
        price: formDataToSend.get('price'),
        completion_hours: formDataToSend.get('completion_hours')
      })
      
      // Для отладки: выводим все значения FormData
      console.log('All FormData entries:')
      for (let pair of formDataToSend.entries()) {
        console.log(pair[0] + ': ' + pair[1])
      }
      
      // Опциональные поля (отправляем пустую строку для nullable полей)
      formDataToSend.append('template_id', formData.template_id || '')
      formDataToSend.append('documentation_id', formData.documentation_id || '')
      formDataToSend.append('tool_id', formData.tool_id || '')
      formDataToSend.append('due_at', formData.due_at || '')
      formDataToSend.append('work_day', formData.work_day || '')
      
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

      if (onSave) {
        onSave()
      }
      showToast.success(task && task.id ? 'Task updated successfully' : 'Task created successfully')
      handleClose()
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
    <Drawer
      open={drawerOpen}
      anchor='right'
      variant='temporary'
      ModalProps={{ keepMounted: true }}
      sx={{ '& .MuiDrawer-paper': { width: { xs: 300, sm: 400 } } }}
      onClose={handleClose}
    >
      <div className='flex justify-between items-center pli-5 plb-4 border-be'>
        <Typography variant='h5'>{task ? 'Edit Task' : 'Create Task'}</Typography>
        <IconButton size='small' onClick={handleClose}>
          <i className='ri-close-line text-2xl' />
        </IconButton>
      </div>
      <div className='p-6'>
        <form className='flex flex-col gap-y-5' onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label='Title'
            name='title'
            value={formData.title}
            onChange={handleChange}
            required
          />

          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              name='category_id'
              value={formData.category_id ? String(formData.category_id) : ''}
              onChange={handleChange}
              label='Category'
              required
            >
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Documentation</InputLabel>
            <Select
              name='documentation_id'
              value={formData.documentation_id ? String(formData.documentation_id) : ''}
              onChange={handleChange}
              label='Documentation'
            >
              <MenuItem value=''>None</MenuItem>
              {documentations.map((doc) => (
                <MenuItem key={doc.id} value={String(doc.id)}>
                  {doc.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Tool</InputLabel>
            <Select
              name='tool_id'
              value={formData.tool_id ? String(formData.tool_id) : ''}
              onChange={handleChange}
              label='Tool'
            >
              <MenuItem value=''>None</MenuItem>
              {tools.map((tool) => (
                <MenuItem key={tool.id} value={String(tool.id)}>
                  {tool.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label='Price'
            name='price'
            type='number'
            value={formData.price}
            onChange={handleChange}
            required
          />

          <TextField
            fullWidth
            label='Completion Hours'
            name='completion_hours'
            type='number'
            value={formData.completion_hours}
            onChange={handleChange}
            required
            inputProps={{ min: 1 }}
          />


          {!task && (
            <TextField
              fullWidth
              label='Work Day (1-5 for default columns)'
              name='work_day'
              type='number'
              value={formData.work_day}
              onChange={handleChange}
              inputProps={{ min: 1, max: 5 }}
              helperText='Day number for default columns (Day 1-5)'
            />
          )}

          <TextField
            fullWidth
            label='First Name'
            name='first_name'
            value={formData.first_name}
            onChange={handleChange}
          />

          <TextField
            fullWidth
            label='Last Name'
            name='last_name'
            value={formData.last_name}
            onChange={handleChange}
          />

          <TextField
            fullWidth
            label='Country'
            name='country'
            value={formData.country}
            onChange={handleChange}
          />

          <TextField
            fullWidth
            label='Address'
            name='address'
            multiline
            rows={2}
            value={formData.address}
            onChange={handleChange}
          />

          <TextField
            fullWidth
            label='Phone Number'
            name='phone_number'
            value={formData.phone_number}
            onChange={handleChange}
          />

          <TextField
            fullWidth
            label='Email'
            name='email'
            type='email'
            value={formData.email}
            onChange={handleChange}
          />

          <TextField
            fullWidth
            label='Date of Birth'
            name='date_of_birth'
            type='date'
            value={formData.date_of_birth}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            fullWidth
            label='ID Type'
            name='id_type'
            value={formData.id_type}
            onChange={handleChange}
          />

          <TextField
            fullWidth
            label='ID Number'
            name='id_number'
            value={formData.id_number}
            onChange={handleChange}
          />

          <Box>
            <Button variant='outlined' component='label' fullWidth>
              Upload Document
              <input
                hidden
                type='file'
                accept='image/*,.pdf,.doc,.docx,.txt,.rtf'
                onChange={(e) => handleFileChange(e, 'document_image')}
              />
            </Button>
            {documentPreview && (
              <Box sx={{ mt: 1 }}>
                <img src={documentPreview} alt='Document preview' style={{ maxWidth: '100%', maxHeight: 100 }} />
              </Box>
            )}
            {documentFileName && (
              <Box sx={{ mt: 1 }}>
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                  File: {documentFileName}
                </Typography>
              </Box>
            )}
          </Box>

          <Box>
            <Button variant='outlined' component='label' fullWidth>
              Upload Selfie
              <input
                hidden
                type='file'
                accept='image/*'
                onChange={(e) => handleFileChange(e, 'selfie_image')}
              />
            </Button>
            {selfiePreview && (
              <Box sx={{ mt: 1 }}>
                <img src={selfiePreview} alt='Selfie preview' style={{ maxWidth: '100%', maxHeight: 100 }} />
              </Box>
            )}
          </Box>

          <TextField
            fullWidth
            label='Comment'
            name='comment'
            multiline
            rows={4}
            value={formData.comment}
            onChange={handleChange}
            placeholder='Write a Comment....'
          />

          <div className='flex gap-4'>
            <Button variant='contained' color='primary' type='submit'>
              {task ? 'Update' : 'Create'}
            </Button>
            <Button variant='outlined' color='secondary' onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </Drawer>
  )
}

export default TaskDrawer

