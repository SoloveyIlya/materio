'use client'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Avatar from '@mui/material/Avatar'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Checkbox from '@mui/material/Checkbox'
import { styled } from '@mui/material/styles'
import TimelineDot from '@mui/lab/TimelineDot'
import TimelineItem from '@mui/lab/TimelineItem'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import TimelineConnector from '@mui/lab/TimelineConnector'
import MuiTimeline from '@mui/lab/Timeline'

// Styled Timeline component
const Timeline = styled(MuiTimeline)({
  paddingLeft: 0,
  paddingRight: 0,
  '& .MuiTimelineItem-root': {
    width: '100%',
    '&:before': {
      display: 'none'
    }
  }
})

const MainTaskList = ({ title, users, dotColor = 'primary', showCheckbox = false, onCheckboxChange, formatDate }) => {
  return (
    <Card>
      <CardHeader title={title} />
      <CardContent>
        {users && users.length > 0 ? (
          <Timeline>
            {users.slice(0, 6).map((user, index) => (
              <TimelineItem key={user.id}>
                <TimelineSeparator>
                  <TimelineDot color={dotColor} />
                  {index < users.slice(0, 6).length - 1 && <TimelineConnector />}
                </TimelineSeparator>
                <TimelineContent>
                  <div className='flex flex-wrap items-center justify-between gap-x-2 mbe-2.5'>
                    <div className='flex items-center gap-2.5 flex-1'>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: `${dotColor}.main` }}>
                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                      </Avatar>
                      <div className='flex flex-col flex-wrap gap-0.5 flex-1'>
                        <Typography variant='body2' className='font-medium'>
                          {user.name}
                        </Typography>
                        <div className='flex items-center gap-2'>
                          <Typography variant='caption' color='text.disabled'>
                            {formatDate(user.received_at || user.completed_at)}
                          </Typography>
                          <Chip
                            label={`${user.days_since_received || user.days_since_completed || 0} days ago`}
                            size='small'
                            sx={{ height: 20, fontSize: '0.65rem' }}
                          />
                        </div>
                      </div>
                    </div>
                    {showCheckbox && (
                      <Checkbox
                        checked={false}
                        onChange={() => onCheckboxChange(user.id)}
                        size='small'
                      />
                    )}
                  </div>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        ) : (
          <Typography variant='body2' color='text.secondary' align='center' sx={{ py: 2 }}>
            No users
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

export default MainTaskList

