// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import Grid from '@mui/material/Grid'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'

const TableFilters = ({ setData, tableData, activeTab, onFilterChange, administrators, selectedAdministrator, onAdministratorChange }) => {
  // States
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [online, setOnline] = useState(false)

  useEffect(() => {
    const filteredData = tableData?.filter(user => {
      if (role && !user.roles?.some(r => r.name === role)) return false
      if (status === 'online' && !user.is_online) return false
      if (status === 'offline' && user.is_online) return false
      // Фильтрация по администратору происходит на сервере, здесь только локальная фильтрация
      return true
    })

    setData(filteredData || [])
    
    // Notify parent about filter changes
    if (onFilterChange) {
      onFilterChange({ role, status, online, administrator: selectedAdministrator })
    }
  }, [role, status, online, tableData, setData, onFilterChange, selectedAdministrator])

  const handleReset = () => {
    setRole('')
    setStatus('')
    setOnline(false)
  }

  return (
    <CardContent>
      <Grid container spacing={5}>
        {/* Filter by Administrator */}
        <Grid size={{ xs: 12, sm: 4 }}>
          <FormControl fullWidth>
            <InputLabel id='administrator-select'>Select Administrator</InputLabel>
            <Select
              fullWidth
              id='select-administrator'
              value={selectedAdministrator || ''}
              onChange={e => onAdministratorChange && onAdministratorChange(e.target.value)}
              label='Select Administrator'
              labelId='administrator-select'
            >
              <MenuItem value=''>All Users</MenuItem>
              <MenuItem value='unassigned'>Not Assigned</MenuItem>
              {administrators?.map(admin => (
                <MenuItem key={admin.id} value={admin.id}>
                  {admin.name || admin.email}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <FormControl fullWidth>
            <InputLabel id='role-select'>Select Role</InputLabel>
            <Select
              fullWidth
              id='select-role'
              value={role}
              onChange={e => setRole(e.target.value)}
              label='Select Role'
              labelId='role-select'
            >
              <MenuItem value=''>All Roles</MenuItem>
              <MenuItem value='admin'>Admin</MenuItem>
              <MenuItem value='moderator'>Moderator</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <FormControl fullWidth>
            <InputLabel id='status-select'>Select Status</InputLabel>
            <Select
              fullWidth
              id='select-status'
              label='Select Status'
              value={status}
              onChange={e => setStatus(e.target.value)}
              labelId='status-select'
            >
              <MenuItem value=''>All Status</MenuItem>
              <MenuItem value='online'>Online</MenuItem>
              <MenuItem value='offline'>Offline</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', gap: 2 }}>
            <Button
              variant={online ? 'contained' : 'outlined'}
              onClick={() => setOnline(!online)}
              startIcon={<i className="ri-filter-line" />}
              fullWidth
            >
              {online ? 'Online Only' : 'Show All'}
            </Button>
            {(role || status || online || selectedAdministrator) && (
              <Button variant='outlined' onClick={() => {
                handleReset()
                onAdministratorChange && onAdministratorChange('')
              }} size='small'>
                Reset
              </Button>
            )}
          </Box>
        </Grid>
      </Grid>
    </CardContent>
  )
}

export default TableFilters
