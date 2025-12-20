// React Imports
import { useState } from 'react'

// MUI Imports
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

const NewColumn = ({ addNewColumn }) => {
  // States
  const [display, setDisplay] = useState(false)
  const [title, setTitle] = useState('')

  // Display the Add New form
  const toggleDisplay = () => {
    setDisplay(!display)
  }

  // Handle the Add New form
  const onSubmit = (e) => {
    e.preventDefault()
    if (title.trim()) {
      addNewColumn(title)
      setDisplay(false)
      setTitle('')
    }
  }

  // Handle reset
  const handleReset = () => {
    toggleDisplay()
    setTitle('')
  }

  return (
    <div className='flex flex-col gap-4 items-start min-is-[16.5rem] is-[16.5rem]'>
      <Typography
        variant='h5'
        color='text.primary'
        onClick={toggleDisplay}
        className='flex items-center gap-1 cursor-pointer'
      >
        <i className='ri-add-line text-base' />
        <span className='whitespace-nowrap'>Add New</span>
      </Typography>
      {display && (
        <form
          className='flex flex-col gap-4 is-[16.5rem]'
          onSubmit={onSubmit}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              handleReset()
            }
          }}
        >
          <TextField
            fullWidth
            autoFocus
            variant='outlined'
            label='Column Title'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <div className='flex gap-4'>
            <Button variant='contained' size='small' color='primary' type='submit'>
              Add
            </Button>
            <Button
              variant='outlined'
              size='small'
              color='secondary'
              onClick={handleReset}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

export default NewColumn

