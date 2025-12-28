'use client'

// React Imports
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'

// Components Imports
import CustomAvatar from '@core/components/mui/Avatar'
import OptionMenu from '@core/components/option-menu'
import api from '@/lib/api'

const TopCourses = () => {
  const [topPages, setTopPages] = useState([])
  const router = useRouter()

  useEffect(() => {
    loadTopPages()
  }, [])

  const loadTopPages = async () => {
    try {
      const response = await api.get('/moderator/documentation/pages?popular=true')
      const pages = response.data || []
      setTopPages(pages.slice(0, 5)) // Берем первые 5
    } catch (error) {
      console.error('Error loading top pages:', error)
      setTopPages([])
    }
  }

  const handlePageClick = (pageId) => {
    router.push(`/moderator/documentation/page/${pageId}`)
  }

  const getIconForPage = (index) => {
    const icons = ['ri-video-download-line', 'ri-code-view', 'ri-image-2-line', 'ri-palette-line', 'ri-music-2-line']
    return icons[index] || 'ri-file-text-line'
  }

  const getColorForPage = (index) => {
    const colors = ['primary', 'info', 'success', 'warning', 'error']
    return colors[index] || 'primary'
  }

  if (topPages.length === 0) {
    return null
  }

  return (
    <Card className='bs-full'>
      <CardHeader
        title='Top courses'
        action={<OptionMenu iconClassName='text-textPrimary' options={['Last 28 Days', 'Last Month', 'Last Year']} />}
      />
      <CardContent className='flex flex-col gap-[1.625rem]'>
        {topPages.map((page, i) => (
          <div 
            key={page.id || i} 
            className='flex items-center gap-4 cursor-pointer hover:bg-actionHover rounded p-2 -m-2 transition-colors'
            onClick={() => handlePageClick(page.id)}
          >
            <CustomAvatar variant='rounded' skin='light' color={getColorForPage(i)}>
              <i className={getIconForPage(i)} />
            </CustomAvatar>
            <div className='flex justify-between items-center gap-4 is-full flex-wrap'>
              <Typography className='font-medium flex-1' color='text.primary'>
                {page.title}
              </Typography>
              <Chip label={`${page.views || 0} Views`} variant='tonal' size='small' />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default TopCourses

