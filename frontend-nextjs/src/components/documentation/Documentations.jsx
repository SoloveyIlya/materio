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

// Third-party Imports
import classnames from 'classnames'

// Component Imports
import CustomAvatar from '@/@core/components/mui/Avatar'
import CustomTabList from '@/@core/components/mui/TabList'

const Documentations = ({ categories, pages, onEditPage }) => {
  // States
  const [activeTab, setActiveTab] = useState('')

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
          <CustomTabList orientation='vertical' onChange={handleChange} className='!is-full' pill='true'>
            {groupedPages?.map((category) => (
              <Tab
                key={category.id}
                label={category.name}
                value={category.id?.toString() || ''}
                icon={<i className={classnames('ri-file-text-line', 'mbe-0! mie-1.5')} />}
                className='!flex-row !justify-start whitespace-nowrap min-is-full!'
              />
            ))}
          </CustomTabList>
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
                        <Typography color='text.primary'>{page.content}</Typography>
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

