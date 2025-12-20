// React Imports
import { useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'

// Third-Party Imports
import classnames from 'classnames'

// Styles Imports
import styles from './styles.module.css'

const TaskCard = props => {
  // Props
  const { task, onTaskClick, onDeleteTask } = props

  // States
  const [anchorEl, setAnchorEl] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  // Handle menu click
  const handleClick = e => {
    e.stopPropagation()
    setMenuOpen(true)
    setAnchorEl(e.currentTarget)
  }

  // Handle menu close
  const handleClose = () => {
    setAnchorEl(null)
    setMenuOpen(false)
  }

  // Handle Task Click
  const handleTaskClick = () => {
    if (onTaskClick) {
      onTaskClick(task)
    }
  }

  // Handle Delete
  const handleDelete = () => {
    handleClose()
    if (onDeleteTask) {
      onDeleteTask(task)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'default',
      in_progress: 'warning',
      under_admin_review: 'info',
      approved: 'success',
      rejected: 'error',
      sent_for_revision: 'warning',
      completed: 'success',
    }
    return colors[status] || 'default'
  }

  return (
    <>
      <Card
        className={classnames(
          'cursor-pointer overflow-visible mbe-4 z-0',
          styles.card
        )}
        onClick={handleTaskClick}
      >
        <CardContent className='flex flex-col gap-y-2 items-start relative overflow-hidden'>
          {task.status && (
            <div className='flex flex-wrap items-center justify-start gap-2 is-full max-is-[85%]'>
              <Chip 
                variant='tonal' 
                label={task.status} 
                size='small' 
                color={getStatusColor(task.status)} 
              />
            </div>
          )}
          <div className='absolute block-start-4 inline-end-3' onClick={e => e.stopPropagation()}>
            <IconButton
              aria-label='more'
              size='small'
              className={classnames(styles.menu, {
                [styles.menuOpen]: menuOpen
              })}
              aria-controls='long-menu'
              aria-haspopup='true'
              onClick={handleClick}
            >
              <i className='ri-more-2-line text-xl' />
            </IconButton>
            <Menu
              id='long-menu'
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              anchorEl={anchorEl}
              keepMounted
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={handleTaskClick}>View Details</MenuItem>
              <MenuItem onClick={handleDelete}>Delete</MenuItem>
            </Menu>
          </div>

          <Typography color='text.primary' className='max-is-[85%] wrap-break-word'>
            {task.title}
          </Typography>
          
          {/* Images are disabled - not showing document_image or selfie_image */}
          
          {task.assignedUser && (
            <div className='flex items-center gap-2'>
              {/* Avatar is hidden as per requirements */}
              <Typography variant='caption' color='text.secondary'>
                {task.assignedUser.name || task.assignedUser.email}
              </Typography>
            </div>
          )}
          
          {task.price && (
            <Typography variant='body2' color='text.secondary'>
              ${task.price}
            </Typography>
          )}
        </CardContent>
      </Card>
    </>
  )
}

export default TaskCard
