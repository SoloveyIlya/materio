// MUI Imports
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Box from '@mui/material/Box'

const TrainingHeader = ({ searchValue, setSearchValue }) => {
  return (
    <Box className='flex flex-col gap-4 items-center text-center pbs-[50px] pbe-[40px] pli-5'>
      <Typography variant='h4' color='primary.main'>
        Training Center
      </Typography>
      <TextField
        className='is-full sm:max-is-[55%] md:max-is-[600px]'
        variant='outlined'
        placeholder='Search training tasks...'
        value={searchValue}
        onChange={e => setSearchValue(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position='start'>
                <i className='ri-search-line' />
              </InputAdornment>
            )
          }
        }}
      />
      <Typography variant='body2' color='text.secondary'>
        Complete test tasks and improve your skills
      </Typography>
    </Box>
  )
}

export default TrainingHeader
