// React Imports
import { useState, useEffect } from 'react'

// Next Imports
import Link from 'next/link'

// MUI Imports
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'

// Third-party Imports
import classnames from 'classnames'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'
import api from '@/lib/api'

const Articles = () => {
  const [popularPages, setPopularPages] = useState([])

  useEffect(() => {
    loadPopularPages()
  }, [])

  const loadPopularPages = async () => {
    try {
      const response = await api.get('/moderator/documentation/pages?popular=true')
      const pages = response.data || []
      setPopularPages(pages.slice(0, 3)) // Top 3 popular
    } catch (error) {
      console.error('Error loading popular pages:', error)
      setPopularPages([])
    }
  }

  const getIconForPage = (title, index) => {
    const icons = ['ri-rocket-line', 'ri-gift-line', 'ri-file-text-line']
    return icons[index] || 'ri-file-text-line'
  }

  const getColorForPage = (index) => {
    const colors = ['primary', 'success', 'info']
    return colors[index] || 'primary'
  }

  if (popularPages.length === 0) {
    return null
  }

  return (
    <section className='md:plb-[100px] plb-[50px] bg-backgroundPaper'>
      <div className='max-is-[1200px] m-auto pli-5'>
        <Typography variant='h4' className='text-center mbe-6'>
          Popular Articles
        </Typography>
        <Grid container spacing={6}>
          {popularPages.map((page, index) => {
            return (
              <Grid size={{ xs: 12, lg: 4 }} key={page.id || index}>
                <Card variant='outlined'>
                  <CardContent className='flex flex-col items-center justify-center gap-3 text-center'>
                    <CustomAvatar
                      skin='light'
                      variant='rounded'
                      color={getColorForPage(index)}
                      size={64}
                    >
                      <i className={classnames('text-[32px]', getIconForPage(page.title, index))} />
                    </CustomAvatar>
                    <Typography variant='h5'>{page.title}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {page.excerpt || page.content?.substring(0, 100) + '...' || 'Read this article to learn more'}
                    </Typography>
                    <Button
                      component={Link}
                      href={`/moderator/documentation/page/${page.id}`}
                      variant='outlined'
                    >
                      Read More
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      </div>
    </section>
  )
}

export default Articles
