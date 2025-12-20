// React Imports

// MUI Imports
import Typography from '@mui/material/Typography'

const NewTask = ({ onCreateTask }) => {
  // Handle click - immediately open drawer to create task
  const handleClick = () => {
    if (onCreateTask) {
      onCreateTask()
    }
  }

  return (
    <div className='flex flex-col gap-4 items-start'>
      <Typography onClick={handleClick} color='text.primary' className='flex items-center gap-1 cursor-pointer'>
        <i className='ri-add-line text-base' />
        <span>Add New Item</span>
      </Typography>
    </div>
  )
}

export default NewTask

