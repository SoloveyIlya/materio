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

const TaskDrawer = props => {
  // Props
  const { drawerOpen, setDrawerOpen, task, column, onSave } = props

  // States
  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
    documentation_id: '',
    tool_id: '',
    assigned_to: '',
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
    comment: '',
    work_day: '',
    document_image: null,
    selfie_image: null,
  })
  const [categories, setCategories] = useState([])
  const [documentations, setDocumentations] = useState([])
  const [tools, setTools] = useState([])
  const [moderators, setModerators] = useState([])
  const [documentPreview, setDocumentPreview] = useState(null)
  const [selfiePreview, setSelfiePreview] = useState(null)

  useEffect(() => {
    if (drawerOpen) {
      loadCategories()
      loadDocumentations()
      loadTools()
      loadModerators()
      if (task) {
        setFormData({
          title: task.title || '',
          category_id: task.category_id || '',
          documentation_id: task.documentation_id || '',
          tool_id: task.tool_id || '',
          assigned_to: task.assigned_to || '',
          first_name: task.first_name || '',
          last_name: task.last_name || '',
          country: task.country || '',
          address: task.address || '',
          phone_number: task.phone_number || '',
          email: task.email || '',
          date_of_birth: task.date_of_birth || '',
          id_type: task.id_type || '',
          id_number: task.id_number || '',
          price: task.price || '',
          comment: task.comment || '',
          work_day: task.work_day || '',
          document_image: null,
          selfie_image: null,
        })
        if (task.document_image) {
          const docUrl = task.document_image.startsWith('http') ? task.document_image : `${API_URL}/storage/${task.document_image}`
          setDocumentPreview(docUrl)
        } else {
          setDocumentPreview(null)
        }
        if (task.selfie_image) {
          const selfieUrl = task.selfie_image.startsWith('http') ? task.selfie_image : `${API_URL}/storage/${task.selfie_image}`
          setSelfiePreview(selfieUrl)
        } else {
          setSelfiePreview(null)
        }
      } else {
        setFormData({
          title: '',
          category_id: '',
          documentation_id: '',
          tool_id: '',
          assigned_to: '',
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
          comment: '',
          work_day: column && column.id <= 5 ? column.id.toString() : '',
          document_image: null,
          selfie_image: null,
        })
        setDocumentPreview(null)
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

  const loadModerators = async () => {
    try {
      const response = await api.get('/admin/users?role=moderator')
      setModerators(response.data || [])
    } catch (error) {
      console.error('Error loading moderators:', error)
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

  // Close Drawer
  const handleClose = () => {
    setDrawerOpen(false)
  }

  // Update Task
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const formDataToSend = new FormData()
      
      Object.keys(formData).forEach(key => {
        if (key === 'document_image' || key === 'selfie_image') {
          if (formData[key]) {
            formDataToSend.append(key, formData[key])
          }
        } else if (formData[key] !== null && formData[key] !== '') {
          // Convert work_day to number if it exists
          if (key === 'work_day' && formData[key]) {
            formDataToSend.append(key, parseInt(formData[key], 10))
          } else if (key === 'assigned_to' && formData[key]) {
            // Convert assigned_to to number if it exists
            formDataToSend.append(key, parseInt(formData[key], 10))
          } else {
            formDataToSend.append(key, formData[key])
          }
        }
      })

      // Add required fields if they're missing
      if (!formDataToSend.has('price')) {
        formDataToSend.append('price', '0')
      }
      if (!formDataToSend.has('completion_hours')) {
        formDataToSend.append('completion_hours', '24')
      }

      if (task) {
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

      if (onSave) {
        onSave()
      }
      handleClose()
    } catch (error) {
      console.error('Error saving task:', error)
      alert('Error saving task: ' + (error.response?.data?.message || error.message))
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
              value={formData.category_id}
              onChange={handleChange}
              label='Category'
              required
            >
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Assign to Moderator</InputLabel>
            <Select
              name='assigned_to'
              value={formData.assigned_to}
              onChange={handleChange}
              label='Assign to Moderator'
            >
              <MenuItem value=''>None</MenuItem>
              {moderators.map((moderator) => (
                <MenuItem key={moderator.id} value={moderator.id}>
                  {moderator.name} ({moderator.email})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Documentation</InputLabel>
            <Select
              name='documentation_id'
              value={formData.documentation_id}
              onChange={handleChange}
              label='Documentation'
            >
              <MenuItem value=''>None</MenuItem>
              {documentations.map((doc) => (
                <MenuItem key={doc.id} value={doc.id}>
                  {doc.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Tool</InputLabel>
            <Select
              name='tool_id'
              value={formData.tool_id}
              onChange={handleChange}
              label='Tool'
            >
              <MenuItem value=''>None</MenuItem>
              {tools.map((tool) => (
                <MenuItem key={tool.id} value={tool.id}>
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
                accept='image/*'
                onChange={(e) => handleFileChange(e, 'document_image')}
              />
            </Button>
            {documentPreview && (
              <Box sx={{ mt: 1 }}>
                <img src={documentPreview} alt='Document preview' style={{ maxWidth: '100%', maxHeight: 100 }} />
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

