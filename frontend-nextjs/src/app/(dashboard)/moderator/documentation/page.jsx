'use client'

import { useState, useEffect } from 'react'
import { Box, Typography, Paper, List, ListItem, ListItemText, Accordion, AccordionSummary, AccordionDetails, Chip, Button } from '@mui/material'
import api, { API_URL } from '@/lib/api'
import ImageViewer from '@/components/ImageViewer'

export default function ModeratorDocumentationPage() {
  const [categories, setCategories] = useState([])
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [viewingImages, setViewingImages] = useState([])

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const response = await api.get('/moderator/documentation/categories')
      console.log('Categories loaded:', response.data)
      setCategories(response.data)
      
      // Log each category with its pages
      response.data.forEach(cat => {
        console.log(`Category: ${cat.name}, Pages count: ${cat.pages?.length || 0}`)
        if (cat.pages && cat.pages.length > 0) {
          console.log('Pages:', cat.pages.map(p => ({ id: p.id, title: p.title, published: p.is_published })))
        }
      })
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const handleImageClick = (images, index) => {
    setViewingImages(images)
    setSelectedImageIndex(index)
    setImageViewerOpen(true)
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Documentation</Typography>

      {categories.map((category) => (
        <Accordion key={category.id} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<i className="ri-arrow-down-s-line" />}>
            <Typography variant="h6">{category.name}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {category.pages && category.pages.length > 0 ? (
              <List>
                {category.pages.map((page) => (
                  <Paper key={page.id} sx={{ p: 2, mb: 2 }}>
                    <Typography variant="h6" gutterBottom>{page.title}</Typography>
                    <Box
                      dangerouslySetInnerHTML={{ __html: page.content }}
                      sx={{ mb: 2 }}
                    />

                    {page.images && page.images.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          <i className="ri-image-line" style={{ verticalAlign: 'middle', marginRight: 8 }} />
                          Images ({page.images.length})
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {page.images.map((image, index) => {
                            // Build full URL if path is relative
                            const imageUrl = image.startsWith('http') 
                              ? image 
                              : `${API_URL}${image}`
                            
                            return (
                            <Box
                              key={index}
                              component="img"
                              src={imageUrl}
                              alt={`Image ${index + 1}`}
                              onClick={() => {
                                const fullUrls = page.images.map(img => 
                                  img.startsWith('http') ? img : `${API_URL}${img}`
                                )
                                handleImageClick(fullUrls, index)
                              }}
                              sx={{
                                width: 150,
                                height: 150,
                                objectFit: 'cover',
                                cursor: 'pointer',
                                border: '1px solid #ddd',
                                borderRadius: 1,
                                '&:hover': {
                                  opacity: 0.8,
                                },
                              }}
                            />
                            )
                          })}
                        </Box>
                      </Box>
                    )}

                    {page.videos && page.videos.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          <i className="ri-video-line" style={{ verticalAlign: 'middle', marginRight: 8 }} />
                          Videos ({page.videos.length})
                        </Typography>
                        {page.videos.map((video, index) => (
                          <Box key={index} sx={{ mb: 2 }}>
                            {video.type === 'embed' ? (
                              <Box
                                sx={{
                                  position: 'relative',
                                  paddingBottom: '56.25%',
                                  height: 0,
                                  overflow: 'hidden',
                                }}
                              >
                                <iframe
                                  src={video.url}
                                  frameBorder="0"
                                  allowFullScreen
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                  }}
                                />
                              </Box>
                            ) : (
                              <video
                                controls
                                src={video.url}
                                style={{ width: '100%', maxWidth: 800 }}
                              />
                            )}
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Paper>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary">No pages in this category</Typography>
            )}
          </AccordionDetails>
        </Accordion>
      ))}

      <ImageViewer
        images={viewingImages}
        open={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
        initialIndex={selectedImageIndex}
      />
    </Box>
  )
}
