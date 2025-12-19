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
import OptionMenu from '@core/components/option-menu'

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

const ModeratorTaskListTable = ({ tableData, onStart, onComplete, onMessage }) => {
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
      pending: 'В очереди',
      in_progress: 'В работе',
      completed_by_moderator: 'Выполнен модератором',
      under_admin_review: 'На проверке у админа',
      approved: 'Принят',
      rejected: 'Отклонён',
      sent_for_revision: 'Отправлен на доп. проверку',
      cancelled: 'Отменён',
    }
    return labels[status] || status
  }

  const formatDeadline = (seconds) => {
    if (!seconds || seconds < 0) return 'Expired'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours}h ${minutes}m ${secs}s`
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
        cell: ({ row }) => (
          <Typography className='font-medium' color='text.primary'>
            {row.original.title || '—'}
          </Typography>
        )
      }),
      columnHelper.accessor('deadline_timer', {
        header: 'Deadline',
        cell: ({ row }) => (
          <Chip
            label={formatDeadline(row.original.deadline_timer)}
            color={row.original.deadline_timer && row.original.deadline_timer > 0 ? 'info' : 'error'}
            size='small'
            variant='outlined'
          />
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
      columnHelper.accessor('category', {
        header: 'Category',
        cell: ({ row }) => (
          <Typography>{row.original.category?.name || '—'}</Typography>
        )
      }),
      columnHelper.accessor('subgroup', {
        header: 'Subgroup',
        cell: ({ row }) => (
          <Typography variant='body2'>{row.original.subgroup || row.original.category?.name || '—'}</Typography>
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
      columnHelper.accessor('action', {
        header: 'Action',
        cell: ({ row }) => {
          const task = row.original
          const canStart = task.status === 'pending'
          const canComplete = task.status === 'in_progress'
          const canMessage = task.status === 'in_progress' || 
            task.status === 'under_admin_review' || 
            task.status === 'sent_for_revision'

          return (
            <div className='flex items-center'>
              {canStart && (
                <Button
                  size='small'
                  variant='contained'
                  onClick={() => onStart(task)}
                >
                  Start
                </Button>
              )}
              {canComplete && (
                <Button
                  size='small'
                  variant='contained'
                  color='success'
                  onClick={() => onComplete(task)}
                >
                  Complete
                </Button>
              )}
              {canMessage && (
                <IconButton
                  size='small'
                  onClick={() => onMessage(task)}
                  title='Message admin'
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
                      onClick: () => onComplete(task),
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
    [onStart, onComplete, onMessage]
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
      <CardContent className='flex justify-between max-sm:flex-col sm:items-center gap-4'>
        <DebouncedInput
          value={globalFilter ?? ''}
          onChange={value => setGlobalFilter(String(value))}
          placeholder='Search Task'
          className='sm:is-auto'
        />
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
        rowsPerPageOptions={[10, 25, 50, 100]}
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

export default ModeratorTaskListTable
