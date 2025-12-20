// React Imports
import { useState } from 'react'

// MUI Imports
import Typography from '@mui/material/Typography'
import InputBase from '@mui/material/InputBase'
import IconButton from '@mui/material/IconButton'
import Box from '@mui/material/Box'

// Third-party imports
import classnames from 'classnames'

// Component Imports
import OptionMenu from '@core/components/option-menu'
import TaskCard from './TaskCard'
import NewTask from './NewTask'

// Styles Imports
import styles from './styles.module.css'

const KanbanList = props => {
  // Props
  const { column, tasks, onTaskClick, onDeleteTask, onEditColumn, onDeleteColumn, onCreateTask } = props

  // States
  const [editDisplay, setEditDisplay] = useState(false)
  const [title, setTitle] = useState(column.name || column.title)

  // Handle Submit Edit
  const handleSubmitEdit = e => {
    e.preventDefault()
    setEditDisplay(!editDisplay)
    if (onEditColumn) {
      onEditColumn(column.id, title)
    }
  }

  // Cancel Edit
  const cancelEdit = () => {
    setEditDisplay(!editDisplay)
    setTitle(column.name || column.title)
  }

  // Delete Column
  const handleDeleteColumn = () => {
    if (onDeleteColumn) {
      onDeleteColumn(column.id)
    }
  }

  return (
    <div className='flex flex-col is-[16.5rem]'>
      {editDisplay ? (
        <form
          className='flex items-center mbe-4'
          onSubmit={handleSubmitEdit}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              cancelEdit()
            }
          }}
        >
          <InputBase value={title} autoFocus onChange={e => setTitle(e.target.value)} required />
          <IconButton color='success' size='small' type='submit'>
            <i className='ri-check-line' />
          </IconButton>
          <IconButton color='error' size='small' type='reset' onClick={cancelEdit}>
            <i className='ri-close-line' />
          </IconButton>
        </form>
      ) : (
        <div
          className={classnames(
            'flex items-center justify-between is-[16.5rem] bs-[2.125rem] mbe-4',
            styles.kanbanColumn
          )}
        >
          <Box>
            <Typography variant='h5' noWrap className='max-is-[80%]'>
              {column.name || column.title}
            </Typography>
            {column.date && (
              <Typography variant='caption' color='text.secondary'>
                {column.date.toLocaleDateString()}
              </Typography>
            )}
          </Box>
          <div className='flex items-center'>
            {column.id > 5 && (
              <OptionMenu
                iconClassName='text-xl text-actionActive'
                options={[
                  {
                    text: 'Edit',
                    icon: 'ri-pencil-line',
                    menuItemProps: {
                      className: 'flex items-center gap-2',
                      onClick: () => setEditDisplay(!editDisplay)
                    }
                  },
                  {
                    text: 'Delete',
                    icon: 'ri-delete-bin-line',
                    menuItemProps: { className: 'flex items-center gap-2', onClick: handleDeleteColumn }
                  }
                ]}
              />
            )}
          </div>
        </div>
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
        {tasks && tasks.map(
          task =>
            task && (
              <TaskCard
                key={task.id}
                task={task}
                onTaskClick={onTaskClick}
                onDeleteTask={onDeleteTask}
              />
            )
        )}
        {(!tasks || tasks.length === 0) && (
          <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant='caption'>No tasks</Typography>
          </Box>
        )}
      </Box>
      {onCreateTask && <NewTask onCreateTask={onCreateTask} />}
    </div>
  )
}

export default KanbanList

