// React Imports
import { useState, useEffect } from 'react'

// Next Imports
import Link from 'next/link'

// MUI Imports
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'

// Third-party Imports
import classnames from 'classnames'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'
import DirectionalIcon from '@/components/DirectionalIcon'
import api from '@/lib/api'

const KnowledgeBase = () => {
  const [categories, setCategories] = useState([])

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const response = await api.get('/moderator/documentation/categories')
      setCategories(response.data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
      setCategories([])
    }
  }

  const getIconForCategory = (name) => {
    const iconMap = {
      'Getting Started': 'ri-rocket-line',
      'Guides': 'ri-book-open-line',
      'FAQ': 'ri-question-line',
      'Tutorials': 'ri-video-line',
      'Tools': 'ri-tools-line',
      'Settings': 'ri-settings-line',
    }
    
    // Try to match by name or use default
    for (const [key, icon] of Object.entries(iconMap)) {
      if (name.toLowerCase().includes(key.toLowerCase())) {
        return icon
      }
    }
    return 'ri-file-text-line' // Default icon
  }

  return (
    <section className={classnames('flex flex-col gap-6 md:plb-[100px] plb-[50px]')}>
      <Typography variant='h4' className='text-center'>
        Knowledge Base
      </Typography>
      <Grid container spacing={6}>
        {categories.map((category, index) => {
          const pages = category.pages || []
          const publishedPages = pages.filter(p => p.is_published)
          
          if (publishedPages.length === 0) return null
          
          return (
            <Grid size={{ xs: 12, lg: 4 }} key={category.id || index}>
              <Card>
                <CardContent className='flex flex-col items-start gap-6 text-center'>
                  <div className='flex gap-3 items-center'>
                    <CustomAvatar skin='light' variant='rounded' color='primary' size={32}>
                      <i className={classnames('text-xl', getIconForCategory(category.name))} />
                    </CustomAvatar>
                    <Typography variant='h5'>{category.name}</Typography>
                  </div>
                  <div className='flex flex-col gap-2 is-full'>
                    {publishedPages.slice(0, 6).map((page, pageIndex) => {
                      return (
                        <div key={page.id || pageIndex} className='flex justify-between items-center gap-2'>
                          <Typography
                            component={Link}
                            href={`/moderator/documentation/page/${page.id}`}
                            color='text.primary'
                            className='hover:text-primary'
                          >
                            {page.title}
                          </Typography>
                          <DirectionalIcon
                            className='text-textDisabled text-xl'
                            ltrIconClass='ri-arrow-right-s-line'
                            rtlIconClass='ri-arrow-left-s-line'
                          />
                        </div>
                      )
                    })}
                  </div>
                  {publishedPages.length > 6 && (
                    <Link
                      href={`/moderator/documentation/category/${category.id}`}
                      className='flex items-center gap-x-2 text-primary'
                    >
                      <span className='font-medium'>See all {publishedPages.length} articles</span>
                      <DirectionalIcon
                        className='text-lg'
                        ltrIconClass='ri-arrow-right-line'
                        rtlIconClass='ri-arrow-left-line'
                      />
                    </Link>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )
        })}
      </Grid>
    </section>
  )
}

export default KnowledgeBase
