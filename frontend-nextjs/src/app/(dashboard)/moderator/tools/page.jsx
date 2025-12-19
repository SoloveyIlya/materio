'use client'

import { useState, useEffect } from 'react'
import { Box, Typography, Card, CardContent, CardActions, Button, Chip, Grid } from '@mui/material'
import api from '@/lib/api'
import { useRouter } from 'next/navigation'

export default function ModeratorToolsPage() {
  const router = useRouter()
  const [tools, setTools] = useState([])

  useEffect(() => {
    loadTools()
  }, [])

  const loadTools = async () => {
    try {
      const response = await api.get('/moderator/tools')
      setTools(response.data || [])
    } catch (error) {
      console.error('Error loading tools:', error)
      setTools([])
    }
  }

  return (
    <Box sx={{ p: 6 }}>
      <Typography variant='h4' gutterBottom>Tools & Utilities</Typography>

      {tools.length > 0 ? (
        <Grid container spacing={6}>
          {tools.map((tool) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={tool.id}>
              <Card className='bs-full'>
                <CardContent className='flex flex-col gap-4'>
                  <div className='flex items-center justify-between'>
                    <Chip
                      label={tool.is_active ? 'Active' : 'Inactive'}
                      color={tool.is_active ? 'success' : 'default'}
                      size='small'
                      variant='tonal'
                    />
                  </div>
                  <div className='flex flex-col gap-1'>
                    <Typography variant='h5'>{tool.name}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {tool.description || 'No description available'}
                    </Typography>
                  </div>
                  {tool.guide && (
                    <Chip
                      icon={<i className='ri-file-text-line' />}
                      label={`Guide: ${tool.guide.title}`}
                      onClick={() => router.push(`/moderator/documentation`)}
                      variant='outlined'
                      size='small'
                      className='self-start'
                    />
                  )}
                </CardContent>
                <CardActions className='flex gap-2'>
                  {tool.url && (
                    <Button
                      startIcon={<i className='ri-links-line' />}
                      href={tool.url}
                      target='_blank'
                      variant='contained'
                      size='small'
                      fullWidth
                    >
                      Open Tool
                    </Button>
                  )}
                  {tool.guide && (
                    <Button
                      size='small'
                      variant='outlined'
                      onClick={() => router.push(`/moderator/documentation`)}
                      fullWidth={!tool.url}
                    >
                      View Guide
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Card>
          <CardContent className='text-center p-10'>
            <Typography color='text.secondary'>No tools available</Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
