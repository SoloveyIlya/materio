'use client'

// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'

// Third-party Imports
import axios from 'axios'

// Store Imports
import { useAuthStore } from '@/store/authStore'

interface TaskCategory {
  id: number
  name: string
  slug: string
  description?: string
}

interface TaskTemplate {
  id: number
  title: string
  description?: string
  category_id: number
  price: number
  completion_hours: number
  guides_links?: any[]
  attached_services?: any[]
  work_day?: number
  is_primary: boolean
  is_active: boolean
  category?: TaskCategory
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default function AdminPanel() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'categories' | 'templates'>('categories')
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null)

  // Forms
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '', description: '' })
  const [templateForm, setTemplateForm] = useState({
    title: '',
    description: '',
    category_id: '',
    price: '0',
    completion_hours: '1',
    work_day: '',
    is_primary: false,
    is_active: true,
  })

  useEffect(() => {
    loadCategories() // Always load categories, they are needed for template form
    if (activeTab === 'templates') {
      loadTemplates()
    }
  }, [activeTab])

  const loadCategories = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/task-categories')
      setCategories(response.data)
    } catch (error: any) {
      console.error('Error loading categories:', error)
      const message = error.response?.data?.message || error.message || 'Error loading categories'
      alert(message)
    } finally {
      setLoading(false)
    }
  }

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/task-templates')
      setTemplates(response.data)
    } catch (error: any) {
      console.error('Error loading templates:', error)
      const message = error.response?.data?.message || error.message || 'Error loading templates'
      alert(message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingCategory) {
        await api.put(`/admin/task-categories/${editingCategory.id}`, categoryForm)
      } else {
        await api.post('/admin/task-categories', categoryForm)
      }
      setShowCategoryForm(false)
      setEditingCategory(null)
      setCategoryForm({ name: '', slug: '', description: '' })
      loadCategories()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error saving category')
    }
  }

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Delete category?')) return
    try {
      await api.delete(`/admin/task-categories/${id}`)
      loadCategories()
    } catch (error) {
      alert('Error deleting category')
    }
  }

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data = {
        ...templateForm,
        category_id: parseInt(templateForm.category_id),
        price: parseFloat(templateForm.price),
        completion_hours: parseInt(templateForm.completion_hours),
        work_day: templateForm.work_day ? parseInt(templateForm.work_day) : null,
      }
      if (editingTemplate) {
        await api.put(`/admin/task-templates/${editingTemplate.id}`, data)
      } else {
        await api.post('/admin/task-templates', data)
      }
      setShowTemplateForm(false)
      setEditingTemplate(null)
      setTemplateForm({
        title: '',
        description: '',
        category_id: '',
        price: '0',
        completion_hours: '1',
        work_day: '',
        is_primary: false,
        is_active: true,
      })
      loadTemplates()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error saving template')
    }
  }

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm('Delete template?')) return
    try {
      await api.delete(`/admin/task-templates/${id}`)
      loadTemplates()
    } catch (error) {
      alert('Error deleting template')
    }
  }

  const editCategory = (category: TaskCategory) => {
    setEditingCategory(category)
    setCategoryForm({ name: category.name, slug: category.slug, description: category.description || '' })
    setShowCategoryForm(true)
  }

  const editTemplate = (template: TaskTemplate) => {
    setEditingTemplate(template)
    setTemplateForm({
      title: template.title,
      description: template.description || '',
      category_id: template.category_id.toString(),
      price: template.price.toString(),
      completion_hours: template.completion_hours.toString(),
      work_day: template.work_day?.toString() || '',
      is_primary: template.is_primary,
      is_active: template.is_active,
    })
    setShowTemplateForm(true)
  }

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4' className='mbe-1'>
          Admin Panel
        </Typography>
        <Typography>
          Manage task categories and templates
        </Typography>
      </Grid>

      {/* Tabs */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Tabs
              value={activeTab === 'categories' ? 0 : 1}
              onChange={(e, newValue) => setActiveTab(newValue === 0 ? 'categories' : 'templates')}
              className='mbe-4'
            >
              <Tab
                icon={<i className='ri-price-tag-3-line' />}
                iconPosition='start'
                label='Task Categories'
              />
              <Tab
                icon={<i className='ri-file-list-3-line' />}
                iconPosition='start'
                label='Task Templates'
              />
            </Tabs>
          </CardContent>
        </Card>
      </Grid>

      {activeTab === 'categories' && (
        <>
          <Grid size={{ xs: 12 }}>
            <Box className='flex items-center justify-between flex-wrap gap-4'>
              <Typography variant='h4' className='mbe-1'>
                Task Categories
              </Typography>
              <Button
                variant='contained'
                startIcon={<i className='ri-add-line' />}
                onClick={() => {
                  setEditingCategory(null)
                  setCategoryForm({ name: '', slug: '', description: '' })
                  setShowCategoryForm(true)
                }}
              >
                Add Category
              </Button>
            </Box>
          </Grid>

          {showCategoryForm && (
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardHeader
                  title={editingCategory ? 'Edit Category' : 'New Category'}
                  action={
                    <IconButton
                      size='small'
                      onClick={() => {
                        setShowCategoryForm(false)
                        setEditingCategory(null)
                      }}
                    >
                      <i className='ri-close-line' />
                    </IconButton>
                  }
                />
                <Divider />
                <CardContent>
                  <form onSubmit={handleSaveCategory}>
                    <Grid container spacing={5}>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          label='Name'
                          required
                          value={categoryForm.name}
                          onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          label='Slug'
                          required
                          value={categoryForm.slug}
                          onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          label='Description'
                          multiline
                          rows={3}
                          value={categoryForm.description}
                          onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Box className='flex items-center gap-4'>
                          <Button type='submit' variant='contained'>
                            Save
                          </Button>
                          <Button
                            variant='outlined'
                            color='secondary'
                            onClick={() => {
                              setShowCategoryForm(false)
                              setEditingCategory(null)
                            }}
                          >
                            Cancel
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                  </form>
                </CardContent>
              </Card>
            </Grid>
          )}

          {loading ? (
            <Grid size={{ xs: 12 }}>
              <Box className='flex items-center justify-center p-12'>
                <CircularProgress />
              </Box>
            </Grid>
          ) : (
            <Grid size={{ xs: 12 }}>
              <Card>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Slug</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align='right'>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {categories.map((category) => (
                        <TableRow key={category.id} hover>
                          <TableCell>{category.id}</TableCell>
                          <TableCell>
                            <Typography className='font-medium' color='text.primary'>
                              {category.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={category.slug} size='small' variant='tonal' />
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2' color='text.secondary'>
                              {category.description || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align='right'>
                            <Box className='flex items-center justify-end gap-2'>
                              <IconButton
                                size='small'
                                onClick={() => editCategory(category)}
                                color='primary'
                              >
                                <i className='ri-edit-box-line' />
                              </IconButton>
                              <IconButton
                                size='small'
                                onClick={() => handleDeleteCategory(category.id)}
                                color='error'
                              >
                                <i className='ri-delete-bin-7-line' />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            </Grid>
          )}
        </>
      )}

      {activeTab === 'templates' && (
        <>
          <Grid size={{ xs: 12 }}>
            <Box className='flex items-center justify-between flex-wrap gap-4'>
              <Typography variant='h4' className='mbe-1'>
                Task Templates
              </Typography>
              <Button
                variant='contained'
                startIcon={<i className='ri-add-line' />}
                onClick={() => {
                  setEditingTemplate(null)
                  setTemplateForm({
                    title: '',
                    description: '',
                    category_id: '',
                    price: '0',
                    completion_hours: '1',
                    work_day: '',
                    is_primary: false,
                    is_active: true,
                  })
                  setShowTemplateForm(true)
                }}
              >
                Add Template
              </Button>
            </Box>
          </Grid>

          {showTemplateForm && (
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardHeader
                  title={editingTemplate ? 'Edit Template' : 'New Template'}
                  action={
                    <IconButton
                      size='small'
                      onClick={() => {
                        setShowTemplateForm(false)
                        setEditingTemplate(null)
                      }}
                    >
                      <i className='ri-close-line' />
                    </IconButton>
                  }
                />
                <Divider />
                <CardContent>
                  <form onSubmit={handleSaveTemplate}>
                    <Grid container spacing={5}>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          label='Title'
                          required
                          value={templateForm.title}
                          onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          label='Description'
                          multiline
                          rows={3}
                          value={templateForm.description}
                          onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }} md={6}>
                        <FormControl fullWidth required>
                          <InputLabel>Category</InputLabel>
                          <Select
                            value={templateForm.category_id}
                            label='Category'
                            onChange={(e) => setTemplateForm({ ...templateForm, category_id: e.target.value })}
                          >
                            {categories.map((cat) => (
                              <MenuItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid size={{ xs: 12 }} md={6}>
                        <TextField
                          fullWidth
                          label='Price'
                          type='number'
                          required
                          inputProps={{ step: '0.01' }}
                          value={templateForm.price}
                          onChange={(e) => setTemplateForm({ ...templateForm, price: e.target.value })}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }} md={6}>
                        <TextField
                          fullWidth
                          label='Completion Hours'
                          type='number'
                          required
                          inputProps={{ min: 1 }}
                          value={templateForm.completion_hours}
                          onChange={(e) => setTemplateForm({ ...templateForm, completion_hours: e.target.value })}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }} md={6}>
                        <TextField
                          fullWidth
                          label='Work Day (1-10)'
                          type='number'
                          inputProps={{ min: 1, max: 10 }}
                          value={templateForm.work_day}
                          onChange={(e) => setTemplateForm({ ...templateForm, work_day: e.target.value })}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Box className='flex items-center gap-6'>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={templateForm.is_primary}
                                onChange={(e) => setTemplateForm({ ...templateForm, is_primary: e.target.checked })}
                              />
                            }
                            label='Primary Task'
                          />
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={templateForm.is_active}
                                onChange={(e) => setTemplateForm({ ...templateForm, is_active: e.target.checked })}
                              />
                            }
                            label='Active'
                          />
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Box className='flex items-center gap-4'>
                          <Button type='submit' variant='contained'>
                            Save
                          </Button>
                          <Button
                            variant='outlined'
                            color='secondary'
                            onClick={() => {
                              setShowTemplateForm(false)
                              setEditingTemplate(null)
                            }}
                          >
                            Cancel
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                  </form>
                </CardContent>
              </Card>
            </Grid>
          )}

          {loading ? (
            <Grid size={{ xs: 12 }}>
              <Box className='flex items-center justify-center p-12'>
                <CircularProgress />
              </Box>
            </Grid>
          ) : (
            <Grid size={{ xs: 12 }}>
              <Card>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Title</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Price</TableCell>
                        <TableCell>Hours</TableCell>
                        <TableCell>Day</TableCell>
                        <TableCell>Primary</TableCell>
                        <TableCell align='right'>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {templates.map((template) => (
                        <TableRow key={template.id} hover>
                          <TableCell>{template.id}</TableCell>
                          <TableCell>
                            <Typography className='font-medium' color='text.primary'>
                              {template.title}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {template.category?.name ? (
                              <Chip label={template.category.name} size='small' variant='tonal' color='primary' />
                            ) : (
                              <Typography variant='body2' color='text.disabled'>
                                —
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography className='font-medium' color='text.primary'>
                              {template.price} ₽
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2' color='text.secondary'>
                              {template.completion_hours} h
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {template.work_day ? (
                              <Chip label={`Day ${template.work_day}`} size='small' variant='tonal' color='info' />
                            ) : (
                              <Typography variant='body2' color='text.disabled'>
                                —
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {template.is_primary ? (
                              <Chip label='Yes' size='small' variant='tonal' color='success' />
                            ) : (
                              <Typography variant='body2' color='text.disabled'>
                                —
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align='right'>
                            <Box className='flex items-center justify-end gap-2'>
                              <IconButton
                                size='small'
                                onClick={() => editTemplate(template)}
                                color='primary'
                              >
                                <i className='ri-edit-box-line' />
                              </IconButton>
                              <IconButton
                                size='small'
                                onClick={() => handleDeleteTemplate(template.id)}
                                color='error'
                              >
                                <i className='ri-delete-bin-7-line' />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            </Grid>
          )}
        </>
      )}
    </Grid>
  )
}

