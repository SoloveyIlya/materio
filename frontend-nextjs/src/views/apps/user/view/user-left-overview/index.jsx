// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import UserDetails from './UserDetails'
import UserPlan from './UserPlan'

const UserLeftOverview = ({ user, stats, onUserUpdate }) => {
  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <UserDetails user={user} stats={stats} onUserUpdate={onUserUpdate} />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <UserPlan stats={stats} />
      </Grid>
    </Grid>
  )
}

export default UserLeftOverview
