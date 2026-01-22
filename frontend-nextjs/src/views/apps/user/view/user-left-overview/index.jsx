// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import UserDetails from './UserDetails'
import UserPlan from './UserPlan'
import WorkScheduleManager from '@/components/WorkScheduleManager'

const UserLeftOverview = ({ user, stats, onUserUpdate }) => {
  // Determine if the user is an admin
  const primaryRole = user?.roles?.[0]?.name || 'user'
  const isAdmin = primaryRole === 'admin'

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <UserDetails user={user} stats={stats} onUserUpdate={onUserUpdate} />
      </Grid>
      {isAdmin && (
        <Grid size={{ xs: 12 }}>
          <WorkScheduleManager 
            userId={user?.id} 
            userRole='admin' 
            workSchedule={user?.adminProfile?.work_schedule}
            onUpdate={(updatedSchedule) => {
              if (onUserUpdate && user?.adminProfile) {
                onUserUpdate({
                  ...user,
                  adminProfile: {
                    ...user.adminProfile,
                    work_schedule: updatedSchedule
                  }
                })
              }
            }}
            canEdit={true}
          />
        </Grid>
      )}
      <Grid size={{ xs: 12 }}>
        <UserPlan stats={stats} />
      </Grid>
    </Grid>
  )
}

export default UserLeftOverview
