'use client'

import { useState, useEffect } from 'react'
import { Box, Typography, Button, Paper, Dialog, DialogTitle, DialogContent, TextField, DialogActions, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel } from '@mui/material'
import api from '@/lib/api'

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
      setTools(response.data)
    } catch (error) {
      console.error('Error loading tools:', error)
    }
  }

  const loadGuides = async () => {
    try {
      const response = await api.get('/admin/documentation-pages')
      setGuides(response.data)
    } catch (error) {
      console.error('Error loading guides:', error)
    }
  }

  const handleSave = async () => {
    try {
      // Prepare data for sending
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
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Tools</Typography>
        <Button variant="contained" startIcon={<i className="ri-add-line" />} onClick={() => setDialogOpen(true)}>
          Add Tool
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>URL</TableCell>
              <TableCell>Guide</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tools.map((tool) => (
              <TableRow key={tool.id}>
                <TableCell>{tool.id}</TableCell>
                <TableCell>{tool.name}</TableCell>
                <TableCell>{tool.description || '—'}</TableCell>
                <TableCell>
                  {tool.url ? (
                    <Button startIcon={<i className="ri-links-line" />} href={tool.url} target="_blank" size="small">
                      Open
                    </Button>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>
                  {tool.guide ? (
                    <Chip label={tool.guide.title} size="small" color="primary" />
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={tool.is_active ? 'Active' : 'Inactive'}
                    color={tool.is_active ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => {
                    setFormData({ 
                      id: tool.id,
                      name: tool.name,
                      description: tool.description || '',
                      url: tool.url || '',
                      guide_id: tool.guide_id || '',
                      is_active: tool.is_active !== undefined ? tool.is_active : true
                    })
                    setDialogOpen(true)
                  }}>
                    <i className="ri-edit-box-line" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(tool.id)}>
                    <i className="ri-delete-bin-7-line" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
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
