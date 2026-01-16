'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
import Grid from '@mui/material/Grid'

// Component Imports
import CustomTabList from '@core/components/mui/TabList'

const UserRight = ({ tabContentList, userId, user }) => {
  // States
  const [activeTab, setActiveTab] = useState('overview')

  const handleChange = (event, value) => {
    setActiveTab(value)
  }

  return (
    <>
      <TabContext value={activeTab}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12 }}>
            <CustomTabList onChange={handleChange} variant='scrollable' pill='true'>
              <Tab icon={<i className='ri-user-3-line' />} value='overview' label='Overview' iconPosition='start' />
              <Tab icon={<i className='ri-file-text-line' />} value='documents' label='Documents' iconPosition='start' />
              <Tab icon={<i className='ri-file-list-3-line' />} value='logs' label='Logs' iconPosition='start' />
              <Tab icon={<i className='ri-lock-line' />} value='secure' label='Secure' iconPosition='start' />
            </CustomTabList>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TabPanel 
              value={activeTab} 
              className='p-0'
              sx={{ 
                '&[aria-hidden="true"]': { 
                  display: 'none !important',
                  visibility: 'hidden !important'
                },
                '& > div': {
                  '&[aria-hidden="true"]': {
                    display: 'none !important',
                    visibility: 'hidden !important'
                  }
                }
              }}
            >
              {tabContentList[activeTab]}
            </TabPanel>
          </Grid>
        </Grid>
      </TabContext>
    </>
  )
}

export default UserRight
