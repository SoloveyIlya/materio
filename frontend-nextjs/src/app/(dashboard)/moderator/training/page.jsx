'use client'

import { useState, useEffect } from 'react'
import { Box, Typography, Paper, List, ListItem, ListItemText, Card, CardContent, Chip, Button, Alert } from '@mui/material'
import api from '@/lib/api'

export default function TrainingCenterPage() {
  const [trainingData, setTrainingData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTraining()
  }, [])

  const loadTraining = async () => {
    try {
      const response = await api.get('/moderator/training')
      setTrainingData(response.data)
    } catch (error) {
      console.error('Error loading training:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Box sx={{ p: 3 }}>Loading...</Box>
  }

  if (!trainingData) {
    return <Box sx={{ p: 3 }}>Error loading training center</Box>
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Training Center</Typography>

      {trainingData.recommendations && trainingData.recommendations.length > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>Recommendations before tests:</Typography>
          <List>
            {trainingData.recommendations.map((rec, index) => (
              <ListItem key={index}>
                <ListItemText primary={`• ${rec}`} />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}

      <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>Test Tasks</Typography>

      {trainingData.tasks && trainingData.tasks.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {trainingData.tasks.map((task) => (
            <Card key={task.id}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6">{task.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {task.description}
                    </Typography>
                  </Box>
                  <Chip
                    label={task.status}
                    color={task.status === 'approved' ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Typography variant="body2"><strong>Category:</strong> {task.category?.name}</Typography>
                  <Typography variant="body2"><strong>Price:</strong> ${task.price}</Typography>
                </Box>
                {task.result && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>Your Result:</Typography>
                    <Typography variant="body2">
                      Status: {task.status === 'approved' ? 'Approved ✓' : task.status}
                    </Typography>
                    {task.result.admin_comment && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        <strong>Admin Comment:</strong> {task.result.admin_comment}
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">No test tasks available</Typography>
        </Paper>
      )}
    </Box>
  )
}
