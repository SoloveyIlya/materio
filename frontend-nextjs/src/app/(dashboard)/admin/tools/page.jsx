'use client'

import { useState, useEffect } from 'react'
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions, FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, Grid } from '@mui/material'
import api from '@/lib/api'

// Component Imports
import ToolsListTable from '@/views/apps/tools/ToolsListTable'

export default function ToolsPage() {
  const [tools, setTools] = useState([])
  const [guides, setGuides] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '', url: '', guide_id: '', is_active: true })

  useEffect(() => {
    loadTools()
    loadGuides()
  }, [])

  const loadTools = async () => {
    try {
      const response = await api.get('/admin/tools')
      setTools(response.data || [])
    } catch (error) {
      console.error('Error loading tools:', error)
      setTools([])
    }
  }

  const loadGuides = async () => {
    try {
      const response = await api.get('/admin/documentation-pages')
      setGuides(response.data || [])
    } catch (error) {
      console.error('Error loading guides:', error)
      setGuides([])
    }
  }

  const handleSave = async () => {
    try {
      const dataToSend = {
        name: formData.name,
        description: formData.description || null,
        url: formData.url || null,
        guide_id: formData.guide_id && formData.guide_id !== '' ? parseInt(formData.guide_id) : null,
        is_active: formData.is_active !== undefined ? formData.is_active : true,
      }

      if (formData.id) {
        await api.put(`/admin/tools/${formData.id}`, dataToSend)
      } else {
        await api.post('/admin/tools', dataToSend)
      }
      setDialogOpen(false)
      setFormData({ name: '', description: '', url: '', guide_id: '', is_active: true })
      loadTools()
    } catch (error) {
      console.error('Error saving tool:', error)
      const errorMessage = error.response?.data?.message || 
                          (error.response?.data?.errors ? JSON.stringify(error.response.data.errors) : error.message) ||
                          'Error saving tool'
      alert(errorMessage)
    }
  }

  const handleEdit = (tool) => {
    setFormData({ 
      id: tool.id,
      name: tool.name,
      description: tool.description || '',
      url: tool.url || '',
      guide_id: tool.guide_id || '',
      is_active: tool.is_active !== undefined ? tool.is_active : true
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete tool?')) return
    try {
      await api.delete(`/admin/tools/${id}`)
      loadTools()
    } catch (error) {
      alert('Error deleting tool')
    }
  }

  return (
    <Box sx={{ p: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant='h4'>Tools</Typography>
        <Button variant='contained' startIcon={<i className='ri-add-line' />} onClick={() => setDialogOpen(true)}>
          Add Tool
        </Button>
      </Box>

      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <ToolsListTable
            tableData={tools}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </Grid>
      </Grid>

      <Dialog open={dialogOpen} onClose={() => {
        setDialogOpen(false)
        setFormData({ name: '', description: '', url: '', guide_id: '', is_active: true })
      }} maxWidth="sm" fullWidth>
        <DialogTitle>{formData.id ? 'Edit' : 'Create'} Tool</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Description"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={3}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="URL"
            value={formData.url || ''}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            sx={{ mt: 2 }}
            helperText="Enter full URL (e.g., https://example.com)"
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Guide</InputLabel>
            <Select
              value={formData.guide_id || ''}
              label="Guide"
              onChange={(e) => setFormData({ ...formData, guide_id: e.target.value })}
            >
              <MenuItem value="">No guide</MenuItem>
              {guides.map((guide) => (
                <MenuItem key={guide.id} value={guide.id.toString()}>{guide.title}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.is_active !== undefined ? formData.is_active : true}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
            }
            label="Active"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDialogOpen(false)
            setFormData({ name: '', description: '', url: '', guide_id: '', is_active: true })
          }}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.name}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
