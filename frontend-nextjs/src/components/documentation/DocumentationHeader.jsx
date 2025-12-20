'use client'

// MUI Imports
import Card from '@mui/material/Card'
import { styled } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'

// Styled Card component
const StyledCard = styled(Card)({
  backgroundImage: "url('/images/pages/faq-header.png')",
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat'
})

const DocumentationHeader = ({ onAddDocumentation, onAddCategory }) => {
  return (
    <StyledCard className='shadow-none bg-transparent bg-cover' elevation={0}>
      <CardContent className='flex flex-col items-center is-full text-center !pbs-[4.5625rem] !pbe-[5.9375rem] pli-5'>
        <Typography variant='h4' color='primary.main' className='mbe-2.5'>
          Admin Documentation
        </Typography>
        <Typography className='mbe-6'>Manage your documentation pages and categories</Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button
            variant='contained'
            startIcon={<i className='ri-folder-add-line' />}
            onClick={onAddCategory}
          >
            Add Category
          </Button>
          <Button
            variant='contained'
            startIcon={<i className='ri-add-line' />}
            onClick={onAddDocumentation}
          >
            Add documentation
          </Button>
        </Box>
      </CardContent>
    </StyledCard>
  )
}

export default DocumentationHeader

