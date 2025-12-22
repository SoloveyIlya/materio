'use client'

// React Imports
import { useMemo, useState, useEffect } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid'
import Tab from '@mui/material/Tab'
import TabPanel from '@mui/lab/TabPanel'
import TabContext from '@mui/lab/TabContext'
import Accordion from '@mui/material/Accordion'
import Typography from '@mui/material/Typography'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'

// Third-party Imports
import classnames from 'classnames'

// Component Imports
import CustomAvatar from '@/@core/components/mui/Avatar'
import CustomTabList from '@/@core/components/mui/TabList'

const Documentations = ({ categories, pages, onEditPage, onEditCategory, onDeleteCategory }) => {
  // States
  const [activeTab, setActiveTab] = useState('')
  const [categoryMenuAnchor, setCategoryMenuAnchor] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)

  // Hooks
  useEffect(() => {
    if (categories.length > 0 && !activeTab) {
      setActiveTab(categories[0].id?.toString() || '')
    }
  }, [categories, activeTab])

  const groupedPages = useMemo(() => {
    return categories.map(category => ({
      ...category,
      pages: pages.filter(page => page.category_id === category.id)
    }))
  }, [categories, pages])

  const activeCategoryPages = useMemo(() => {
    const category = groupedPages.find(cat => cat.id?.toString() === activeTab)
    return category?.pages || []
  }, [groupedPages, activeTab])

  const handleChange = (event, newValue) => {
    setActiveTab(newValue)
  }

  const handleCategoryMenuOpen = (event, category) => {
    event.stopPropagation()
    setCategoryMenuAnchor(event.currentTarget)
    setSelectedCategory(category)
  }

  const handleCategoryMenuClose = () => {
    setCategoryMenuAnchor(null)
    setSelectedCategory(null)
  }

  const handleEditCategory = () => {
    if (selectedCategory && onEditCategory) {
      onEditCategory(selectedCategory)
    }
    handleCategoryMenuClose()
  }

  const handleDeleteCategory = () => {
    if (selectedCategory && onDeleteCategory) {
      if (confirm(`Are you sure you want to delete category "${selectedCategory.name}"? This action cannot be undone.`)) {
        onDeleteCategory(selectedCategory)
      }
    }
    handleCategoryMenuClose()
  }

  if (!groupedPages || groupedPages.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant='h6' color='text.secondary'>
          No categories found. Please create a category first.
        </Typography>
      </Box>
    )
  }

  return (
    <TabContext value={activeTab}>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 5, md: 4, xl: 3 }} className='flex !flex-col items-center'>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
            {groupedPages?.map((category) => (
              <Box 
                key={category.id} 
                sx={{ 
                  position: 'relative', 
                  width: '100%'
                }}
              >
                <Button
                  fullWidth
                  variant={activeTab === category.id?.toString() ? 'contained' : 'outlined'}
                  startIcon={<i className='ri-file-text-line' />}
                  onClick={() => handleChange(null, category.id?.toString() || '')}
                  sx={{
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    minHeight: '48px'
                  }}
                >
                  {category.name}
                </Button>
                <IconButton
                  size='small'
                  onClick={(e) => handleCategoryMenuOpen(e, category)}
                  sx={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 1
                  }}
                >
                  <i className='ri-more-2-line' />
                </IconButton>
              </Box>
            ))}
          </Box>
          <Menu
            anchorEl={categoryMenuAnchor}
            open={Boolean(categoryMenuAnchor)}
            onClose={handleCategoryMenuClose}
          >
            <MenuItem onClick={handleEditCategory}>
              <i className='ri-edit-box-line mie-2' />
              Edit Category
            </MenuItem>
            <MenuItem onClick={handleDeleteCategory} sx={{ color: 'error.main' }}>
              <i className='ri-delete-bin-7-line mie-2' />
              Delete Category
            </MenuItem>
          </Menu>
          <img
            src='/images/illustrations/characters-with-objects/2.png'
            className='max-md:hidden is-72'
            alt='documentation illustration'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 7, md: 8, xl: 9 }}>
          {groupedPages?.map((category) => (
            <TabPanel key={category.id} value={category.id?.toString() || ''} className='p-0'>
              <div className='flex items-center gap-4 mbe-4'>
                <CustomAvatar skin='light' color='primary' variant='rounded' size={50}>
                  <i className={classnames('ri-file-text-line', 'text-3xl')} />
                </CustomAvatar>
                <div>
                  <Typography variant='h5'>{category.name}</Typography>
                  <Typography>{category.description || 'Documentation category'}</Typography>
                </div>
              </div>
              <div>
                {activeCategoryPages.length > 0 ? (
                  activeCategoryPages.map((page, index) => (
                    <Accordion key={page.id || index}>
                      <AccordionSummary
                        expandIcon={<i className='ri-arrow-down-s-line' />}
                        aria-controls={`panel-${page.id}-content`}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                          <Typography color='text.primary'>{page.title}</Typography>
                          <Chip
                            label={page.is_published ? 'Published' : 'Draft'}
                            color={page.is_published ? 'success' : 'default'}
                            size='small'
                          />
                          <IconButton
                            size='small'
                            onClick={(e) => {
                              e.stopPropagation()
                              onEditPage(page)
                            }}
                            sx={{ ml: 'auto' }}
                          >
                            <i className='ri-edit-box-line' />
                          </IconButton>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box sx={{ width: '100%' }}>
                          {(() => {
                            // Нормализуем content_blocks
                            let contentBlocks = []
                            if (page.content_blocks) {
                              if (Array.isArray(page.content_blocks)) {
                                contentBlocks = page.content_blocks
                              } else if (typeof page.content_blocks === 'string') {
                                try {
                                  const parsed = JSON.parse(page.content_blocks)
                                  contentBlocks = Array.isArray(parsed) ? parsed : []
                                } catch (e) {
                                  console.error('Error parsing content_blocks:', e)
                                  contentBlocks = []
                                }
                              }
                            }
                            
                            return contentBlocks.length > 0 ? (
                              // Рендерим content_blocks
                              <Box>
                                {contentBlocks.map((block, blockIndex) => {
                                if (block.type === 'text') {
                                  const textContent = block.content || ''
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
                                  
                                  if (block.url) {
                                    imageUrl = block.url
                                    // Если URL относительный, добавляем базовый URL
                                    if (typeof imageUrl === 'string' && !imageUrl.startsWith('http')) {
                                      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
                                      imageUrl = imageUrl.startsWith('/') 
                                        ? `${baseUrl}${imageUrl}`
                                        : `${baseUrl}/${imageUrl}`
                                    }
                                  } else if (page.images && Array.isArray(page.images)) {
                                    // Если URL нет в блоке, пытаемся найти по позиции
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
                                        sx={{
                                          maxWidth: '100%',
                                          height: 'auto',
                                          borderRadius: 1,
                                          boxShadow: 2
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
                                          sx={{ width: '100%', height: '300px', borderRadius: 1 }}
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
                            ) : null
                          })()}
                          
                          {(() => {
                            // Нормализуем content_blocks для проверки
                            let contentBlocks = []
                            if (page.content_blocks) {
                              if (Array.isArray(page.content_blocks)) {
                                contentBlocks = page.content_blocks
                              } else if (typeof page.content_blocks === 'string') {
                                try {
                                  const parsed = JSON.parse(page.content_blocks)
                                  contentBlocks = Array.isArray(parsed) ? parsed : []
                                } catch (e) {
                                  contentBlocks = []
                                }
                              }
                            }
                            
                            return contentBlocks.length === 0 ? (
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
                            ) : null
                          })()}
                          
                          {/* Дополнительно показываем отдельные изображения, если они есть, но не в content_blocks */}
                          {(() => {
                            let contentBlocks = []
                            if (page.content_blocks) {
                              if (Array.isArray(page.content_blocks)) {
                                contentBlocks = page.content_blocks
                              } else if (typeof page.content_blocks === 'string') {
                                try {
                                  const parsed = JSON.parse(page.content_blocks)
                                  contentBlocks = Array.isArray(parsed) ? parsed : []
                                } catch (e) {
                                  contentBlocks = []
                                }
                              }
                            }
                            return page.images && Array.isArray(page.images) && page.images.length > 0 && contentBlocks.length === 0 && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="subtitle2" sx={{ mb: 1 }}>Images</Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                {page.images.map((image, index) => {
                                  let imageUrl = typeof image === 'string' ? image : image.url || image
                                  if (typeof imageUrl === 'string' && !imageUrl.startsWith('http')) {
                                    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
                                    imageUrl = imageUrl.startsWith('/') 
                                      ? `${baseUrl}${imageUrl}`
                                      : `${baseUrl}/${imageUrl}`
                                  }
                                  return (
                                    <Box
                                      key={index}
                                      component="img"
                                      src={imageUrl}
                                      alt={`${page.title} - Image ${index + 1}`}
                                      sx={{
                                        maxWidth: '300px',
                                        height: 'auto',
                                        borderRadius: 1,
                                        boxShadow: 2
                                      }}
                                    />
                                  )
                                })}
                              </Box>
                            </Box>
                            )
                          })()}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  ))
                ) : (
                  <Typography color='text.secondary'>No pages in this category yet</Typography>
                )}
              </div>
            </TabPanel>
          ))}
        </Grid>
      </Grid>
    </TabContext>
  )
}

export default Documentations

