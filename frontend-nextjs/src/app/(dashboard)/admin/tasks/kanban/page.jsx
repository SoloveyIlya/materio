'use client'

import { useState, useEffect } from 'react'
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material'
import classnames from 'classnames'

// Component Imports
import KanbanList from '@/views/apps/tasks/kanban/KanbanList'
import NewColumn from '@/views/apps/tasks/kanban/NewColumn'
import TaskDrawer from '@/views/apps/tasks/kanban/TaskDrawer'

// Util Imports
import { commonLayoutClasses } from '@layouts/utils/layoutClasses'
import api from '@/lib/api'
import { showToast } from '@/utils/toast'

// Styles Imports
import styles from '@/views/apps/tasks/kanban/styles.module.css'

function getDateForDay(day) {
  const date = new Date()
  date.setDate(date.getDate() + day - 1)
  return date
}

const KanbanPage = () => {
  const [tasks, setTasks] = useState([])
  const [defaultColumns] = useState([
    { id: 1, name: 'Day 1', date: getDateForDay(1) },
    { id: 2, name: 'Day 2', date: getDateForDay(2) },
    { id: 3, name: 'Day 3', date: getDateForDay(3) },
    { id: 4, name: 'Day 4', date: getDateForDay(4) },
    { id: 5, name: 'Day 5', date: getDateForDay(5) },
  ])
  const [customColumns, setCustomColumns] = useState([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [selectedColumn, setSelectedColumn] = useState(null)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategorySlug, setNewCategorySlug] = useState('')

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      const response = await api.get('/admin/tasks')
      setTasks(response.data.data || response.data || [])
    } catch (error) {
      console.error('Error loading tasks:', error)
      setTasks([])
    }
  }

  const getTasksForColumn = (column) => {
    // For default columns (Day 1-5), filter by work_day
    if (column.id <= 5) {
      const dayNumber = column.id
      return tasks.filter(task => {
        // Match by work_day (exact match)
        return task.work_day === dayNumber
      })
    } else {
      // For custom columns, return empty for now
      // You can implement custom filtering logic here
      return []
    }
  }

  const handleTaskClick = (task) => {
    setSelectedTask(task)
    setDrawerOpen(true)
  }

  const handleDeleteTask = async (task) => {
    if (!confirm(`Are you sure you want to delete task "${task.title}"?`)) {
      return
    }

    try {
      await api.delete(`/admin/tasks/${task.id}`)
      loadTasks() // Reload tasks after deletion
      showToast.success('Task deleted successfully')
    } catch (error) {
      console.error('Error deleting task:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Error deleting task'
      showToast.error(errorMessage)
    }
  }

  const handleAddColumn = (title) => {
    const newColumn = {
      id: Date.now(),
      name: title,
    }
    setCustomColumns(prev => [...prev, newColumn])
  }

  const handleEditColumn = (columnId, newTitle) => {
    setCustomColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, name: newTitle } : col
    ))
  }

  const handleDeleteColumn = (columnId) => {
    if (confirm('Are you sure you want to delete this column?')) {
      setCustomColumns(prev => prev.filter(col => col.id !== columnId))
    }
  }

  const handleCreateTask = (column = null) => {
    setSelectedTask(null)
    setSelectedColumn(column)
    setDrawerOpen(true)
  }

  return (
    <div
      className={classnames(
        commonLayoutClasses.contentHeightFixed,
        styles.scroll,
        'is-full overflow-auto pis-2 -mis-2'
      )}
    >
      <Box sx={{ p: 6 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant='h4'>Task Manager</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant='outlined' onClick={() => setCategoryDialogOpen(true)} startIcon={<i className='ri-folder-add-line' />}>
              Create Category
            </Button>
          </Box>
        </Box>

        {/* Default Columns (5 days) - in a row */}
        <div className='flex items-start gap-6 mbe-6'>
          {defaultColumns.map(column => (
            <KanbanList
              key={column.id}
              column={column}
              tasks={getTasksForColumn(column)}
              onTaskClick={handleTaskClick}
              onDeleteTask={handleDeleteTask}
              onEditColumn={handleEditColumn}
              onDeleteColumn={handleDeleteColumn}
              onCreateTask={() => handleCreateTask(column)}
            />
          ))}
        </div>

        {/* Custom Columns - below default columns, in a row */}
        {customColumns.length > 0 && (
          <div className='flex items-start gap-6'>
            {customColumns.map(column => (
              <KanbanList
                key={column.id}
                column={column}
                tasks={getTasksForColumn(column)}
                onTaskClick={handleTaskClick}
                onDeleteTask={handleDeleteTask}
                onEditColumn={handleEditColumn}
                onDeleteColumn={handleDeleteColumn}
                onCreateTask={() => handleCreateTask(column)}
              />
            ))}
            <NewColumn addNewColumn={handleAddColumn} />
          </div>
        )}

        {/* Show "Add New" button only if no custom columns yet - below default columns */}
        {customColumns.length === 0 && (
          <div className='flex items-start gap-6'>
            <NewColumn addNewColumn={handleAddColumn} />
          </div>
        )}
      </Box>

      {/* Task Drawer */}
      <TaskDrawer
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        task={selectedTask}
        column={selectedColumn}
        onSave={loadTasks}
      />

      {/* Create Category Dialog */}
      <Dialog open={categoryDialogOpen} onClose={() => setCategoryDialogOpen(false)}>
        <DialogTitle>Create Task Category</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin='dense'
            label='Category Name'
            fullWidth
            variant='outlined'
            value={newCategoryName}
            onChange={(e) => {
              setNewCategoryName(e.target.value)
              setNewCategorySlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))
            }}
          />
          <TextField
            margin='dense'
            label='Slug'
            fullWidth
            variant='outlined'
            value={newCategorySlug}
            onChange={(e) => setNewCategorySlug(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCategoryDialogOpen(false); setNewCategoryName(''); setNewCategorySlug('') }}>Cancel</Button>
          <Button onClick={async () => {
            try {
              await api.post('/admin/task-categories', {
                name: newCategoryName,
                slug: newCategorySlug,
              })
              setCategoryDialogOpen(false)
              setNewCategoryName('')
              setNewCategorySlug('')
              showToast.success('Category created successfully')
            } catch (error) {
              console.error('Error creating category:', error)
              const errorMessage = error.response?.data?.message || error.message || 'Error creating category'
              showToast.error(errorMessage)
            }
          }} variant='contained'>Save</Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default KanbanPage
