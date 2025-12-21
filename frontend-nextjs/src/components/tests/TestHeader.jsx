'use client'

// MUI Imports
import Card from '@mui/material/Card'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { useTheme } from '@mui/material/styles'

// Third-party Imports
import classnames from 'classnames'

// Component Imports
import CustomIconButton from '@/@core/components/mui/IconButton'

const TestHeader = ({ onAddTest, onManageLevels }) => {
  // Vars
  const leftIllustration = '/images/apps/academy/hand-with-bulb-light.png'

  // Hooks
  const theme = useTheme()

  return (
    <Card className='relative flex justify-center'>
      <img src={leftIllustration} className='max-md:hidden absolute max-is-[100px] top-12 start-12' />
      <div className='flex flex-col items-center gap-4 max-md:pli-5 plb-12 md:is-1/2'>
        <Typography variant='h4' className='text-center md:is-3/4'>
          Training Tests for Moderators. <span className='text-primary'>Manage and create tests.</span>
        </Typography>
        <Typography className='text-center'>
          Create and manage training tests that moderators need to complete. Add questions, answers, and track progress.
        </Typography>
        <div className='flex items-center gap-4 max-sm:is-full'>
          <Button
            variant='contained'
            color='primary'
            startIcon={<i className='ri-add-line' />}
            onClick={onAddTest}
            className='sm:is-auto max-sm:flex-1'
          >
            Add New Test
          </Button>
          <Button
            variant='outlined'
            color='primary'
            startIcon={<i className='ri-settings-3-line' />}
            onClick={onManageLevels}
            className='sm:is-auto max-sm:flex-1'
          >
            Manage Levels
          </Button>
        </div>
      </div>
      <img
        src='/images/apps/academy/9.png'
        className={classnames('max-md:hidden absolute max-bs-[180px] bottom-0 end-0', {
          'scale-x-[-1]': theme.direction === 'rtl'
        })}
      />
    </Card>
  )
}

export default TestHeader

