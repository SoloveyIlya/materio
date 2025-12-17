'use client'

import { useState, useEffect } from 'react'
import { Box, Typography, Button, Paper, Dialog, DialogTitle, DialogContent, TextField, DialogActions, IconButton, TreeView, TreeItem, Chip, Checkbox, FormControlLabel } from '@mui/material'
import api from '@/lib/api'

export default function DocumentationPage() {
  const [categories, setCategories] = useState([])
  const [pages, setPages] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pageDialogOpen, setPageDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '', parent_id: null })
  const [pageFormData, setPageFormData] = useState({ title: '', content: '', category_id: '', images: [], videos: [], is_published: false })
  const [editingPage, setEditingPage] = useState(null)

  useEffect(() => {
    loadCategories()
    loadPages()
  }, [])

  const loadCategories = async () => {
    try {
      const response = await api.get('/admin/documentation-categories')
      setCategories(response.data)
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadPages = async () => {
    try {
      const response = await api.get('/admin/documentation-pages')
      setPages(response.data)
    } catch (error) {
      console.error('Error loading pages:', error)
    }
  }

  const handleCreateCategory = async () => {
    try {
      await api.post('/admin/documentation-categories', formData)
      setDialogOpen(false)
      setFormData({ name: '', description: '', parent_id: null })
      loadCategories()
    } catch (error) {
      console.error('Error creating category:', error)
      alert('Error creating category')
    }
  }

  const handleCreatePage = async () => {
    try {
      const hasNewImages = pageFormData.images && pageFormData.images.length > 0 && typeof pageFormData.images[0] !== 'string'
      
      if (editingPage && !hasNewImages) {
        // Обновление без новых файлов - используем JSON
        await api.put(`/admin/documentation-pages/${editingPage.id}`, {
          title: pageFormData.title,
          content: pageFormData.content,
          category_id: pageFormData.category_id,
          is_published: pageFormData.is_published,
          images: editingPage.images, // Сохраняем существующие изображения
          videos: editingPage.videos, // Сохраняем существующие видео
        })
      } else {
        // Создание или обновление с новыми файлами - используем FormData
        const formDataToSend = new FormData()
        formDataToSend.append('title', pageFormData.title)
        formDataToSend.append('content', pageFormData.content)
        formDataToSend.append('category_id', pageFormData.category_id)
        formDataToSend.append('is_published', pageFormData.is_published ? '1' : '0')
        
        if (hasNewImages) {
          Array.from(pageFormData.images).forEach((image) => {
            formDataToSend.append('images[]', image)
          })
        } else if (editingPage && editingPage.images) {
          // Keep existing image URLs
          editingPage.images.forEach((img) => {
            formDataToSend.append('images[]', img)
          })
        }

        if (editingPage) {
          await api.post(`/admin/documentation-pages/${editingPage.id}`, formDataToSend, {
            headers: { 'Content-Type': 'multipart/form-data' },
            params: { _method: 'PUT' }
          })
        } else {
          await api.post('/admin/documentation-pages', formDataToSend, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        }
      }
      
      setPageDialogOpen(false)
      setEditingPage(null)
      setPageFormData({ title: '', content: '', category_id: '', images: [], videos: [], is_published: false })
      loadPages()
    } catch (error) {
      console.error('Error saving page:', error)
      alert('Error saving page')
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Documentation</Typography>
        <Box>
          <Button variant="contained" startIcon={<i className="ri-add-line" />} onClick={() => setDialogOpen(true)} sx={{ mr: 2 }}>
            Add Category
          </Button>
          <Button variant="contained" startIcon={<i className="ri-add-line" />} onClick={() => setPageDialogOpen(true)}>
            Add Page
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 3 }}>
        <Paper sx={{ p: 2, minWidth: 300 }}>
          <Typography variant="h6" gutterBottom>Categories</Typography>
          {categories.map((category) => (
            <Box key={category.id} sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography>{category.name}</Typography>
                <Box>
                  <IconButton size="small" onClick={() => setSelectedCategory(category)}>
                    <i className="ri-edit-box-line" />
                  </IconButton>
                  <IconButton size="small" color="error">
                    <i className="ri-delete-bin-7-line" />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          ))}
        </Paper>

        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="h6" gutterBottom>Pages</Typography>
          {pages.map((page) => (
            <Box key={page.id} sx={{ mb: 2, p: 2, border: '1px solid #ddd', borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6">{page.title}</Typography>
                  <Chip
                    label={page.is_published ? 'Published' : 'Draft'}
                    color={page.is_published ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Category: {page.category?.name}
                </Typography>
                {page.images && page.images.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <i className="ri-image-line" />
                    <Typography variant="caption">{page.images.length} image{page.images.length !== 1 ? 's' : ''}</Typography>
                  </Box>
                )}
                {page.videos && page.videos.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <i className="ri-video-line" />
                    <Typography variant="caption">{page.videos.length} video{page.videos.length !== 1 ? 's' : ''}</Typography>
                  </Box>
                )}
              </Box>
              <Box>
                <IconButton
                  size="small"
                  onClick={() => {
                    setEditingPage(page)
                    setPageFormData({
                      title: page.title,
                      content: page.content,
                      category_id: page.category_id,
                      images: page.images || [],
                      videos: page.videos || [],
                      is_published: page.is_published || false
                    })
                    setPageDialogOpen(true)
                  }}
                >
                  <i className="ri-edit-box-line" />
                </IconButton>
                <IconButton
                  size="small"
                  color={page.is_published ? 'default' : 'success'}
                  onClick={async () => {
                    try {
                      await api.put(`/admin/documentation-pages/${page.id}`, {
                        is_published: !page.is_published
                      })
                      loadPages()
                    } catch (error) {
                      console.error('Error updating publication status:', error)
                      alert('Error updating publication status: ' + (error.response?.data?.message || error.message))
                    }
                  }}
                >
                  <i className={page.is_published ? "ri-eye-off-line" : "ri-eye-line"} />
                </IconButton>
              </Box>
            </Box>
          ))}
        </Paper>
      </Box>

      {/* Category creation dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Category</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={3}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateCategory} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Page creation dialog */}
      <Dialog open={pageDialogOpen} onClose={() => {
        setPageDialogOpen(false)
        setEditingPage(null)
        setPageFormData({ title: '', content: '', category_id: '', images: [], videos: [], is_published: false })
      }} maxWidth="md" fullWidth>
        <DialogTitle>{editingPage ? 'Edit' : 'Create'} Page</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Title"
            value={pageFormData.title}
            onChange={(e) => setPageFormData({ ...pageFormData, title: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Category"
            select
            SelectProps={{ native: true }}
            value={pageFormData.category_id}
            onChange={(e) => setPageFormData({ ...pageFormData, category_id: e.target.value })}
            sx={{ mt: 2 }}
          >
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="Content"
            value={pageFormData.content}
            onChange={(e) => setPageFormData({ ...pageFormData, content: e.target.value })}
            multiline
            rows={6}
            sx={{ mt: 2 }}
          />
          <Button
            variant="outlined"
            component="label"
            startIcon={<i className="ri-image-line" />}
            sx={{ mt: 2 }}
          >
            Upload Images
            <input
              type="file"
              multiple
              accept="image/*"
              hidden
              onChange={(e) => setPageFormData({ ...pageFormData, images: e.target.files })}
            />
          </Button>
          <FormControlLabel
            control={
              <Checkbox
                checked={pageFormData.is_published}
                onChange={(e) => setPageFormData({ ...pageFormData, is_published: e.target.checked })}
              />
            }
            label="Publish"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setPageDialogOpen(false)
            setEditingPage(null)
            setPageFormData({ title: '', content: '', category_id: '', images: [], videos: [], is_published: false })
          }}>Cancel</Button>
          <Button onClick={handleCreatePage} variant="contained">{editingPage ? 'Save' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
