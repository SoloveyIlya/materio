'use client'

import { Box, Typography } from '@mui/material'

// Component Imports
import ModeratorTasksByDate from '@/views/apps/tasks/list/ModeratorTasksByDate'

export default function ModeratorTasksPage() {
  return (
    <Box>
      <Typography variant='h4' gutterBottom sx={{ px: 3, pt: 3 }}>
        Tasks
      </Typography>
      <ModeratorTasksByDate />
    </Box>
  )
}
