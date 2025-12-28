'use client'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'

const SupportTicketForm = ({ formData, onChange }) => {
  return (
    <Card>
      <CardHeader title='Ticket Information' />
      <CardContent>
        <Grid container spacing={5} className='mbe-5'>
          <Grid size={{ xs: 12 }}>
            <TextField 
              fullWidth 
              label='Subject' 
              placeholder='e.g., Salary question, Insurance issue...'
              value={formData.subject || ''}
              onChange={(e) => onChange({ ...formData, subject: e.target.value })}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={formData.priority || 'medium'}
                label='Priority'
                onChange={(e) => onChange({ ...formData, priority: e.target.value })}
              >
                <MenuItem value='low'>Low</MenuItem>
                <MenuItem value='medium'>Medium</MenuItem>
                <MenuItem value='high'>High</MenuItem>
                <MenuItem value='urgent'>Urgent</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              multiline
              rows={8}
              label='Description'
              placeholder='Describe your issue in detail...'
              value={formData.description || ''}
              onChange={(e) => onChange({ ...formData, description: e.target.value })}
              required
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default SupportTicketForm

