'use client'

// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import WelcomeCard from '@/views/dashboards/moderator/WelcomeCard'
import TopCourses from '@/views/dashboards/moderator/TopCourses'
import AcademyCard from '@/views/dashboards/moderator/AcademyCard'
import MyTasksCard from '@/views/dashboards/moderator/MyTasksCard'
import TasksTable from '@/views/dashboards/moderator/TasksTable'

const ModeratorDashboardPage = () => {
  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <WelcomeCard />
      </Grid>
      <Grid size={{ xs: 12, md: 8 }}>
        <TopCourses />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <AcademyCard />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <MyTasksCard />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TasksTable />
      </Grid>
    </Grid>
  )
}

export default ModeratorDashboardPage
