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
import Box from '@mui/material/Box'
import AvatarGroup from '@mui/material/AvatarGroup'
import Tooltip from '@mui/material/Tooltip'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'

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

  const getCategoryColor = (categoryName) => {
    // Генерируем цвет на основе названия категории для консистентности
    if (!categoryName) return 'default'
    
    // Простая хеш-функция для генерации цвета на основе названия
    const colors = ['primary', 'secondary', 'success', 'warning', 'info', 'error']
    const hash = String(categoryName).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  // Получаем название категории (может быть объектом или строкой)
  const getCategoryName = () => {
    if (!task.category) return null
    if (typeof task.category === 'string') return task.category
    if (typeof task.category === 'object' && task.category.name) return task.category.name
    return null
  }

  // Подсчитываем количество вложений (изображения)
  const getAttachmentsCount = () => {
    let count = 0
    if (task.document_image) count++
    if (task.selfie_image) count++
    return count
  }

  // Генерируем декоративные аватарки для визуального эффекта
  // Используем task.id для консистентности - одна и та же задача всегда имеет одинаковые аватарки
  const getDecorativeAvatars = () => {
    const colors = ['primary', 'secondary', 'success', 'warning', 'error', 'info']
    const names = ['A', 'B', 'C', 'D', 'E', 'F']
    
    // Генерируем хеш на основе task.id для консистентности
    const taskId = task.id || 0
    const hash = String(taskId).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const count = (hash % 3) + 2 // 2-4 аватарки
    
    return Array.from({ length: count }, (_, i) => {
      const nameIndex = (hash + i) % names.length
      const colorIndex = (hash + i) % colors.length
      return {
        name: names[nameIndex],
        color: colors[colorIndex],
        key: `${taskId}-${i}`
      }
    })
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
          {getCategoryName() && (
            <div className='flex flex-wrap items-center justify-start gap-2 is-full max-is-[85%]'>
              <Chip 
                variant='tonal' 
                label={getCategoryName()} 
                size='small' 
                color={getCategoryColor(getCategoryName())} 
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
          
          {/* Footer with attachments, views, and avatars */}
          <Box className='flex items-center justify-between w-full gap-2 mt-2'>
            <Box className='flex items-center gap-3'>
              {/* Attachments count */}
              {getAttachmentsCount() > 0 && (
                <Box className='flex items-center gap-1'>
                  <i className='ri-attachment-line text-base' style={{ color: 'var(--mui-palette-text-secondary)' }} />
                  <Typography variant='caption' color='text.secondary'>
                    {getAttachmentsCount()}
                  </Typography>
                </Box>
              )}
              
              {/* Views/Comments count (декоративное, консистентное для каждой задачи) */}
              <Box className='flex items-center gap-1'>
                <i className='ri-eye-line text-base' style={{ color: 'var(--mui-palette-text-secondary)' }} />
                <Typography variant='caption' color='text.secondary'>
                  {(() => {
                    // Генерируем консистентное число просмотров на основе task.id
                    const taskId = task.id || 0
                    const hash = String(taskId).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
                    return (hash % 20) + 5 // 5-24 просмотра
                  })()}
                </Typography>
              </Box>
            </Box>
            
            {/* Avatars group */}
            <AvatarGroup 
              max={4}
              sx={{
                '& .MuiAvatar-root': {
                  width: 28,
                  height: 28,
                  fontSize: '0.75rem',
                  border: '2px solid var(--mui-palette-background-paper)',
                  '&:not(:first-of-type)': {
                    marginLeft: '-8px'
                  }
                }
              }}
            >
              {getDecorativeAvatars().map((avatar) => (
                <Tooltip key={avatar.key} title={avatar.name}>
                  <CustomAvatar
                    skin='light'
                    color={avatar.color}
                    size={28}
                  >
                    {avatar.name}
                  </CustomAvatar>
                </Tooltip>
              ))}
            </AvatarGroup>
          </Box>
          
          {task.price && (
            <Typography variant='body2' color='text.secondary' className='mt-1'>
              ${task.price}
            </Typography>
          )}
        </CardContent>
      </Card>
    </>
  )
}

export default TaskCard
