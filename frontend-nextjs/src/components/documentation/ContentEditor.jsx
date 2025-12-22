'use client'

import { useState, useMemo } from 'react'
import { Box, Typography, Button, TextField, IconButton, Paper, Select, MenuItem, FormControl, InputLabel, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'

const ContentEditor = ({ contentBlocks, onChange, tools = [] }) => {
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [videoDialogOpen, setVideoDialogOpen] = useState(false)
  const [toolDialogOpen, setToolDialogOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(null)
  const [tempImage, setTempImage] = useState({ file: null, url: '' })
  const [tempVideo, setTempVideo] = useState({ type: 'embed', url: '', file: null })
  const [tempTool, setTempTool] = useState({ toolId: '' })

  // Нормализуем contentBlocks - убеждаемся, что это массив
  const normalizedBlocks = useMemo(() => {
    if (!contentBlocks) return []
    if (Array.isArray(contentBlocks)) return contentBlocks
    if (typeof contentBlocks === 'string') {
      try {
        const parsed = JSON.parse(contentBlocks)
        return Array.isArray(parsed) ? parsed : []
      } catch (e) {
        console.error('Error parsing contentBlocks:', e)
        return []
      }
    }
    return []
  }, [contentBlocks])

  const handleAddText = () => {
    const newBlocks = [...normalizedBlocks, { type: 'text', content: '' }]
    onChange(newBlocks)
  }

  const handleAddImage = (index = null) => {
    setCurrentIndex(index)
    setImageDialogOpen(true)
  }

  const handleAddVideo = (index = null) => {
    setCurrentIndex(index)
    setVideoDialogOpen(true)
  }

  const handleAddTool = (index = null) => {
    setCurrentIndex(index)
    setTempTool({ toolId: '' })
    setToolDialogOpen(true)
  }

  const handleSaveTool = () => {
    const selectedTool = tools.find(t => t.id?.toString() === tempTool.toolId)
    const newBlock = {
      type: 'tool',
      toolId: tempTool.toolId,
      toolName: selectedTool?.name || '',
      position: currentIndex !== null ? currentIndex : normalizedBlocks.length
    }

    let newBlocks = [...normalizedBlocks]
    if (currentIndex !== null) {
      newBlocks.splice(currentIndex, 0, newBlock)
    } else {
      newBlocks.push(newBlock)
    }

    onChange(newBlocks)
    setToolDialogOpen(false)
    setTempTool({ toolId: '' })
    setCurrentIndex(null)
  }

  const handleSaveImage = () => {
    const newBlock = {
      type: 'image',
      url: tempImage.url,
      file: tempImage.file,
      position: currentIndex !== null ? currentIndex : normalizedBlocks.length
    }

    let newBlocks = [...normalizedBlocks]
    if (currentIndex !== null) {
      newBlocks.splice(currentIndex, 0, newBlock)
    } else {
      newBlocks.push(newBlock)
    }

    onChange(newBlocks)
    setImageDialogOpen(false)
    setTempImage({ file: null, url: '' })
    setCurrentIndex(null)
  }

  const handleSaveVideo = () => {
    const newBlock = {
      type: 'video',
      videoType: tempVideo.type,
      url: tempVideo.url,
      file: tempVideo.file,
      position: currentIndex !== null ? currentIndex : normalizedBlocks.length
    }

    let newBlocks = [...(contentBlocks || [])]
    if (currentIndex !== null) {
      newBlocks.splice(currentIndex, 0, newBlock)
    } else {
      newBlocks.push(newBlock)
    }

    onChange(newBlocks)
    setVideoDialogOpen(false)
    setTempVideo({ type: 'embed', url: '', file: null })
    setCurrentIndex(null)
  }

  const handleUpdateBlock = (index, content) => {
    const newBlocks = [...(contentBlocks || [])]
    newBlocks[index] = { ...newBlocks[index], content }
    onChange(newBlocks)
  }

  const handleDeleteBlock = (index) => {
    const newBlocks = [...normalizedBlocks]
    newBlocks.splice(index, 1)
    onChange(newBlocks)
  }

  const handleMoveUp = (index) => {
    if (index === 0) return
    const newBlocks = [...normalizedBlocks]
    const temp = newBlocks[index]
    newBlocks[index] = newBlocks[index - 1]
    newBlocks[index - 1] = temp
    onChange(newBlocks)
  }

  const handleMoveDown = (index) => {
    if (index === normalizedBlocks.length - 1) return
    const newBlocks = [...normalizedBlocks]
    const temp = newBlocks[index]
    newBlocks[index] = newBlocks[index + 1]
    newBlocks[index + 1] = temp
    onChange(newBlocks)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Button size='small' variant='outlined' onClick={handleAddText} startIcon={<i className='ri-text' />}>
          Add Text
        </Button>
        <Button size='small' variant='outlined' onClick={() => handleAddImage()} startIcon={<i className='ri-image-line' />}>
          Add Image
        </Button>
        <Button size='small' variant='outlined' onClick={() => handleAddVideo()} startIcon={<i className='ri-video-line' />}>
          Add Video
        </Button>
        {tools.length > 0 && (
          <Button size='small' variant='outlined' onClick={() => handleAddTool()} startIcon={<i className='ri-tools-line' />}>
            Add Tool
          </Button>
        )}
      </Box>

      <Box>
        {normalizedBlocks.map((block, index) => (
          <Paper
            key={index}
            sx={{
              p: 2,
              mb: 2,
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
                <IconButton size='small' onClick={() => handleMoveUp(index)} disabled={index === 0}>
                  <i className='ri-arrow-up-line' />
                </IconButton>
                <IconButton size='small' onClick={() => handleMoveDown(index)} disabled={index === normalizedBlocks.length - 1}>
                  <i className='ri-arrow-down-line' />
                </IconButton>
              </Box>
                        <Box sx={{ flex: 1 }}>
                          {block.type === 'text' && (
                            <TextField
                              fullWidth
                              multiline
                              rows={4}
                              value={block.content || ''}
                              onChange={(e) => handleUpdateBlock(index, e.target.value)}
                              placeholder='Enter text content...'
                            />
                          )}
                          {block.type === 'image' && (
                            <Box>
                              <Typography variant='subtitle2' sx={{ mb: 1 }}>
                                Image
                              </Typography>
                              {block.url && (
                                <Box sx={{ mb: 1 }}>
                                  <img src={block.url} alt='Preview' style={{ maxWidth: '100%', maxHeight: 200 }} />
                                </Box>
                              )}
                              <Button size='small' onClick={() => {
                                setCurrentIndex(index)
                                setTempImage({ file: block.file, url: block.url || '' })
                                setImageDialogOpen(true)
                              }}>
                                {block.url ? 'Change Image' : 'Add Image'}
                              </Button>
                            </Box>
                          )}
                          {block.type === 'video' && (
                            <Box>
                              <Typography variant='subtitle2' sx={{ mb: 1 }}>
                                Video ({block.videoType})
                              </Typography>
                              {block.url && (
                                <Box sx={{ mb: 1 }}>
                                  {block.videoType === 'embed' ? (
                                    <Typography variant='body2' color='text.secondary'>
                                      Embed URL: {block.url}
                                    </Typography>
                                  ) : (
                                    <Typography variant='body2' color='text.secondary'>
                                      Local video file
                                    </Typography>
                                  )}
                                </Box>
                              )}
                              <Button size='small' onClick={() => {
                                setCurrentIndex(index)
                                setTempVideo({ type: block.videoType || 'embed', url: block.url || '', file: block.file })
                                setVideoDialogOpen(true)
                              }}>
                                {block.url ? 'Change Video' : 'Add Video'}
                              </Button>
                            </Box>
                          )}
                          {block.type === 'tool' && (
                            <Box>
                              <Typography variant='subtitle2' sx={{ mb: 1 }}>
                                Tool: {block.toolName || 'Select tool'}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {block.type === 'text' && (
                            <IconButton size='small' onClick={() => {
                              const newIndex = index + 1
                              handleAddImage(newIndex)
                            }}>
                              <i className='ri-image-add-line' />
                            </IconButton>
                          )}
                          {block.type === 'text' && (
                            <IconButton size='small' onClick={() => {
                              const newIndex = index + 1
                              handleAddVideo(newIndex)
                            }}>
                              <i className='ri-video-add-line' />
                            </IconButton>
                          )}
                          <IconButton size='small' color='error' onClick={() => handleDeleteBlock(index)}>
                            <i className='ri-delete-bin-line' />
                          </IconButton>
                        </Box>
                      </Box>
                    </Paper>
                  ))}
      </Box>

      {/* Image Dialog */}
      <Dialog open={imageDialogOpen} onClose={() => setImageDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Add Image</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label='Image URL'
            value={tempImage.url}
            onChange={(e) => setTempImage({ ...tempImage, url: e.target.value })}
            sx={{ mt: 2 }}
            placeholder='Or upload a file below'
          />
          <Button
            variant='outlined'
            component='label'
            fullWidth
            sx={{ mt: 2 }}
            startIcon={<i className='ri-upload-2-line' />}
          >
            Upload Image
            <input
              type='file'
              accept='image/*'
              hidden
              onChange={(e) => setTempImage({ ...tempImage, file: e.target.files[0] })}
            />
          </Button>
          {tempImage.file && (
            <Box sx={{ mt: 2 }}>
              <Typography variant='body2'>Selected: {tempImage.file.name}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImageDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveImage} variant='contained' disabled={!tempImage.url && !tempImage.file}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Video Dialog */}
      <Dialog open={videoDialogOpen} onClose={() => setVideoDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Add Video</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Video Type</InputLabel>
            <Select
              value={tempVideo.type}
              onChange={(e) => setTempVideo({ ...tempVideo, type: e.target.value })}
              label='Video Type'
            >
              <MenuItem value='embed'>Embed URL (YouTube, Vimeo, etc.)</MenuItem>
              <MenuItem value='local'>Local File</MenuItem>
            </Select>
          </FormControl>
          {tempVideo.type === 'embed' ? (
            <TextField
              fullWidth
              label='Video URL'
              value={tempVideo.url}
              onChange={(e) => setTempVideo({ ...tempVideo, url: e.target.value })}
              sx={{ mt: 2 }}
              placeholder='https://youtube.com/watch?v=...'
            />
          ) : (
            <>
              <Button
                variant='outlined'
                component='label'
                fullWidth
                sx={{ mt: 2 }}
                startIcon={<i className='ri-upload-2-line' />}
              >
                Upload Video
                <input
                  type='file'
                  accept='video/*'
                  hidden
                  onChange={(e) => setTempVideo({ ...tempVideo, file: e.target.files[0] })}
                />
              </Button>
              {tempVideo.file && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant='body2'>Selected: {tempVideo.file.name}</Typography>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVideoDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveVideo} variant='contained' disabled={!tempVideo.url && !tempVideo.file}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tool Dialog */}
      <Dialog open={toolDialogOpen} onClose={() => setToolDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Add Tool</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Select Tool</InputLabel>
            <Select
              value={tempTool.toolId}
              onChange={(e) => setTempTool({ toolId: e.target.value })}
              label='Select Tool'
            >
              {tools.map((tool) => (
                <MenuItem key={tool.id} value={tool.id?.toString() || ''}>
                  {tool.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToolDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveTool} variant='contained' disabled={!tempTool.toolId}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ContentEditor

