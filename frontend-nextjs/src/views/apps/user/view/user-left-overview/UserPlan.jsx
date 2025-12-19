// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import LinearProgress from '@mui/material/LinearProgress'
import Box from '@mui/material/Box'

const UserPlan = ({ stats }) => {
  if (!stats) return null

  const successRate = stats.total_tasks > 0 
    ? Math.round((stats.completed_tasks / stats.total_tasks) * 100) 
    : 0

  return (
    <Card className='border-2 border-primary rounded'>
      <CardContent className='flex flex-col gap-6'>
        <div className='flex justify-between'>
          <Chip label='Performance' size='small' color='primary' variant='tonal' />
          <div className='flex justify-center'>
            <Typography component='span' variant='h1' color='primary.main'>
              {successRate}%
            </Typography>
          </div>
        </div>
        <div className='flex flex-col gap-2'>
          <div className='flex items-center gap-2'>
            <i className='ri-circle-fill text-[10px] text-textSecondary' />
            <Typography component='span'>Total Tasks: {stats.total_tasks || 0}</Typography>
          </div>
          <div className='flex items-center gap-2'>
            <i className='ri-circle-fill text-[10px] text-textSecondary' />
            <Typography component='span'>Completed: {stats.completed_tasks || 0}</Typography>
          </div>
          <div className='flex items-center gap-2'>
            <i className='ri-circle-fill text-[10px] text-textSecondary' />
            <Typography component='span'>In Progress: {stats.in_progress_tasks || 0}</Typography>
          </div>
        </div>
        <div className='flex flex-col gap-1'>
          <div className='flex items-center justify-between'>
            <Typography className='font-medium' color='text.primary'>
              Success Rate
            </Typography>
            <Typography className='font-medium' color='text.primary'>
              {stats.completed_tasks || 0} of {stats.total_tasks || 0} Tasks
            </Typography>
          </div>
          <LinearProgress variant='determinate' value={successRate} color='primary' />
          <Typography variant='body2'>{successRate}% completed</Typography>
        </div>
      </CardContent>
    </Card>
  )
}

export default UserPlan
