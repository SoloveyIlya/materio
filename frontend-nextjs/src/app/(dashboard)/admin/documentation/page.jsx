'use client'

import { useState, useEffect } from 'react'
import { Box, Grid, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, Button, Checkbox, FormControlLabel, Typography } from '@mui/material'
import api from '@/lib/api'
import ContentEditor from '@/components/documentation/ContentEditor'
import DocumentationHeader from '@/components/documentation/DocumentationHeader'
import Documentations from '@/components/documentation/Documentations'

export default function DocumentationPage() {
  const [categories, setCategories] = useState([])
  const [pages, setPages] = useState([])
  const [tools, setTools] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    category_id: '',
    tool_id: '',
    title: '',
    content: '',
    content_blocks: [],
    is_published: false
  })
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    parent_id: ''
  })
  const [editingPage, setEditingPage] = useState(null)

  useEffect(() => {
    loadCategories()
    loadPages()
    loadTools()
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

  const loadTools = async () => {
    try {
      const response = await api.get('/admin/tools')
      setTools(response.data)
    } catch (error) {
      console.error('Error loading tools:', error)
    }
  }

  const handleOpenDialog = (page = null) => {
    if (page) {
      setEditingPage(page)
      setFormData({
        category_id: page.category_id?.toString() || '',
        tool_id: page.tools?.[0]?.toString() || '',
        title: page.title || '',
        content: page.content || '',
        content_blocks: page.content_blocks || [],
        is_published: page.is_published || false
      })
    } else {
      setEditingPage(null)
      setFormData({
        category_id: categories[0]?.id?.toString() || '',
        tool_id: '',
        title: '',
        content: '',
        content_blocks: [],
        is_published: false
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingPage(null)
    setFormData({
      category_id: '',
      tool_id: '',
      title: '',
      content: '',
      content_blocks: [],
      is_published: false
    })
  }

  const handleSave = async () => {
    try {
      const formDataToSend = new FormData()
      
      formDataToSend.append('category_id', formData.category_id)
      formDataToSend.append('title', formData.title)
      formDataToSend.append('content', formData.content || '')
      formDataToSend.append('is_published', formData.is_published ? '1' : '0')
      
      if (formData.tool_id) {
        formDataToSend.append('tools[]', formData.tool_id)
      }

      // Process content blocks and extract images/videos
      const images = []
      const videos = []
      const processedBlocks = []

      if (formData.content_blocks && formData.content_blocks.length > 0) {
        formData.content_blocks.forEach((block, index) => {
          if (block.type === 'image') {
            if (block.file) {
              // New file upload
              formDataToSend.append('images[]', block.file)
              processedBlocks.push({ type: 'image', position: index, isNew: true })
            } else if (block.url) {
              // Existing URL
              images.push(block.url)
              processedBlocks.push({ type: 'image', url: block.url, position: index })
            }
          } else if (block.type === 'video') {
            if (block.file) {
              // New file upload
              formDataToSend.append(`videos[${videos.length}][type]`, 'local')
              formDataToSend.append(`videos[${videos.length}][file]`, block.file)
              processedBlocks.push({ type: 'video', position: index, isNew: true })
            } else if (block.url) {
              // Embed URL
              formDataToSend.append(`videos[${videos.length}][type]`, 'embed')
              formDataToSend.append(`videos[${videos.length}][url]`, block.url)
              processedBlocks.push({ type: 'video', videoType: block.videoType, url: block.url, position: index })
            }
          } else {
            // Text or other blocks
            processedBlocks.push(block)
          }
        })
      }

      // Add content_blocks as JSON
      formDataToSend.append('content_blocks', JSON.stringify(processedBlocks))

      if (editingPage) {
        await api.put(`/admin/documentation-pages/${editingPage.id}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      } else {
        await api.post('/admin/documentation-pages', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }
      
      handleCloseDialog()
      loadPages()
    } catch (error) {
      console.error('Error saving page:', error)
      alert('Error saving page: ' + (error.response?.data?.message || error.message))
    }
  }

  const handleOpenCategoryDialog = () => {
    setCategoryFormData({
      name: '',
      description: '',
      parent_id: ''
    })
    setCategoryDialogOpen(true)
  }

  const handleCloseCategoryDialog = () => {
    setCategoryDialogOpen(false)
    setCategoryFormData({
      name: '',
      description: '',
      parent_id: ''
    })
  }

  const handleSaveCategory = async () => {
    try {
      const dataToSend = {
        name: categoryFormData.name,
        description: categoryFormData.description || null,
        parent_id: categoryFormData.parent_id || null
      }

      await api.post('/admin/documentation-categories', dataToSend)
      
      handleCloseCategoryDialog()
      loadCategories()
    } catch (error) {
      console.error('Error saving category:', error)
      alert('Error saving category: ' + (error.response?.data?.message || error.message))
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <DocumentationHeader
            onAddDocumentation={() => handleOpenDialog()}
            onAddCategory={handleOpenCategoryDialog}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Documentations
            categories={categories}
            pages={pages}
            onEditPage={handleOpenDialog}
          />
        </Grid>
      </Grid>

      {/* Add/Edit Documentation Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth='lg' fullWidth>
        <DialogTitle>{editingPage ? 'Edit' : 'Add'} Documentation</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              label='Category'
            >
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id?.toString() || ''}>
                  {cat.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Tool (optional)</InputLabel>
            <Select
              value={formData.tool_id}
              onChange={(e) => setFormData({ ...formData, tool_id: e.target.value })}
              label='Tool (optional)'
            >
              <MenuItem value=''>None</MenuItem>
              {tools.map((tool) => (
                <MenuItem key={tool.id} value={tool.id?.toString() || ''}>
                  {tool.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label='Title'
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            sx={{ mt: 2 }}
          />

          <Box sx={{ mt: 2 }}>
            <Typography variant='subtitle1' sx={{ mb: 1 }}>
              Content Blocks (arrange text, images, and videos)
            </Typography>
            <ContentEditor
              contentBlocks={formData.content_blocks}
              onChange={(blocks) => setFormData({ ...formData, content_blocks: blocks })}
              tools={tools}
            />
          </Box>

          <TextField
            fullWidth
            label='Additional Content (optional)'
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            multiline
            rows={3}
            sx={{ mt: 2 }}
            helperText='Plain text content (content blocks above are preferred)'
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
              />
            }
            label='Publish'
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant='contained'>
            {editingPage ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={categoryDialogOpen} onClose={handleCloseCategoryDialog} maxWidth='sm' fullWidth>
        <DialogTitle>Add Category</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label='Category Name'
            value={categoryFormData.name}
            onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
            sx={{ mt: 2 }}
            required
          />
          <TextField
            fullWidth
            label='Description'
            value={categoryFormData.description}
            onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
            multiline
            rows={3}
            sx={{ mt: 2 }}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Parent Category (optional)</InputLabel>
            <Select
              value={categoryFormData.parent_id}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, parent_id: e.target.value })}
              label='Parent Category (optional)'
            >
              <MenuItem value=''>None (Root Category)</MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id?.toString() || ''}>
                  {cat.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCategoryDialog}>Cancel</Button>
          <Button onClick={handleSaveCategory} variant='contained' disabled={!categoryFormData.name}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
