'use client'

import { useState, useEffect } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Pagination from '@mui/material/Pagination'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Box from '@mui/material/Box'

const Tests = ({ testData, onEditTest, onStartTest, readOnly = false, testResults = [] }) => {
  // States
  const [data, setData] = useState([])
  const [activePage, setActivePage] = useState(0)

  // Создаем мапу результатов тестов для быстрого поиска
  const resultsMap = {}
  if (testResults && Array.isArray(testResults)) {
    testResults.forEach(result => {
      if (result.test_id) {
        resultsMap[result.test_id] = result
      }
    })
  }

  useEffect(() => {
    const newData = testData ?? []
    if (activePage > Math.ceil(newData.length / 6)) setActivePage(0)
    setData(newData)
  }, [activePage, testData])

  return (
    <Card>
      <CardContent className='flex flex-col gap-6'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div>
            <Typography variant='h5'>Tests</Typography>
            <Typography>Total {data.length} test{data.length !== 1 ? 's' : ''} available</Typography>
          </div>
        </div>
        {data.length > 0 ? (
          <Grid container spacing={6}>
            {data.slice(activePage * 6, activePage * 6 + 6).map((item, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.id || index}>
                <div 
                  className='border rounded bs-full'
                  style={{
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)'
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
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
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <Typography variant='body2'>{item.duration_minutes} min</Typography>
                        {readOnly && onStartTest ? (
                          // Показываем кнопку Start только если тест не пройден
                          !resultsMap[item.id]?.is_passed && (
                            <Button
                              variant='contained'
                              size='small'
                              startIcon={<i className='ri-play-line' />}
                              onClick={(e) => {
                                e.stopPropagation()
                                onStartTest(item)
                              }}
                            >
                              Start
                            </Button>
                          )
                        ) : (
                          onEditTest && (
                            <IconButton
                              size='small'
                              onClick={(e) => {
                                e.stopPropagation()
                                onEditTest(item)
                              }}
                            >
                              <i className='ri-edit-box-line' />
                            </IconButton>
                          )
                        )}
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
                      {resultsMap[item.id]?.is_passed ? (
                        <Chip
                          label='Test passed'
                          color='success'
                          size='small'
                          variant='outlined'
                        />
                      ) : (
                        <Chip
                          label={item.is_active ? 'Active' : 'Inactive'}
                          color={item.is_active ? 'success' : 'default'}
                          size='small'
                          variant='outlined'
                        />
                      )}
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

