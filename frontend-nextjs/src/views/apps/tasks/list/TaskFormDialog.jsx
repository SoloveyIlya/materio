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

const TaskFormDialog = ({ open, onClose, task, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
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
    comment: '',
    document_image: null,
    selfie_image: null,
  })
  const [categories, setCategories] = useState([])
  const [documentations, setDocumentations] = useState([])
  const [tools, setTools] = useState([])
  const [documentPreview, setDocumentPreview] = useState(null)
  const [selfiePreview, setSelfiePreview] = useState(null)

  useEffect(() => {
    if (open) {
      loadCategories()
      loadDocumentations()
      loadTools()
      if (task) {
        setFormData({
          title: task.title || '',
          category_id: task.category_id || '',
          documentation_id: task.documentation_id || '',
          tool_id: task.tool_id || '',
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
          document_image: null,
          selfie_image: null,
        })
        if (task.document_image) {
          setDocumentPreview(task.document_image.startsWith('http') ? task.document_image : `${API_URL}/storage/${task.document_image}`)
        }
        if (task.selfie_image) {
          setSelfiePreview(task.selfie_image.startsWith('http') ? task.selfie_image : `${API_URL}/storage/${task.selfie_image}`)
        }
      } else {
        setFormData({
          title: '',
          category_id: '',
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
          comment: '',
          document_image: null,
          selfie_image: null,
        })
        setDocumentPreview(null)
        setSelfiePreview(null)
      }
    }
  }, [open, task])

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
      const formDataToSend = new FormData()
      
      Object.keys(formData).forEach(key => {
        if (key === 'document_image' || key === 'selfie_image') {
          if (formData[key]) {
            formDataToSend.append(key, formData[key])
          }
        } else if (formData[key] !== null && formData[key] !== '') {
          formDataToSend.append(key, formData[key])
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

      onSave()
      onClose()
    } catch (error) {
      console.error('Error saving task:', error)
      alert('Error saving task: ' + (error.response?.data?.message || error.message))
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

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  label="Category"
                  required
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>
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
                  value={formData.documentation_id}
                  onChange={handleChange}
                  label="Documentation"
                >
                  <MenuItem value="">None</MenuItem>
                  {documentations.map((doc) => (
                    <MenuItem key={doc.id} value={doc.id}>
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
                  value={formData.tool_id}
                  onChange={handleChange}
                  label="Tool"
                >
                  <MenuItem value="">None</MenuItem>
                  {tools.map((tool) => (
                    <MenuItem key={tool.id} value={tool.id}>
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

