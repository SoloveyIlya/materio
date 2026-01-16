'use client'

// React Imports
import { useState, useEffect } from 'react'

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
import { showToast } from '@/utils/toast'

const DocumentsTab = ({ userId, requiredDocuments, userDocuments, onDocumentsChange }) => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', file: null })
  const [editingDoc, setEditingDoc] = useState(null)
  const [documents, setDocuments] = useState(requiredDocuments || [])
  const [userDocs, setUserDocs] = useState(userDocuments || [])

  // Обновляем userDocs при изменении пропса userDocuments
  useEffect(() => {
    setUserDocs(userDocuments || [])
  }, [userDocuments])

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
    if (!formData.name || !formData.name.trim()) {
      showToast.error('Document name is required')
      return
    }

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name.trim())
      if (formData.file) {
        formDataToSend.append('file', formData.file)
      }

      if (editingDoc) {
        // Используем POST с методом spoofing для FormData
        formDataToSend.append('_method', 'PUT')
        await api.post(`/admin/required-documents/${editingDoc.id}`, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      } else {
        await api.post('/admin/required-documents', formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      }

      // Перезагружаем документы
      const response = await api.get('/admin/required-documents')
      setDocuments(response.data || [])
      
      // Обновляем данные пользователя, чтобы получить актуальные userDocuments
      if (onDocumentsChange) {
        await onDocumentsChange()
      }
      
      handleCloseDialog()
      showToast.success(editingDoc ? 'Document updated successfully' : 'Document created successfully')
    } catch (error) {
      console.error('Error saving document:', error)
      let errorMessage = 'Error saving document'
      if (error.response?.data?.errors) {
        // Если есть ошибки валидации, показываем первую
        const firstError = Object.values(error.response.data.errors)[0]
        errorMessage = Array.isArray(firstError) ? firstError[0] : firstError
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }
      showToast.error(errorMessage)
    }
  }

  const handleDelete = async (docId) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      await api.delete(`/admin/required-documents/${docId}`)
      
      // Перезагружаем документы
      const response = await api.get('/admin/required-documents')
      setDocuments(response.data || [])
      showToast.success('Document deleted successfully')
    } catch (error) {
      console.error('Error deleting document:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Error deleting document'
      showToast.error(errorMessage)
    }
  }

  const handleCheckDocument = (doc) => {
    const userDoc = userDocsMap[doc.id]
    if (userDoc && userDoc.file_path) {
      // Если путь относительный, добавляем базовый URL API
      const filePath = userDoc.file_path.startsWith('http') 
        ? userDoc.file_path 
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${userDoc.file_path}`
      window.open(filePath, '_blank')
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
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Typography variant='subtitle1'>{doc.name}</Typography>
                        {isUploaded ? (
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              bgcolor: 'success.main',
                              color: 'success.contrastText',
                              flexShrink: 0
                            }}
                          >
                            <i className='ri-check-line' style={{ fontSize: '16px' }} />
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              bgcolor: 'error.main',
                              color: 'error.contrastText',
                              flexShrink: 0
                            }}
                          >
                            <i className='ri-close-line' style={{ fontSize: '16px' }} />
                          </Box>
                        )}
                      </Box>
                      {isUploaded && (
                        <Button
                          size='small'
                          variant='outlined'
                          onClick={() => handleCheckDocument(doc)}
                          sx={{ ml: 2 }}
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
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant='body2' sx={{ mb: 1, fontWeight: 500 }}>
              Document Name
            </Typography>
            <input
              type='text'
              value={formData.name || ''}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, name: e.target.value }))
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '16px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              autoFocus
              placeholder='Enter document name'
            />
          </Box>
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

