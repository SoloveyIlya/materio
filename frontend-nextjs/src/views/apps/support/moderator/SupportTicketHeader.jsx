'use client'

// MUI Imports
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

const SupportTicketHeader = ({ onDiscard, onSaveDraft, onSubmit, loading }) => {
  return (
    <div className='flex flex-wrap sm:items-center justify-between max-sm:flex-col gap-6'>
      <div>
        <Typography variant='h4' className='mbe-1'>
          Create Support Ticket
        </Typography>
        <Typography>Submit a ticket for questions related to salary, insurance, benefits, and other administrative matters</Typography>
      </div>
      <div className='flex flex-wrap max-sm:flex-col gap-4'>
        <Button variant='outlined' color='secondary' onClick={onDiscard} disabled={loading}>
          Discard
        </Button>
        <Button variant='outlined' onClick={onSaveDraft} disabled={loading}>Save Draft</Button>
        <Button variant='contained' onClick={onSubmit} disabled={loading}>Submit Ticket</Button>
      </div>
    </div>
  )
}

export default SupportTicketHeader

