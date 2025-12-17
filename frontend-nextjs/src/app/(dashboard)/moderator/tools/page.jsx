'use client'

import { useState, useEffect } from 'react'
import { Box, Typography, Paper, Card, CardContent, CardActions, Button, Chip, Grid } from '@mui/material'
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
      setTools(response.data)
    } catch (error) {
      console.error('Error loading tools:', error)
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Tools</Typography>

      <Grid container spacing={3}>
        {tools.map((tool) => (
          <Grid item xs={12} md={6} lg={4} key={tool.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>{tool.name}</Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {tool.description || 'No description'}
                </Typography>
                {tool.guide && (
                  <Chip
                    icon={<i className="ri-file-text-line" />}
                    label={`Guide: ${tool.guide.title}`}
                    onClick={() => router.push(`/moderator/documentation`)}
                    sx={{ mb: 1 }}
                  />
                )}
              </CardContent>
              <CardActions>
                {tool.url && (
                  <Button
                    startIcon={<i className="ri-links-line" />}
                    href={tool.url}
                    target="_blank"
                    variant="contained"
                    size="small"
                  >
                    Open
                  </Button>
                )}
                {tool.guide && (
                  <Button
                    size="small"
                    onClick={() => router.push(`/moderator/documentation`)}
                  >
                    Open Guide
                  </Button>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {tools.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No tools available</Typography>
        </Paper>
      )}
    </Box>
  )
}
