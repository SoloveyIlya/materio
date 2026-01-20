'use client'

// React Imports
import { useState, useEffect, useRef } from 'react'
import * as React from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'

// Component Imports
import api from '@/lib/api'
import { showToast } from '@/utils/toast'

const ModeratorDocumentsTab = ({ requiredDocuments, userDocuments, onDocumentUpload }) => {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editFormData, setEditFormData] = useState({ name: '', file: null })
  const [documents, setDocuments] = useState(requiredDocuments || [])
  const containerRef = useRef(null)
  const justUpdatedRef = useRef(null) // Отслеживаем только что обновленные документы

  // Обновляем documents при изменении requiredDocuments
  React.useEffect(() => {
    if (justUpdatedRef.current) {
      // Если документ был только что обновлен, сохраняем его версию
      const savedDocId = justUpdatedRef.current
      setDocuments(prevDocs => {
        const savedDoc = prevDocs.find(doc => doc.id === savedDocId)
        if (savedDoc) {
          // Объединяем новые данные с сохраненным документом
          return (requiredDocuments || []).map(newDoc => {
            if (newDoc.id === savedDocId) {
              // Используем сохраненную версию, если она есть
              return savedDoc
            }
            return newDoc
          })
        }
        return requiredDocuments || []
      })
      // Сбрасываем флаг через небольшую задержку
      setTimeout(() => {
        justUpdatedRef.current = null
      }, 1000)
    } else {
      setDocuments(requiredDocuments || [])
    }
  }, [requiredDocuments])

  // Агрессивно убираем aria-hidden с родительских элементов когда есть фокус или открыт диалог
  useEffect(() => {
    if (!containerRef.current) return

    const fixAriaHiddenForElement = (element) => {
      // Проверяем все родительские элементы
      let current = element
      while (current && current !== document.body) {
        if (current.getAttribute('aria-hidden') === 'true') {
          // Проверяем, есть ли внутри фокусируемые элементы
          const hasFocusedElement = current.querySelector(':focus')
          const hasInteractiveElement = current.querySelector('button, input, textarea, select, [tabindex]:not([tabindex="-1"])')
          
          if (hasFocusedElement || hasInteractiveElement) {
            // Сохраняем оригинальное значение и убираем aria-hidden
            if (!current.hasAttribute('data-original-aria-hidden')) {
              current.setAttribute('data-original-aria-hidden', 'true')
            }
            current.setAttribute('aria-hidden', 'false')
          }
        }
        current = current.parentElement
      }
    }

    const handleFocus = (e) => {
      if (containerRef.current && containerRef.current.contains(e.target)) {
        fixAriaHiddenForElement(e.target)
      }
    }

    const handleClick = (e) => {
      if (containerRef.current && containerRef.current.contains(e.target)) {
        // Небольшая задержка для обработки фокуса после клика
        setTimeout(() => {
          fixAriaHiddenForElement(e.target)
        }, 0)
      }
    }

    // MutationObserver для отслеживания изменений aria-hidden
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
          const target = mutation.target
          if (target.getAttribute('aria-hidden') === 'true') {
            // Проверяем, есть ли внутри фокусируемые элементы
            const hasFocusedElement = target.querySelector(':focus')
            const hasInteractiveElement = target.querySelector('button, input, textarea, select, [tabindex]:not([tabindex="-1"])')
            
            if (hasFocusedElement || (containerRef.current && target.contains(containerRef.current))) {
              if (!target.hasAttribute('data-original-aria-hidden')) {
                target.setAttribute('data-original-aria-hidden', 'true')
              }
              target.setAttribute('aria-hidden', 'false')
            }
          }
        }
      })
    })

    // Наблюдаем за изменениями в родительских элементах
    let current = containerRef.current.parentElement
    const observedElements = []
    while (current && current !== document.body) {
      observer.observe(current, {
        attributes: true,
        attributeFilter: ['aria-hidden'],
        subtree: false
      })
      observedElements.push(current)
      current = current.parentElement
    }

    // Также наблюдаем за document.body для глобальных изменений
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['aria-hidden'],
      subtree: true,
      childList: false
    })

    document.addEventListener('focusin', handleFocus, true)
    document.addEventListener('click', handleClick, true)
    
    // Первоначальная проверка
    fixAriaHiddenForElement(containerRef.current)

    return () => {
      observer.disconnect()
      document.removeEventListener('focusin', handleFocus, true)
      document.removeEventListener('click', handleClick, true)
    }
  }, [uploadDialogOpen, editDialogOpen])

  // Создаем мапу загруженных документов пользователя
  const userDocsMap = {}
  userDocuments.forEach(doc => {
    userDocsMap[doc.required_document_id] = doc
  })

  const handleDownload = async (doc) => {
    try {
      if (!doc.file_path) {
        showToast.error('Document file not found')
        return
      }

      // Формируем полный URL для скачивания
      let filePath = doc.file_path
      if (!filePath.startsWith('http')) {
        if (filePath.startsWith('/storage')) {
          filePath = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${filePath}`
        } else {
          filePath = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/storage/${filePath}`
        }
      }
      
      // Создаем временную ссылку для скачивания
      const link = document.createElement('a')
      link.href = filePath
      link.download = doc.file_name || doc.name || 'document'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error downloading document:', error)
      showToast.error('Error downloading document')
    }
  }

  const handleOpenUploadDialog = (doc) => {
    setSelectedDocument(doc)
    setUploadFile(null)
    setUploadDialogOpen(true)
  }

  const handleCloseUploadDialog = () => {
    setUploadDialogOpen(false)
    setSelectedDocument(null)
    setUploadFile(null)
  }

  const handleOpenEditDialog = (doc) => {
    console.log('Opening edit dialog for doc:', doc)
    setSelectedDocument(doc)
    const docName = doc?.name || doc?.name || ''
    console.log('Setting name to:', docName)
    setEditFormData({ 
      name: docName, 
      file: null 
    })
    setEditDialogOpen(true)
  }

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false)
    setSelectedDocument(null)
    setEditFormData({ name: '', file: null })
  }

  const handleUpdateDocument = async () => {
    const documentName = editFormData.name?.trim()
    
    if (!documentName) {
      showToast.error('Document name is required')
      return
    }

    if (!selectedDocument?.id) {
      showToast.error('Document not selected')
      return
    }

    try {
      setEditing(true)
      
      const formData = new FormData()
      formData.append('name', documentName)
      
      if (editFormData.file) {
        formData.append('file', editFormData.file)
      }

      formData.append('_method', 'PUT')
      
      const response = await api.post(
        `/moderator/required-documents/${selectedDocument.id}`, 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      const updatedDoc = response.data
      
      // Обновляем локальное состояние
      setDocuments(prevDocs => 
        prevDocs.map(doc => 
          doc.id === updatedDoc.id ? updatedDoc : doc
        )
      )
      
      // Обновляем родительский компонент
      if (onDocumentUpload) {
        await onDocumentUpload()
      }
      
      handleCloseEditDialog()
      showToast.success('Document updated successfully')
    } catch (error) {
      console.error('Error updating document:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Error updating document'
      showToast.error(errorMessage)
    } finally {
      setEditing(false)
    }
  }

  const handleUpload = async () => {
    if (!uploadFile) {
      showToast.error('Please select a file to upload')
      return
    }

    if (!selectedDocument?.id) {
      showToast.error('Document not selected')
      console.error('selectedDocument:', selectedDocument)
      return
    }

    try {
      setUploading(true)
      console.log('Starting upload for document:', selectedDocument.id, 'File:', uploadFile.name)
      
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('required_document_id', selectedDocument.id)

      console.log('FormData keys:', Array.from(formData.keys()))
      
      const response = await api.post('/moderator/user-documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      console.log('Upload response:', response.data)
      showToast.success('Document uploaded successfully')
      handleCloseUploadDialog()
      if (onDocumentUpload) {
        await onDocumentUpload()
      }
    } catch (error) {
      console.error('Error uploading document:', error)
      console.error('Error response:', error.response?.data)
      showToast.error('Error uploading document: ' + (error.response?.data?.message || error.message))
    } finally {
      setUploading(false)
    }
  }

  const getDocumentStatus = (doc) => {
    const userDoc = userDocsMap[doc.id]
    return {
      isUploaded: !!userDoc,
      userDoc: userDoc
    }
  }

  return (
    <div ref={containerRef}>
      <Card>
        <CardHeader title='Documents' />
        <CardContent>
          <List>
            {documents.map((doc) => {
              const { isUploaded, userDoc } = getDocumentStatus(doc)
              
              return (
                <ListItem 
                  key={doc.id} 
                  sx={{ 
                    border: '1px solid', 
                    borderColor: 'divider', 
                    borderRadius: 1, 
                    mb: 1,
                    flexDirection: 'column',
                    alignItems: 'stretch'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      {doc.file_path && (
                        <Button
                          size='small'
                          variant='outlined'
                          startIcon={<i className='ri-download-line' />}
                          onClick={() => handleDownload(doc)}
                        >
                          Download
                        </Button>
                      )}
                      <Button
                        size='small'
                        variant='contained'
                        startIcon={<i className='ri-upload-line' />}
                        onClick={() => handleOpenUploadDialog(doc)}
                      >
                        Upload
                      </Button>
                      <IconButton 
                        edge='end' 
                        size='small'
                        onClick={() => handleOpenEditDialog(doc)}
                        sx={{ ml: 1 }}
                      >
                        <i className='ri-edit-line' />
                      </IconButton>
                    </Box>
                  </Box>
                  {isUploaded && userDoc?.file_path && (
                    <Typography variant='caption' color='text.secondary'>
                      Uploaded: {userDoc.created_at ? new Date(userDoc.created_at).toLocaleDateString() : '—'}
                    </Typography>
                  )}
                </ListItem>
              )
            })}
            {documents.length === 0 && (
              <ListItem>
                <Typography color='text.secondary'>No documents required</Typography>
              </ListItem>
            )}
          </List>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog 
        open={uploadDialogOpen} 
        onClose={handleCloseUploadDialog} 
        maxWidth='sm' 
        fullWidth
        disableEnforceFocus={false}
        disableAutoFocus={false}
      >
        <DialogTitle>Upload Document - {selectedDocument?.name}</DialogTitle>
        <DialogContent>
          <Typography variant='body2' sx={{ mb: 2 }}>
            Please upload the completed document file.
          </Typography>
          <Button
            variant='outlined'
            component='label'
            fullWidth
            startIcon={<i className='ri-file-line' />}
            sx={{ mt: 2 }}
          >
            {uploadFile ? uploadFile.name : 'Select File'}
            <input
              type='file'
              accept='.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.jpg,.jpeg,.png'
              hidden
              onChange={(e) => setUploadFile(e.target.files[0])}
            />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUploadDialog}>Cancel</Button>
          <Button 
            variant='contained' 
            onClick={handleUpload}
            disabled={!uploadFile || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={handleCloseEditDialog} 
        maxWidth='sm' 
        fullWidth
      >
        <DialogTitle>Edit Document</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant='body2' sx={{ mb: 1, fontWeight: 500 }}>
              Document Name
            </Typography>
            <input
              type='text'
              value={editFormData.name || ''}
              onChange={(e) => {
                const newName = e.target.value
                setEditFormData(prev => ({ ...prev, name: newName }))
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
            {editFormData.file ? editFormData.file.name : 'Change File (Optional)'}
            <input
              type='file'
              accept='.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp'
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0] || null
                setEditFormData(prev => ({ ...prev, file }))
              }}
            />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button 
            variant='contained' 
            onClick={handleUpdateDocument}
            disabled={!editFormData.name?.trim() || editing}
          >
            {editing ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default ModeratorDocumentsTab

