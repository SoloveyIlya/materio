'use client'

// React Imports
import { useEffect, useState, useMemo } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Grid from '@mui/material/Grid'

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

const ActivityLogsTable = ({ tableData, filters, onFilterChange }) => {
  // States
  const [rowSelection, setRowSelection] = useState({})
  const [data, setData] = useState(tableData || [])
  const [filteredData, setFilteredData] = useState(data)
  const [globalFilter, setGlobalFilter] = useState('')

  useEffect(() => {
    setData(tableData || [])
    setFilteredData(tableData || [])
  }, [tableData])

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
      columnHelper.accessor('user', {
        header: 'User',
        cell: ({ row }) => {
          const user = row.original.user
          return (
            <Typography>
              {user?.name || user?.email || '—'}
            </Typography>
          )
        }
      }),
      columnHelper.accessor('action', {
        header: 'Action',
        cell: ({ row }) => (
          <Chip label={row.original.action} size='small' variant='tonal' />
        )
      }),
      columnHelper.accessor('event_type', {
        header: 'Event Type',
        cell: ({ row }) => (
          <Typography variant='body2'>{row.original.event_type || '—'}</Typography>
        )
      }),
      columnHelper.accessor('route', {
        header: 'Route',
        cell: ({ row }) => (
          <Typography variant='body2' className='font-mono text-xs'>
            {row.original.route || '—'}
          </Typography>
        )
      }),
      columnHelper.accessor('ip_address', {
        header: 'IP',
        cell: ({ row }) => (
          <Typography variant='body2' className='font-mono'>
            {row.original.ip_address || '—'}
          </Typography>
        )
      }),
      columnHelper.accessor('created_at', {
        header: 'Date',
        cell: ({ row }) => (
          <Typography variant='body2'>
            {new Date(row.original.created_at).toLocaleString()}
          </Typography>
        )
      })
    ],
    []
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
      <CardContent>
        <Grid container spacing={5}>
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField
              fullWidth
              label='Date From'
              type='date'
              value={filters?.date_from || ''}
              onChange={e => onFilterChange({ ...filters, date_from: e.target.value })}
              InputLabelProps={{ shrink: true }}
              size='small'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField
              fullWidth
              label='Date To'
              type='date'
              value={filters?.date_to || ''}
              onChange={e => onFilterChange({ ...filters, date_to: e.target.value })}
              InputLabelProps={{ shrink: true }}
              size='small'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControl fullWidth size='small'>
              <InputLabel>Event Type</InputLabel>
              <Select
                value={filters?.event_type || ''}
                label='Event Type'
                onChange={e => onFilterChange({ ...filters, event_type: e.target.value })}
              >
                <MenuItem value=''>All</MenuItem>
                <MenuItem value='page_view'>Page View</MenuItem>
                <MenuItem value='action'>Action</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <DebouncedInput
              value={globalFilter ?? ''}
              onChange={value => setGlobalFilter(String(value))}
              placeholder='Search...'
              fullWidth
            />
          </Grid>
        </Grid>
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

export default ActivityLogsTable
