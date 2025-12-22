'use client'

// React Imports
import { useEffect, useState, useMemo } from 'react'

// Next Imports
import { useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import { styled } from '@mui/material/styles'
import TablePagination from '@mui/material/TablePagination'

// Third-party Imports
import classnames from 'classnames'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel
} from '@tanstack/react-table'

// Component Imports
import TableFilters from './TableFilters'
import CustomAvatar from '@core/components/mui/Avatar'

// Util Imports
import { getInitials } from '@/utils/getInitials'
import api from '@/lib/api'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

// Styled Components
const Icon = styled('i')({})

// Simple filter function (works without match-sorter-utils)
const fuzzyFilter = (row, columnId, value) => {
  const cellValue = row.getValue(columnId)
  if (!value) return true
  
  const searchValue = String(value).toLowerCase()
  const cellString = String(cellValue || '').toLowerCase()
  
  return cellString.includes(searchValue)
}

const DebouncedInput = ({ value: initialValue, onChange, debounce = 500, ...props }) => {
  // States
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value)
    }, debounce)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return <TextField {...props} value={value} onChange={e => setValue(e.target.value)} size='small' />
}

// Vars
const userRoleObj = {
  admin: { icon: 'ri-vip-crown-line', color: 'error' },
  moderator: { icon: 'ri-user-star-line', color: 'warning' },
  author: { icon: 'ri-computer-line', color: 'warning' },
  editor: { icon: 'ri-edit-box-line', color: 'info' },
  maintainer: { icon: 'ri-pie-chart-2-line', color: 'success' },
  subscriber: { icon: 'ri-user-3-line', color: 'primary' }
}

const userStatusObj = {
  active: 'success',
  pending: 'warning',
  inactive: 'secondary',
  online: 'success',
  offline: 'secondary'
}

// Column Definitions
const columnHelper = createColumnHelper()

const UserListTable = ({ tableData, activeTab, onSendTest }) => {
  // States
  const [rowSelection, setRowSelection] = useState({})
  const [data, setData] = useState(tableData || [])
  const [filteredData, setFilteredData] = useState(data)
  const [globalFilter, setGlobalFilter] = useState('')

  // Hooks
  const router = useRouter()

  useEffect(() => {
    setData(tableData || [])
    setFilteredData(tableData || [])
  }, [tableData])

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
    () => {
      const baseColumns = [
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
        columnHelper.accessor('name', {
          header: 'User',
          cell: ({ row }) => {
            const user = row.original
            return (
              <div 
                className='flex items-center gap-4 cursor-pointer'
                onClick={() => router.push(`/admin/users/${user.id}`)}
                style={{
                  transition: 'transform 0.2s, opacity 0.2s',
                  display: 'inline-flex'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)'
                  e.currentTarget.style.opacity = '0.9'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.opacity = '1'
                }}
              >
                {getAvatar({ avatar: user.avatar, name: user.name, email: user.email })}
                <div className='flex flex-col'>
                  <Typography className='font-medium' color='text.primary'>
                    {user.name || user.email || 'N/A'}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    ID: {user.id}
                  </Typography>
                </div>
              </div>
            )
          }
        }),
        columnHelper.accessor('email', {
          header: 'Email',
          cell: ({ row }) => <Typography>{row.original.email || '—'}</Typography>
        }),
        columnHelper.accessor('is_online', {
          header: 'Status',
          cell: ({ row }) => {
            const isOnline = row.original.is_online
            return (
              <Chip
                variant='tonal'
                label={isOnline ? 'Online' : 'Offline'}
                size='small'
                color={isOnline ? 'success' : 'secondary'}
              />
            )
          }
        }),
        columnHelper.accessor('roles', {
          header: 'Role',
          cell: ({ row }) => {
            const roles = row.original.roles || []
            if (roles.length === 0) return <Typography>—</Typography>
            
            const primaryRole = roles[0]
            const roleName = primaryRole.name
            const roleConfig = userRoleObj[roleName] || userRoleObj.subscriber
            
            return (
              <div className='flex items-center gap-2'>
                <Icon
                  className={roleConfig.icon}
                  sx={{ color: `var(--mui-palette-${roleConfig.color}-main)`, fontSize: '1.375rem' }}
                />
                <Typography className='capitalize' color='text.primary'>
                  {roleName}
                </Typography>
                {roles.length > 1 && (
                  <Chip label={`+${roles.length - 1}`} size='small' variant='outlined' />
                )}
              </div>
            )
          }
        }),
        columnHelper.accessor('administrator', {
          header: 'Administrator',
          cell: ({ row }) => {
            const admin = row.original.administrator
            return admin ? (
              <Chip label={admin.name || admin.email} size='small' color='primary' variant='tonal' />
            ) : (
              <Typography color='text.secondary'>—</Typography>
            )
          }
        }),
        columnHelper.accessor('created_at', {
          header: 'Registered',
          cell: ({ row }) => (
            <Typography>
              {new Date(row.original.created_at).toLocaleDateString()}
            </Typography>
          )
        }),
        columnHelper.accessor('platform', {
          header: 'Platform',
          cell: ({ row }) => (
            <Typography>{row.original.platform || '—'}</Typography>
          )
        }),
        columnHelper.accessor('location', {
          header: 'Location',
          cell: ({ row }) => (
            <Typography>{row.original.location || '—'}</Typography>
          )
        }),
        columnHelper.accessor('ip_address', {
          header: 'IP',
          cell: ({ row }) => (
            <Typography variant='body2'>{row.original.ip_address || '—'}</Typography>
          )
        })
      ]

      // Add Action column only for Moderators tab (activeTab === 0)
      if (activeTab === 0) {
        baseColumns.push(
          columnHelper.accessor('action', {
            header: 'Action',
            cell: ({ row }) => {
              const user = row.original
              return (
                <div className='flex items-center gap-1'>
                  {onSendTest && (
                    <IconButton
                      onClick={() => onSendTest(user.id)}
                      color='primary'
                      title='Send test task'
                    >
                      <i className='ri-send-plane-line text-textSecondary' />
                    </IconButton>
                  )}
                </div>
              )
            },
            enableSorting: false
          })
        )
      }

      return baseColumns
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, filteredData, activeTab, router, onSendTest]
  )

  const table = useReactTable({
    data: filteredData,
    columns,
    filterFns: {
      fuzzy: fuzzyFilter
    },
    state: {
      rowSelection,
      globalFilter
    },
    initialState: {
      pagination: {
        pageSize: 10
      }
    },
    enableRowSelection: true,
    globalFilterFn: fuzzyFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  return (
    <Card>
      <CardHeader title='Filters' />
      <TableFilters
        setData={setFilteredData}
        tableData={data}
        activeTab={activeTab}
      />
      <Divider />
      <div className='flex justify-between p-5 gap-4 flex-col items-start sm:flex-row sm:items-center'>
        <Button
          color='secondary'
          variant='outlined'
          startIcon={<i className='ri-upload-2-line text-xl' />}
          className='max-sm:is-full'
        >
          Export
        </Button>
        <div className='flex items-center gap-x-4 gap-4 flex-col max-sm:is-full sm:flex-row'>
          <DebouncedInput
            value={globalFilter ?? ''}
            onChange={value => setGlobalFilter(String(value))}
            placeholder='Search User'
            className='max-sm:is-full'
          />
        </div>
      </div>
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
          {table.getFilteredRowModel().rows.length === 0 ? (
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
                    <tr 
                      key={row.id} 
                      className={classnames({ selected: row.getIsSelected() })}
                      style={{
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s, background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.01)'
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)'
                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.02)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)'
                        e.currentTarget.style.boxShadow = 'none'
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
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
        rowsPerPageOptions={[10, 25, 50]}
        component='div'
        className='border-bs'
        count={table.getFilteredRowModel().rows.length}
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

export default UserListTable
