'use client'

import { useState, useEffect } from 'react'
import { Box, Typography, Button } from '@mui/material'
import classnames from 'classnames'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()
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
      style={{ overflowX: 'hidden' }}
    >
      <Box sx={{ p: { xs: 3, sm: 4, lg: 5 }, maxWidth: '100%', overflowX: 'hidden', width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant='h4'>Task Manager</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              variant='outlined' 
              onClick={() => router.push('/admin/categories')} 
              startIcon={<i className='ri-price-tag-3-line' />}
            >
              Category
            </Button>
          </Box>
        </Box>

        {/* Default Columns (5 days) - in a row */}
        <Box sx={{ display: 'flex', gap: { xs: 2, md: 2.5, lg: 3 }, mb: 6, width: '100%', maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>
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
        </Box>

        {/* Custom Columns - below default columns, in a row */}
        {customColumns.length > 0 && (
          <Box sx={{ display: 'flex', gap: { xs: 2, md: 2.5, lg: 3 }, width: '100%', maxWidth: '100%', overflowX: 'hidden', flexWrap: 'wrap', boxSizing: 'border-box' }}>
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
          </Box>
        )}

        {/* Show "Add New" button only if no custom columns yet - below default columns */}
        {customColumns.length === 0 && (
          <Box sx={{ display: 'flex', gap: { xs: 2, md: 2.5, lg: 3 }, width: '100%', maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>
            <NewColumn addNewColumn={handleAddColumn} />
          </Box>
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

    </div>
  )
}

export default KanbanPage
