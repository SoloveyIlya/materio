'use client'

// React Imports
import { useEffect, useState, useMemo } from 'react'

// Next Imports
import { useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'

// Third-party Imports
import classnames from 'classnames'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel
} from '@tanstack/react-table'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'
import OptionMenu from '@core/components/option-menu'
import api from '@/lib/api'

// Util Imports
import { getInitials } from '@/utils/getInitials'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

// Simple filter function
const fuzzyFilter = (row, columnId, value) => {
  const cellValue = row.getValue(columnId)
  if (!value) return true
  
  const searchValue = String(value).toLowerCase()
  const cellString = String(cellValue || '').toLowerCase()
  
  return cellString.includes(searchValue)
}

const DebouncedInput = ({ value: initialValue, onChange, debounce = 500, ...props }) => {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value)
    }, debounce)

    return () => clearTimeout(timeout)
  }, [value, onChange, debounce])

  return <TextField {...props} value={value} onChange={e => setValue(e.target.value)} size='small' />
}

// Column Definitions
const columnHelper = createColumnHelper()

const TaskListTable = ({ tableData, onViewResult, onMessageModerator }) => {
  // States
  const [rowSelection, setRowSelection] = useState({})
  const [data, setData] = useState(tableData || [])
  const [filteredData, setFilteredData] = useState(data)
  const [globalFilter, setGlobalFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [users, setUsers] = useState([])

  // Hooks
  const router = useRouter()

  useEffect(() => {
    setData(tableData || [])
    setFilteredData(tableData || [])
  }, [tableData])

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    // Фильтрация по пользователю
    let filtered = data
    if (userFilter) {
      filtered = filtered.filter(task => {
        const userId = task.assigned_user?.id || task.assignedUser?.id
        return userId && userId.toString() === userFilter
      })
    }
    
    // Фильтрация по глобальному поиску
    if (globalFilter) {
      const searchValue = globalFilter.toLowerCase()
      filtered = filtered.filter(task => {
        const title = (task.title || '').toLowerCase()
        const categoryName = (task.category?.name || '').toLowerCase()
        const userName = (task.assigned_user?.name || task.assignedUser?.name || '').toLowerCase()
        const userEmail = (task.assigned_user?.email || task.assignedUser?.email || '').toLowerCase()
        return title.includes(searchValue) || 
               categoryName.includes(searchValue) || 
               userName.includes(searchValue) || 
               userEmail.includes(searchValue)
      })
    }
    
    setFilteredData(filtered)
  }, [data, userFilter, globalFilter])

  const loadUsers = async () => {
    try {
      const response = await api.get('/admin/users?role=moderator')
      setUsers(response.data || [])
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'default',
      in_progress: 'info',
      completed_by_moderator: 'warning',
      under_admin_review: 'primary',
      approved: 'success',
      rejected: 'error',
      sent_for_revision: 'warning',
      cancelled: 'default',
    }
    return colors[status] || 'default'
  }

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      in_progress: 'In Progress',
      completed_by_moderator: 'Completed by Moderator',
      under_admin_review: 'Under Admin Review',
      approved: 'Approved',
      rejected: 'Rejected',
      sent_for_revision: 'Sent for Revision',
      cancelled: 'Cancelled',
    }
    return labels[status] || status
  }

  const getAvatar = params => {
    const { avatar, name, email } = params
    const displayName = name || email || 'User'

    if (avatar) {
      return <CustomAvatar src={avatar} skin='light' size={34} />
    } else {
      return (
        <CustomAvatar skin='light' size={34}>
          {getInitials(displayName)}
        </CustomAvatar>
      )
    }
  }

  const columns = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            {...{
              checked: table.getIsAllRowsSelected(),
              indeterminate: table.getIsSomeRowsSelected(),
              onChange: table.getToggleAllRowsSelectedHandler()
            }}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            {...{
              checked: row.getIsSelected(),
              disabled: !row.getCanSelect(),
              indeterminate: row.getIsSomeSelected(),
              onChange: row.getToggleSelectedHandler()
            }}
          />
        )
      },
      columnHelper.accessor('id', {
        header: 'ID',
        cell: ({ row }) => (
          <Typography color='primary.main' className='font-medium'>
            #{row.original.id}
          </Typography>
        )
      }),
      columnHelper.accessor('title', {
        header: 'Title',
        cell: ({ row }) => {
          const title = row.original.title || '—'
          const truncatedTitle = title.length > 30 ? title.substring(0, 30) + '...' : title
          return (
            <Typography 
              className='font-medium' 
              color='text.primary'
              title={title}
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '300px'
              }}
            >
              {truncatedTitle}
            </Typography>
          )
        }
      }),
      columnHelper.accessor('assigned_user', {
        header: 'Moderator',
        cell: ({ row }) => {
          const user = row.original.assigned_user || row.original.assignedUser
          if (!user) return <Typography color='text.secondary'>—</Typography>
          
          return (
            <div className='flex items-center gap-3'>
              {getAvatar({ avatar: user.avatar, name: user.name, email: user.email })}
              <div className='flex flex-col'>
                <Typography className='font-medium' color='text.primary'>
                  {user.name || user.email || '—'}
                </Typography>
              </div>
            </div>
          )
        }
      }),
      columnHelper.accessor('category', {
        header: 'Category',
        cell: ({ row }) => (
          <Typography>{row.original.category?.name || '—'}</Typography>
        )
      }),
      columnHelper.accessor('price', {
        header: 'Price',
        cell: ({ row }) => (
          <Typography className='font-medium' color='text.primary'>
            ${row.original.price || '0.00'}
          </Typography>
        )
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: ({ row }) => (
          <Chip
            label={getStatusLabel(row.original.status)}
            color={getStatusColor(row.original.status)}
            variant='tonal'
            size='small'
          />
        )
      }),
      columnHelper.accessor('completed_at', {
        header: 'Completed At',
        cell: ({ row }) => (
          <Typography variant='body2'>
            {row.original.completed_at 
              ? new Date(row.original.completed_at).toLocaleString() 
              : '—'}
          </Typography>
        )
      }),
      columnHelper.accessor('action', {
        header: 'Action',
        cell: ({ row }) => {
          const task = row.original
          const canViewResult = (task.status === 'under_admin_review' || 
            task.status === 'approved' || 
            task.status === 'rejected' || 
            task.status === 'sent_for_revision' ||
            task.status === 'completed_by_moderator') && task.result

          return (
            <div className='flex items-center'>
              {canViewResult && (
                <IconButton
                  size='small'
                  onClick={() => onViewResult(task)}
                  title='View result'
                >
                  <i className='ri-eye-line text-textSecondary' />
                </IconButton>
              )}
              {task.assigned_user && (
                <IconButton
                  size='small'
                  onClick={() => onMessageModerator(task)}
                  title='Message moderator'
                >
                  <i className='ri-message-2-line text-textSecondary' />
                </IconButton>
              )}
              <OptionMenu
                iconButtonProps={{ size: 'medium' }}
                iconClassName='text-textSecondary'
                options={[
                  {
                    text: 'View Details',
                    icon: 'ri-eye-line',
                    menuItemProps: {
                      onClick: () => onViewResult(task),
                      className: 'flex items-center gap-2 text-textSecondary'
                    }
                  }
                ]}
              />
            </div>
          )
        },
        enableSorting: false
      })
    ],
    [onViewResult, onMessageModerator]
  )

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      rowSelection
    },
    initialState: {
      pagination: {
        pageSize: 10
      }
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  return (
    <Card>
      <CardContent className='flex justify-between max-sm:flex-col sm:items-center gap-4'>
        <Box sx={{ display: 'flex', gap: 2, flex: 1, maxWidth: { sm: '600px' } }}>
          <DebouncedInput
            value={globalFilter ?? ''}
            onChange={value => setGlobalFilter(String(value))}
            placeholder='Search Task'
            className='sm:is-auto'
            sx={{ flex: 1 }}
          />
          <FormControl size='small' sx={{ minWidth: 200 }}>
            <InputLabel>Filter by User</InputLabel>
            <Select
              value={userFilter}
              label='Filter by User'
              onChange={(e) => setUserFilter(e.target.value)}
            >
              <MenuItem value=''>
                <em>All Users</em>
              </MenuItem>
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id.toString()}>
                  {user.name || user.email}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Button variant='outlined' color='secondary' startIcon={<i className='ri-upload-2-line' />}>
          Export
        </Button>
      </CardContent>
      <div className='overflow-x-auto'>
        <table className={tableStyles.table}>
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id}>
                    {header.isPlaceholder ? null : (
                      <>
                        <div
                          className={classnames({
                            'flex items-center': header.column.getIsSorted(),
                            'cursor-pointer select-none': header.column.getCanSort()
                          })}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: <i className='ri-arrow-up-s-line text-xl' />,
                            desc: <i className='ri-arrow-down-s-line text-xl' />
                          }[header.column.getIsSorted()] ?? null}
                        </div>
                      </>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          {table.getRowModel().rows.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                  No data available
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody>
              {table
                .getRowModel()
                .rows.slice(0, table.getState().pagination.pageSize)
                .map(row => {
                  return (
                    <tr key={row.id} className={classnames({ selected: row.getIsSelected() })}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                      ))}
                    </tr>
                  )
                })}
            </tbody>
          )}
        </table>
      </div>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component='div'
        className='border-bs'
        count={table.getRowModel().rows.length}
        rowsPerPage={table.getState().pagination.pageSize}
        page={table.getState().pagination.pageIndex}
        onPageChange={(_, page) => {
          table.setPageIndex(page)
        }}
        onRowsPerPageChange={e => table.setPageSize(Number(e.target.value))}
      />
    </Card>
  )
}

export default TaskListTable
