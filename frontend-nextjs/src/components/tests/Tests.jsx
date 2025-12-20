'use client'

import { useState, useEffect } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputLabel from '@mui/material/InputLabel'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import Select from '@mui/material/Select'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Box from '@mui/material/Box'

const Tests = ({ testData, onEditTest }) => {
  // States
  const [level, setLevel] = useState('All')
  const [hideInactive, setHideInactive] = useState(false)
  const [data, setData] = useState([])
  const [activePage, setActivePage] = useState(0)

  useEffect(() => {
    let newData = testData?.filter(testItem => {
      if (level === 'All') return !hideInactive || testItem.is_active

      return testItem.level_id?.toString() === level && (!hideInactive || testItem.is_active)
    }) ?? []

    if (activePage > Math.ceil(newData.length / 6)) setActivePage(0)
    setData(newData)
  }, [activePage, level, hideInactive, testData])

  const handleChange = e => {
    setHideInactive(e.target.checked)
    setActivePage(0)
  }

  const getLevels = () => {
    const levels = new Set()
    testData?.forEach(test => {
      if (test.level) {
        levels.add(JSON.stringify({ id: test.level.id, name: test.level.name }))
      }
    })
    return Array.from(levels).map(l => JSON.parse(l))
  }

  const levels = getLevels()

  return (
    <Card>
      <CardContent className='flex flex-col gap-6'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div>
            <Typography variant='h5'>Tests</Typography>
            <Typography>Total {data.length} test{data.length !== 1 ? 's' : ''} available</Typography>
          </div>
          <div className='flex flex-wrap items-center gap-y-4 gap-x-6'>
            <FormControl fullWidth size='small' className='is-[250px] flex-auto'>
              <InputLabel id='level-select'>Level</InputLabel>
              <Select
                fullWidth
                id='select-level'
                value={level}
                onChange={e => {
                  setLevel(e.target.value)
                  setActivePage(0)
                }}
                label='Level'
                labelId='level-select'
              >
                <MenuItem value='All'>All Levels</MenuItem>
                {levels.map((lvl) => (
                  <MenuItem key={lvl.id} value={lvl.id.toString()}>
                    {lvl.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={<Switch onChange={handleChange} checked={hideInactive} />}
              label='Hide inactive'
            />
          </div>
        </div>
        {data.length > 0 ? (
          <Grid container spacing={6}>
            {data.slice(activePage * 6, activePage * 6 + 6).map((item, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.id || index}>
                <div className='border rounded bs-full'>
                  <div className='pli-2 pbs-2'>
                    {item.image ? (
                      <img src={item.image} alt={item.title} className='is-full rounded' style={{ height: '200px', objectFit: 'cover' }} />
                    ) : (
                      <div className='is-full bg-actionHover' style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className='ri-file-text-line text-6xl text-textSecondary' />
                      </div>
                    )}
                  </div>
                  <div className='flex flex-col gap-4 p-5'>
                    <div className='flex items-center justify-between'>
                      {item.level && (
                        <Chip label={item.level.name} variant='tonal' size='small' color='primary' />
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant='body2'>{item.duration_minutes} min</Typography>
                        <IconButton
                          size='small'
                          onClick={() => onEditTest(item)}
                        >
                          <i className='ri-edit-box-line' />
                        </IconButton>
                      </Box>
                    </div>
                    <div className='flex flex-col gap-1'>
                      <Typography variant='h5' className='hover:text-primary'>
                        {item.title}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {item.description || 'No description'}
                      </Typography>
                    </div>
                    <div className='flex flex-col gap-1'>
                      <div className='flex items-center gap-1'>
                        <i className='ri-question-line text-xl' />
                        <Typography>{item.questions?.length || 0} questions</Typography>
                      </div>
                      <Chip
                        label={item.is_active ? 'Active' : 'Inactive'}
                        color={item.is_active ? 'success' : 'default'}
                        size='small'
                        variant='outlined'
                      />
                    </div>
                  </div>
                </div>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography className='text-center'>No tests found</Typography>
        )}
        {data.length > 6 && (
          <div className='flex justify-center'>
            <Pagination
              count={Math.ceil(data.length / 6)}
              page={activePage + 1}
              showFirstButton
              showLastButton
              variant='tonal'
              color='primary'
              onChange={(e, page) => setActivePage(page - 1)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default Tests

