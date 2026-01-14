'use client'

// React Imports
import { useMemo, useState, useEffect } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid'
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

const Documentations = ({ categories, pages, onEditPage, onEditCategory, onDeleteCategory, readOnly = false }) => {
  // States
  const [activeTab, setActiveTab] = useState('')
  const [categoryMenuAnchor, setCategoryMenuAnchor] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)

  // Hooks
  useEffect(() => {
    if (categories.length > 0) {
      if (!activeTab) {
        setActiveTab(categories[0].id?.toString() || '')
      } else {
        // Проверяем, что активная категория еще существует
        const categoryExists = categories.some(cat => cat.id?.toString() === activeTab)
        if (!categoryExists && categories[0]) {
          setActiveTab(categories[0].id?.toString() || '')
        }
      }
    }
  }, [categories])

  const groupedPages = useMemo(() => {
    return categories.map(category => ({
      ...category,
      pages: pages.filter(page => page.category_id === category.id)
    }))
  }, [categories, pages])

  const handleCategoryClick = (categoryId) => {
    setActiveTab(categoryId?.toString() || '')
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

  const activeCategory = useMemo(() => {
    if (!groupedPages || groupedPages.length === 0) return null
    if (!activeTab) return groupedPages[0] || null
    return groupedPages.find(cat => cat.id?.toString() === activeTab) || groupedPages[0]
  }, [groupedPages, activeTab])

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
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, sm: 5, md: 4, xl: 3 }} className='flex !flex-col items-center'>
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
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
                variant={activeTab === (category.id?.toString() || '') ? 'contained' : 'outlined'}
                onClick={() => handleCategoryClick(category.id)}
                startIcon={<i className='ri-file-text-line' />}
                sx={{
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  py: 1.5,
                  px: 2,
                  fontWeight: activeTab === (category.id?.toString() || '') ? 600 : 400
                }}
              >
                {category.name}
              </Button>
              {!readOnly && (
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
              )}
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
          {activeCategory && (
            <Box>
              <div className='flex items-center gap-4 mbe-4'>
                <CustomAvatar skin='light' color='primary' variant='rounded' size={50}>
                  <i className={classnames('ri-file-text-line', 'text-3xl')} />
                </CustomAvatar>
                <div>
                  <Typography variant='h5'>{activeCategory.name}</Typography>
                  <Typography>{activeCategory.description || 'Documentation category'}</Typography>
                </div>
              </div>
              <div>
                {activeCategory.pages && activeCategory.pages.length > 0 ? (
                  activeCategory.pages.map((page, index) => (
                    <Accordion key={page.id || index}>
                      <AccordionSummary
                        expandIcon={<i className='ri-arrow-down-s-line' />}
                        aria-controls={`panel-${page.id}-content`}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                          <Typography color='text.primary'>{page.title}</Typography>
                          {!readOnly && (
                            <Chip
                              label={page.is_published ? 'Published' : 'Draft'}
                              color={page.is_published ? 'success' : 'default'}
                              size='small'
                            />
                          )}
                          {!readOnly && onEditPage && (
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
                          )}
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box sx={{ width: '100%' }}>
                          {/* Отображаем информацию о tool из поля tools */}
                          {page.tools_data && Array.isArray(page.tools_data) && page.tools_data.length > 0 && (
                            <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1, border: '1px solid', borderColor: 'primary.main' }}>
                              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                Related Tool{page.tools_data.length > 1 ? 's' : ''}:
                              </Typography>
                              {page.tools_data.map((tool, toolIndex) => (
                                <Box key={tool.id || toolIndex} sx={{ mb: toolIndex < page.tools_data.length - 1 ? 1 : 0 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {tool.name}
                                  </Typography>
                                  {tool.description && (
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                      {tool.description}
                                    </Typography>
                                  )}
                                  {tool.url && (
                                    <Typography 
                                      component="a" 
                                      href={tool.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      variant="body2" 
                                      color="primary"
                                      sx={{ mt: 0.5, display: 'block', textDecoration: 'none' }}
                                    >
                                      Open Tool →
                                    </Typography>
                                  )}
                                </Box>
                              ))}
                            </Box>
                          )}
                          
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
                                  // Находим инструмент в tools_data по toolId
                                  const tool = page.tools_data?.find(t => t.id?.toString() === block.toolId?.toString())
                                  const toolName = tool?.name || block.toolName || 'Unknown tool'
                                  const toolUrl = tool?.url

                                  return (
                                    <Box key={blockIndex} sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                                      {toolUrl ? (
                                        <Typography 
                                          component="a"
                                          href={toolUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          variant="subtitle2"
                                          sx={{
                                            color: 'primary.main',
                                            textDecoration: 'none',
                                            cursor: 'pointer',
                                            '&:hover': {
                                              textDecoration: 'underline'
                                            }
                                          }}
                                        >
                                          Tool: {toolName} →
                                        </Typography>
                                      ) : (
                                        <Typography variant="subtitle2">Tool: {toolName}</Typography>
                                      )}
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
            </Box>
          )}
        </Grid>
      </Grid>
  )
}

export default Documentations

