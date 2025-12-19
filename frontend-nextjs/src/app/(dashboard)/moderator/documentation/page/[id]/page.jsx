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

          {/* Content - может быть HTML или Markdown */}
          <Box
            sx={{
              mt: 3,
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
            dangerouslySetInnerHTML={{ __html: page.content }}
          />

          {/* Images if any */}
          {page.images && page.images.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>Images</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {page.images.map((image, index) => {
                  // Build full URL if path is relative
                  let imageUrl = typeof image === 'string' ? image : image.url || image
                  if (typeof imageUrl === 'string' && !imageUrl.startsWith('http')) {
                    imageUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${imageUrl}`
                  }
                  
                  return (
                    <Box
                      key={index}
                      component="img"
                      src={imageUrl}
                      alt={`${page.title} - Image ${index + 1}`}
                      onClick={() => {
                        setSelectedImageIndex(index)
                        setImageViewerOpen(true)
                      }}
                      sx={{ 
                        maxWidth: '300px', 
                        height: 'auto', 
                        borderRadius: 1,
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'scale(1.05)',
                          boxShadow: 3
                        }
                      }}
                    />
                  )
                })}
              </Box>
            </Box>
          )}

          {/* Image Viewer */}
          {page.images && page.images.length > 0 && (
            <ImageViewer
              images={page.images}
              open={imageViewerOpen}
              onClose={() => setImageViewerOpen(false)}
              initialIndex={selectedImageIndex}
            />
          )}

          {/* Videos if any */}
          {page.videos && page.videos.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>Videos</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {page.videos.map((video, index) => (
                  <Box
                    key={index}
                    component="iframe"
                    src={video}
                    sx={{ width: '100%', height: '400px', borderRadius: 1 }}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ))}
              </Box>
            </Box>
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
