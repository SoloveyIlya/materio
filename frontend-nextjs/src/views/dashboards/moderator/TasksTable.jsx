'use client'

// React Imports
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Checkbox from '@mui/material/Checkbox'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'

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
import api from '@/lib/api'

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

const TasksTable = () => {
  // States
  const [data, setData] = useState([])
  const [globalFilter, setGlobalFilter] = useState('')
  const router = useRouter()

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      const response = await api.get('/moderator/tasks?limit=10')
      const tasks = response.data?.data || response.data || []
      setData(tasks)
    } catch (error) {
      console.error('Error loading tasks:', error)
      setData([])
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
      under_admin_review: 'Under Review',
      approved: 'Approved',
      rejected: 'Rejected',
      sent_for_revision: 'Sent for Revision',
      cancelled: 'Cancelled',
    }
    return labels[status] || status
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })
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
      columnHelper.accessor('title', {
        header: 'TITLE',
        cell: ({ row }) => (
          <div className='flex flex-col gap-1'>
            <Typography className='font-medium' color='text.primary'>
              {row.original.title || '—'}
            </Typography>
            {row.original.description && (
              <Typography variant='body2' color='text.secondary'>
                {row.original.description.length > 50 
                  ? row.original.description.substring(0, 50) + '...' 
                  : row.original.description}
              </Typography>
            )}
          </div>
        )
      }),
      columnHelper.accessor('category', {
        header: 'CATEGORY',
        cell: ({ row }) => (
          <Typography variant='body2'>
            {row.original.category?.name || row.original.subgroup || '—'}
          </Typography>
        )
      }),
      columnHelper.accessor('price', {
        header: 'PRICE',
        cell: ({ row }) => (
          <Typography className='font-medium' color='text.primary'>
            ${row.original.price || '0.00'}
          </Typography>
        )
      }),
      columnHelper.accessor('created_at', {
        header: 'RECEIVED',
        cell: ({ row }) => (
          <Typography variant='body2'>
            {formatDate(row.original.created_at)}
          </Typography>
        )
      }),
      columnHelper.accessor('completed_at', {
        header: 'COMPLETED',
        cell: ({ row }) => (
          <Typography variant='body2'>
            {formatDate(row.original.completed_at)}
          </Typography>
        )
      }),
      columnHelper.accessor('status', {
        header: 'STATUS',
        cell: ({ row }) => (
          <Chip
            label={getStatusLabel(row.original.status)}
            color={getStatusColor(row.original.status)}
            size='small'
            variant='tonal'
          />
        )
      }),
      {
        id: 'action',
        header: 'ACTION',
        cell: ({ row }) => (
          <IconButton
            size='small'
            onClick={() => router.push(`/moderator/tasks/${row.original.id}`)}
          >
            <i className='ri-external-link-line' />
          </IconButton>
        )
      }
    ],
    [router]
  )

  const table = useReactTable({
    data: data,
    columns,
    filterFns: {
      fuzzy: fuzzyFilter
    },
    state: {
      globalFilter
    },
    initialState: {
      pagination: {
        pageSize: 5
      }
    },
    globalFilterFn: fuzzyFilter,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  return (
    <Card>
      <CardHeader
        title='Tasks'
        action={
          <DebouncedInput
            value={globalFilter ?? ''}
            onChange={value => setGlobalFilter(String(value))}
            placeholder='Search Tasks'
          />
        }
        className='flex-wrap gap-4'
      />
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
        rowsPerPageOptions={[5, 10, 25]}
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

export default TasksTable

