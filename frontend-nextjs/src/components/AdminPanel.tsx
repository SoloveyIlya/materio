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

// Component Imports
import api from '@/lib/api'
import { showToast } from '@/utils/toast'

// Store Imports
import { useAuthStore } from '@/store/authStore'

interface TaskCategory {
  id: number
  name: string
  slug: string
  description?: string
}

export default function AdminPanel() {
  const { user } = useAuthStore()
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(null)

  // Forms
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '', description: '' })

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/task-categories')
      setCategories(response.data)
    } catch (error: any) {
      console.error('Error loading categories:', error)
      const message = error.response?.data?.message || error.message || 'Error loading categories'
      showToast.error(message)
    } finally {
      setLoading(false)
    }
  }


  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingCategory) {
        const response = await api.put(`/admin/task-categories/${editingCategory.id}`, categoryForm)
        console.log('Category updated:', response.data)
        showToast.success('Category updated successfully')
      } else {
        const response = await api.post('/admin/task-categories', categoryForm)
        console.log('Category created:', response.data)
        showToast.success('Category created successfully')
      }
      setShowCategoryForm(false)
      setEditingCategory(null)
      setCategoryForm({ name: '', slug: '', description: '' })
      loadCategories()
    } catch (error: any) {
      console.error('Error saving category:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Error saving category'
      const errors = error.response?.data?.errors
      if (errors) {
        const errorList = Object.entries(errors).map(([field, messages]) => 
          `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`
        ).join(', ')
        showToast.error(`Error saving category: ${errorList}`)
      } else {
        showToast.error(errorMessage)
      }
    }
  }

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) return
    try {
      const response = await api.delete(`/admin/task-categories/${id}`)
      console.log('Category deleted:', response.data)
      loadCategories()
      showToast.success('Category deleted successfully')
    } catch (error: any) {
      console.error('Error deleting category:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Error deleting category'
      showToast.error(errorMessage)
    }
  }


  const editCategory = (category: TaskCategory) => {
    setEditingCategory(category)
    setCategoryForm({ name: category.name, slug: category.slug, description: category.description || '' })
    setShowCategoryForm(true)
  }


  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4' className='mbe-1'>
          Admin Panel
        </Typography>
        <Typography>
          Manage task categories
        </Typography>
      </Grid>

      {(
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
                              <Button
                                size='small'
                                variant='outlined'
                                color='primary'
                                startIcon={<i className='ri-edit-box-line' />}
                                onClick={() => editCategory(category)}
                              >
                                Edit
                              </Button>
                              <Button
                                size='small'
                                variant='outlined'
                                color='error'
                                startIcon={<i className='ri-delete-bin-7-line' />}
                                onClick={() => handleDeleteCategory(category.id)}
                              >
                                Delete
                              </Button>
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

