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
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction'
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
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploading, setUploading] = useState(false)

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

  const handleUpload = async () => {
    if (!uploadFile) {
      showToast.error('Please select a file to upload')
      return
    }

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('required_document_id', selectedDocument.id)

      const response = await api.post('/moderator/user-documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      showToast.success('Document uploaded successfully')
      handleCloseUploadDialog()
      if (onDocumentUpload) {
        onDocumentUpload()
      }
    } catch (error) {
      console.error('Error uploading document:', error)
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
    <>
      <Card>
        <CardHeader title='Documents' />
        <CardContent>
          <List>
            {requiredDocuments.map((doc) => {
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
                    <Box sx={{ display: 'flex', gap: 1 }}>
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
            {requiredDocuments.length === 0 && (
              <ListItem>
                <Typography color='text.secondary'>No documents required</Typography>
              </ListItem>
            )}
          </List>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={handleCloseUploadDialog} maxWidth='sm' fullWidth>
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
    </>
  )
}

export default ModeratorDocumentsTab

