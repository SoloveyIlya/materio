'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction'

// Component Imports
import api from '@/lib/api'

const DocumentsTab = ({ userId, requiredDocuments, userDocuments }) => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', file: null })
  const [editingDoc, setEditingDoc] = useState(null)
  const [documents, setDocuments] = useState(requiredDocuments || [])
  const [userDocs, setUserDocs] = useState(userDocuments || [])

  // Создаем мапу загруженных документов пользователя
  const userDocsMap = {}
  userDocs.forEach(doc => {
    userDocsMap[doc.required_document_id] = doc
  })

  const handleOpenDialog = (doc = null) => {
    if (doc) {
      setEditingDoc(doc)
      setFormData({ name: doc.name, file: null })
    } else {
      setEditingDoc(null)
      setFormData({ name: '', file: null })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingDoc(null)
    setFormData({ name: '', file: null })
  }

  const handleSave = async () => {
    try {
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name)
      if (formData.file) {
        formDataToSend.append('file', formData.file)
      }

      if (editingDoc) {
        await api.put(`/admin/required-documents/${editingDoc.id}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      } else {
        await api.post('/admin/required-documents', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }

      // Перезагружаем документы
      const response = await api.get('/admin/required-documents')
      setDocuments(response.data || [])
      
      handleCloseDialog()
    } catch (error) {
      console.error('Error saving document:', error)
      alert('Error saving document')
    }
  }

  const handleDelete = async (docId) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      await api.delete(`/admin/required-documents/${docId}`)
      
      // Перезагружаем документы
      const response = await api.get('/admin/required-documents')
      setDocuments(response.data || [])
    } catch (error) {
      console.error('Error deleting document:', error)
      alert('Error deleting document')
    }
  }

  const handleCheckDocument = (doc) => {
    const userDoc = userDocsMap[doc.id]
    if (userDoc && userDoc.file_path) {
      window.open(userDoc.file_path, '_blank')
    }
  }

  return (
    <Card>
      <CardHeader 
        title='Documents'
        action={
          <Button variant='contained' onClick={() => handleOpenDialog()} startIcon={<i className='ri-add-line' />}>
            Add Required Document
          </Button>
        }
      />
      <CardContent>
        <List>
          {documents.map((doc) => {
            const userDoc = userDocsMap[doc.id]
            const isUploaded = !!userDoc
            
            return (
              <ListItem key={doc.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant='subtitle1'>{doc.name}</Typography>
                      <Typography variant='h6' color={isUploaded ? 'success.main' : 'error.main'}>
                        {isUploaded ? '✅' : '❌'}
                      </Typography>
                      {isUploaded && (
                        <Button
                          size='small'
                          variant='outlined'
                          onClick={() => handleCheckDocument(doc)}
                          sx={{ ml: 1 }}
                        >
                          Check
                        </Button>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton edge='end' onClick={() => handleOpenDialog(doc)} sx={{ mr: 1 }}>
                    <i className='ri-edit-line' />
                  </IconButton>
                  <IconButton edge='end' onClick={() => handleDelete(doc.id)} color='error'>
                    <i className='ri-delete-bin-line' />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            )
          })}
        </List>
      </CardContent>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth='sm' fullWidth>
        <DialogTitle>{editingDoc ? 'Edit Document' : 'Add Required Document'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label='Document Name'
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mt: 2 }}
          />
          <Button
            variant='outlined'
            component='label'
            fullWidth
            startIcon={<i className='ri-file-line' />}
            sx={{ mt: 2 }}
          >
            {formData.file ? formData.file.name : editingDoc ? 'Change File' : 'Upload File'}
            <input
              type='file'
              accept='.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp'
              hidden
              onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })}
            />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant='contained' onClick={handleSave}>
            {editingDoc ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}

export default DocumentsTab

