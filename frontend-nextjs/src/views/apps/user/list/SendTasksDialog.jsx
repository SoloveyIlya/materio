'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  FormGroup,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material'
import api from '@/lib/api'
import { showToast } from '@/utils/toast'

// Список часовых поясов
const TIMEZONES = [
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
  { value: 'America/Denver', label: 'Denver (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { value: 'America/Phoenix', label: 'Phoenix (MST)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
]

// Генерация вариантов времени (каждые 30 минут)
const generateTimeOptions = () => {
  const options = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const h = hour.toString().padStart(2, '0')
      const m = minute.toString().padStart(2, '0')
      const period = hour < 12 ? 'AM' : 'PM'
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      options.push({
        value: `${h}:${m}`,
        label: `${displayHour}:${m.padStart(2, '0')} ${period}`
      })
    }
  }
  return options
}

const TIME_OPTIONS = generateTimeOptions()

// Форматирование даты для input type="date"
const formatDateForInput = (date) => {
  if (!date) return ''
  if (typeof date === 'string') return date
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

// Добавить дни к дате
const addDays = (date, days) => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// Получить завтрашнюю дату
const getTomorrow = () => {
  return addDays(new Date(), 1)
}

const SendTasksDialog = ({ open, onClose, user, onSuccess }) => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testsStatus, setTestsStatus] = useState(null)
  const [tasksByDay, setTasksByDay] = useState({})
  const [tasksSource, setTasksSource] = useState('template')
  const [daysConfig, setDaysConfig] = useState({})
  const [hasExistingConfig, setHasExistingConfig] = useState(false)
  const [expandedDay, setExpandedDay] = useState(null)

  // Загрузка конфигурации при открытии
  useEffect(() => {
    if (open && user?.id) {
      loadConfig()
    }
  }, [open, user?.id])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/admin/users/${user.id}/task-sending-config`)
      
      setTestsStatus(response.data.tests_status)
      setTasksByDay(response.data.tasks_by_day || {})
      setTasksSource(response.data.tasks_source || 'template')
      setHasExistingConfig(response.data.has_existing_config)
      
      // Устанавливаем конфигурацию
      if (response.data.config?.days_config) {
        setDaysConfig(response.data.config.days_config)
      }

      // Разворачиваем первый день по умолчанию
      const days = Object.keys(response.data.tasks_by_day || {})
      if (days.length > 0) {
        setExpandedDay(days[0])
      }
    } catch (error) {
      console.error('Error loading config:', error)
      showToast.error('Error loading configuration')
    } finally {
      setLoading(false)
    }
  }

  // Обновление конфигурации дня
  const updateDayConfig = (day, field, value) => {
    setDaysConfig(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }))
  }

  // Выбор/снятие таска
  const toggleTask = (day, taskId) => {
    setDaysConfig(prev => {
      const currentSelected = prev[day]?.selected_tasks || []
      const newSelected = currentSelected.includes(taskId)
        ? currentSelected.filter(id => id !== taskId)
        : [...currentSelected, taskId]
      
      return {
        ...prev,
        [day]: {
          ...prev[day],
          selected_tasks: newSelected
        }
      }
    })
  }

  // Выбрать все таски дня
  const selectAllTasks = (day) => {
    const allTaskIds = (tasksByDay[day] || []).map(t => t.id)
    updateDayConfig(day, 'selected_tasks', allTaskIds)
  }

  // Снять все таски дня
  const deselectAllTasks = (day) => {
    updateDayConfig(day, 'selected_tasks', [])
  }

  // Отправка формы
  const handleSubmit = async () => {
    try {
      setSaving(true)
      
      // Подготавливаем данные для отправки
      const configToSend = {}
      Object.keys(daysConfig).forEach(day => {
        const dayConf = daysConfig[day]
        configToSend[day] = {
          send_date: formatDateForInput(dayConf.send_date),
          start_time: dayConf.start_time || '07:00',
          end_time: dayConf.end_time || '17:00',
          timezone: dayConf.timezone || 'America/New_York',
          selected_tasks: dayConf.selected_tasks || []
        }
      })

      await api.post(`/admin/users/${user.id}/send-tasks`, {
        days_config: configToSend,
        tasks_source: tasksSource
      })

      showToast.success('Tasks scheduled successfully')
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Error sending tasks:', error)
      const errorData = error.response?.data
      
      if (errorData?.tests_not_passed) {
        // Показываем информацию о непройденных тестах
        setTestsStatus(errorData.tests_status)
      } else {
        showToast.error(errorData?.message || 'Error scheduling tasks')
      }
    } finally {
      setSaving(false)
    }
  }

  // Проверка, все ли тесты пройдены
  const allTestsPassed = testsStatus?.all_passed

  // Получить количество выбранных тасков для дня
  const getSelectedCount = (day) => {
    return (daysConfig[day]?.selected_tasks || []).length
  }

  // Получить общее количество тасков для дня
  const getTotalCount = (day) => {
    return (tasksByDay[day] || []).length
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h5">Send Tasks to {user?.name || user?.email}</Typography>
          <Typography variant="body2" color="text.secondary">
            Configure task sending schedule
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <i className="ri-close-line" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
            <CircularProgress />
          </Box>
        ) : !allTestsPassed ? (
          // Модальное окно о непройденных тестах
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'error.lighter',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3
              }}
            >
              <i className="ri-file-warning-line" style={{ fontSize: 40, color: 'var(--mui-palette-error-main)' }} />
            </Box>
            
            <Typography variant="h5" color="error.main" gutterBottom>
              Tests Not Completed
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
              This moderator has not passed all required tests yet. 
              They must complete all tests before receiving tasks.
            </Typography>

            <Alert severity="warning" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="subtitle2" gutterBottom>
                Test Progress: {testsStatus?.passed_count || 0} / {testsStatus?.total_count || 0}
              </Typography>
              <Box sx={{ mt: 1 }}>
                {testsStatus?.tests?.map(test => (
                  <Box key={test.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <i 
                      className={test.is_passed ? "ri-checkbox-circle-fill" : "ri-close-circle-line"} 
                      style={{ 
                        color: test.is_passed ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-error-main)' 
                      }} 
                    />
                    <Typography variant="body2">
                      {test.title}
                      {test.level && <Chip label={test.level} size="small" sx={{ ml: 1 }} />}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Alert>
          </Box>
        ) : (
          // Форма с фильтрами
          <Box>
            {hasExistingConfig && (
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  This user already has a saved configuration. You can modify and resend tasks.
                </Typography>
              </Alert>
            )}

            {Object.keys(tasksByDay).length === 0 ? (
              <Alert severity="warning">
                No tasks found. Please create task templates in Task Manager first.
              </Alert>
            ) : (
              <Box>
                {Object.keys(tasksByDay).sort((a, b) => Number(a) - Number(b)).map((day) => {
                  const tasks = tasksByDay[day] || []
                  const dayConf = daysConfig[day] || {}
                  const selectedTasks = dayConf.selected_tasks || []
                  
                  // Дефолтная дата: завтра + (день - 1)
                  const defaultDate = formatDateForInput(addDays(getTomorrow(), Number(day) - 1))
                  
                  return (
                    <Accordion 
                      key={day}
                      expanded={expandedDay === day}
                      onChange={(e, isExpanded) => setExpandedDay(isExpanded ? day : null)}
                      sx={{ mb: 2 }}
                    >
                      <AccordionSummary expandIcon={<i className="ri-arrow-down-s-line" />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 2 }}>
                          <Chip 
                            label={`Day ${day}`} 
                            color="primary" 
                            size="small" 
                          />
                          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                          </Typography>
                          <Chip 
                            label={`${getSelectedCount(day)} / ${getTotalCount(day)} selected`}
                            size="small"
                            color={getSelectedCount(day) === getTotalCount(day) ? 'success' : 'default'}
                            variant="outlined"
                          />
                        </Box>
                      </AccordionSummary>
                      
                      <AccordionDetails>
                        {/* Настройки даты и времени */}
                        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                          <TextField
                            label="Send Date"
                            type="date"
                            size="small"
                            value={dayConf.send_date || defaultDate}
                            onChange={(e) => updateDayConfig(day, 'send_date', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ min: formatDateForInput(new Date()) }}
                            sx={{ minWidth: 150 }}
                          />
                          
                          <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Start Time</InputLabel>
                            <Select
                              value={dayConf.start_time || '07:00'}
                              label="Start Time"
                              onChange={(e) => updateDayConfig(day, 'start_time', e.target.value)}
                            >
                              {TIME_OPTIONS.map(opt => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>

                          <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>End Time</InputLabel>
                            <Select
                              value={dayConf.end_time || '17:00'}
                              label="End Time"
                              onChange={(e) => updateDayConfig(day, 'end_time', e.target.value)}
                            >
                              {TIME_OPTIONS.map(opt => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>

                          <FormControl size="small" sx={{ minWidth: 180 }}>
                            <InputLabel>Timezone</InputLabel>
                            <Select
                              value={dayConf.timezone || 'America/New_York'}
                              label="Timezone"
                              onChange={(e) => updateDayConfig(day, 'timezone', e.target.value)}
                            >
                              {TIMEZONES.map(tz => (
                                <MenuItem key={tz.value} value={tz.value}>{tz.label}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Box>

                        <Divider sx={{ mb: 2 }} />

                        {/* Кнопки выбора */}
                        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                          <Button 
                            size="small" 
                            variant="outlined"
                            onClick={() => selectAllTasks(day)}
                          >
                            Select All
                          </Button>
                          <Button 
                            size="small" 
                            variant="outlined"
                            color="secondary"
                            onClick={() => deselectAllTasks(day)}
                          >
                            Deselect All
                          </Button>
                        </Box>

                        {/* Список тасков */}
                        <FormGroup>
                          {tasks.map(task => (
                            <FormControlLabel
                              key={task.id}
                              control={
                                <Checkbox
                                  checked={selectedTasks.includes(task.id)}
                                  onChange={() => toggleTask(day, task.id)}
                                />
                              }
                              label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography>{task.title}</Typography>
                                  {task.price && (
                                    <Chip 
                                      label={`$${task.price}`} 
                                      size="small" 
                                      color="success" 
                                      variant="outlined" 
                                    />
                                  )}
                                </Box>
                              }
                            />
                          ))}
                        </FormGroup>
                      </AccordionDetails>
                    </Accordion>
                  )
                })}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        {allTestsPassed && Object.keys(tasksByDay).length > 0 && (
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <i className="ri-send-plane-line" />}
          >
            {saving ? 'Scheduling...' : 'Schedule Tasks'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default SendTasksDialog
