'use client'

// React Imports
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// MUI Imports
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Link from '@mui/material/Link'

// Component Imports
import api from '@/lib/api'
import ImageViewer from '@/components/ImageViewer'

const DocumentationPageView = () => {
  const params = useParams()
  const router = useRouter()
  const pageId = params?.id

  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  useEffect(() => {
    if (pageId) {
      loadPage()
    }
  }, [pageId])

  const loadPage = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get(`/moderator/documentation/pages/${pageId}`)
      setPage(response.data)
    } catch (error) {
      console.error('Error loading page:', error)
      setError(error.response?.data?.message || 'Error loading page')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">{error}</Typography>
        <Button onClick={() => router.push('/moderator/documentation')} sx={{ mt: 2 }}>
          Back to Documentation
        </Button>
      </Box>
    )
  }

  if (!page) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6">Page not found</Typography>
        <Button onClick={() => router.push('/moderator/documentation')} sx={{ mt: 2 }}>
          Back to Documentation
        </Button>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, maxWidth: '1200px', mx: 'auto' }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link
          component="button"
          variant="body1"
          onClick={() => router.push('/moderator/documentation')}
          sx={{ cursor: 'pointer' }}
        >
          Documentation
        </Link>
        {page.category && (
          <Typography color="text.primary">{page.category.name}</Typography>
        )}
        <Typography color="text.primary">{page.title}</Typography>
      </Breadcrumbs>

      {/* Page Content */}
      <Card>
        <CardContent>
          <Typography variant="h4" gutterBottom>
            {page.title}
          </Typography>
          
          {page.category && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Category: {page.category.name}
            </Typography>
          )}

          {/* Content - рендерим content_blocks если они есть, иначе старый content */}
          <Box sx={{ mt: 3 }}>
            {page.content_blocks && Array.isArray(page.content_blocks) && page.content_blocks.length > 0 ? (
              // Рендерим content_blocks
              <Box>
                {page.content_blocks.map((block, blockIndex) => {
                  if (block.type === 'text') {
                    const textContent = block.content || ''
                    // Проверяем, содержит ли текст HTML теги
                    const hasHTML = /<[a-z][\s\S]*>/i.test(textContent)
                    
                    return (
                      <Box
                        key={blockIndex}
                        sx={{
                          mb: 2,
                          '& p': { mb: 1 },
                          '& p:last-child': { mb: 0 },
                          '& img': { maxWidth: '100%', height: 'auto', borderRadius: 1 }
                        }}
                      >
                        {hasHTML ? (
                          <Box
                            dangerouslySetInnerHTML={{ __html: textContent }}
                          />
                        ) : (
                          <Typography
                            variant="body1"
                            sx={{
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word'
                            }}
                          >
                            {textContent}
                          </Typography>
                        )}
                      </Box>
                    )
                  } else if (block.type === 'image') {
                    // Получаем URL изображения
                    let imageUrl = null
                    let imageIndex = -1
                    
                    // Сначала пытаемся найти URL в самом блоке
                    if (block.url) {
                      imageUrl = block.url
                      // Если URL относительный, добавляем базовый URL
                      if (typeof imageUrl === 'string' && !imageUrl.startsWith('http')) {
                        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
                        imageUrl = imageUrl.startsWith('/') 
                          ? `${baseUrl}${imageUrl}`
                          : `${baseUrl}/${imageUrl}`
                      }
                      
                      // Находим индекс этого изображения в массиве page.images для просмотра
                      if (page.images && Array.isArray(page.images)) {
                        imageIndex = page.images.findIndex(img => {
                          const imgUrl = typeof img === 'string' ? img : img.url || img
                          const fullImgUrl = typeof imgUrl === 'string' && !imgUrl.startsWith('http')
                            ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${imgUrl.startsWith('/') ? imgUrl : '/' + imgUrl}`
                            : imgUrl
                          return fullImgUrl === imageUrl || imgUrl === block.url
                        })
                        if (imageIndex < 0) imageIndex = 0
                      }
                    } else if (page.images && Array.isArray(page.images)) {
                      // Если URL нет в блоке, пытаемся найти по позиции или индексу
                      const targetIndex = block.position !== undefined ? block.position : blockIndex
                      if (page.images[targetIndex]) {
                        imageUrl = typeof page.images[targetIndex] === 'string' 
                          ? page.images[targetIndex] 
                          : page.images[targetIndex].url || page.images[targetIndex]
                        if (typeof imageUrl === 'string' && !imageUrl.startsWith('http')) {
                          const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
                          imageUrl = imageUrl.startsWith('/') 
                            ? `${baseUrl}${imageUrl}`
                            : `${baseUrl}/${imageUrl}`
                        }
                        imageIndex = targetIndex
                      }
                    }
                    
                    if (!imageUrl) return null
                    
                    return (
                      <Box
                        key={blockIndex}
                        sx={{ mb: 2, textAlign: 'center' }}
                      >
                        <Box
                          component="img"
                          src={imageUrl}
                          alt={`${page.title} - Image ${blockIndex + 1}`}
                          onClick={() => {
                            if (imageIndex >= 0 && page.images) {
                              // Находим реальный индекс в массиве images
                              const realIndex = page.images.findIndex(img => {
                                const imgUrl = typeof img === 'string' ? img : img.url || img
                                return imgUrl === imageUrl || imgUrl.includes(imageUrl.split('/').pop())
                              })
                              setSelectedImageIndex(realIndex >= 0 ? realIndex : 0)
                            } else {
                              setSelectedImageIndex(0)
                            }
                            setImageViewerOpen(true)
                          }}
                          sx={{
                            maxWidth: '100%',
                            height: 'auto',
                            borderRadius: 1,
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                            '&:hover': {
                              transform: 'scale(1.02)',
                              boxShadow: 3
                            }
                          }}
                        />
                      </Box>
                    )
                  } else if (block.type === 'video') {
                    let videoUrl = null
                    
                    if (block.url) {
                      videoUrl = block.url
                    } else if (page.videos && Array.isArray(page.videos)) {
                      const targetIndex = block.position !== undefined ? block.position : blockIndex
                      if (page.videos[targetIndex]) {
                        const video = page.videos[targetIndex]
                        videoUrl = typeof video === 'string' ? video : video.url || video
                      }
                    }
                    
                    if (!videoUrl) return null
                    
                    return (
                      <Box key={blockIndex} sx={{ mb: 2 }}>
                        {block.videoType === 'embed' || typeof videoUrl === 'string' ? (
                          <Box
                            component="iframe"
                            src={videoUrl}
                            sx={{ width: '100%', height: '400px', borderRadius: 1 }}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <Box
                            component="video"
                            src={videoUrl}
                            controls
                            sx={{ width: '100%', borderRadius: 1 }}
                          />
                        )}
                      </Box>
                    )
                  } else if (block.type === 'tool') {
                    return (
                      <Box key={blockIndex} sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                        <Typography variant="subtitle2">Tool: {block.toolName || 'Unknown tool'}</Typography>
                      </Box>
                    )
                  }
                  return null
                })}
              </Box>
            ) : (
              // Старый способ отображения через content
              <Box
                sx={{
                  '& img': { maxWidth: '100%', height: 'auto' },
                  '& pre': { 
                    bgcolor: 'background.paper',
                    p: 2,
                    borderRadius: 1,
                    overflow: 'auto'
                  },
                  '& code': {
                    bgcolor: 'background.paper',
                    px: 0.5,
                    borderRadius: 0.5
                  }
                }}
                dangerouslySetInnerHTML={{ __html: page.content || '' }}
              />
            )}
          </Box>

          {/* Image Viewer для всех изображений */}
          {page.images && page.images.length > 0 && (
            <ImageViewer
              images={page.images.map(img => {
                const imgUrl = typeof img === 'string' ? img : img.url || img
                return typeof imgUrl === 'string' && !imgUrl.startsWith('http')
                  ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${imgUrl}`
                  : imgUrl
              })}
              open={imageViewerOpen}
              onClose={() => setImageViewerOpen(false)}
              initialIndex={selectedImageIndex}
            />
          )}

          {/* Back button */}
          <Button
            onClick={() => router.push('/moderator/documentation')}
            variant="outlined"
            sx={{ mt: 4 }}
          >
            Back to Documentation
          </Button>
        </CardContent>
      </Card>
    </Box>
  )
}

export default DocumentationPageView
