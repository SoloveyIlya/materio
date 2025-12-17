'use client'

import { useState } from 'react'
import { Dialog, IconButton, Box, Button } from '@mui/material'
import { API_URL } from '@/lib/api'

export default function ImageViewer({ images, open, onClose, initialIndex = 0 }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  if (!images || images.length === 0) return null

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
  }

  const currentImage = images[currentIndex]
  let imageUrl = typeof currentImage === 'string' ? currentImage : currentImage.url || currentImage
  
  // Build full URL if path is relative
  if (typeof imageUrl === 'string' && !imageUrl.startsWith('http')) {
    imageUrl = `${API_URL}${imageUrl}`
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(0, 0, 0, 0.9)',
          boxShadow: 'none',
        },
      }}
    >
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: 'white',
            zIndex: 1,
          }}
        >
          <i className="ri-close-line" />
        </IconButton>

        {images.length > 1 && (
          <>
            <IconButton
              onClick={handlePrevious}
              sx={{
                position: 'absolute',
                left: 8,
                color: 'white',
                zIndex: 1,
                fontSize: '2rem',
              }}
            >
              <i className="ri-arrow-left-s-line" style={{ fontSize: '2rem' }} />
            </IconButton>
            <IconButton
              onClick={handleNext}
              sx={{
                position: 'absolute',
                right: 8,
                color: 'white',
                zIndex: 1,
                fontSize: '2rem',
              }}
            >
              <i className="ri-arrow-right-s-line" style={{ fontSize: '2rem' }} />
            </IconButton>
          </>
        )}

        <Box
          component="img"
          src={imageUrl}
          alt={`Image ${currentIndex + 1}`}
          sx={{
            maxWidth: '100%',
            maxHeight: '80vh',
            objectFit: 'contain',
          }}
        />

        {images.length > 1 && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              color: 'white',
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              px: 2,
              py: 1,
              borderRadius: 1,
            }}
          >
            {currentIndex + 1} / {images.length}
          </Box>
        )}
      </Box>
    </Dialog>
  )
}
