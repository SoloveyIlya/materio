'use client'

// React Imports
import { useEffect, useState, useMemo } from 'react'

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

const ToolsListTable = ({ tableData, onEdit, onDelete }) => {
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
      columnHelper.accessor('name', {
        header: 'Name',
        cell: ({ row }) => (
          <Typography className='font-medium' color='text.primary'>
            {row.original.name}
          </Typography>
        )
      }),
      columnHelper.accessor('description', {
        header: 'Description',
        cell: ({ row }) => (
          <Typography variant='body2'>{row.original.description || '—'}</Typography>
        )
      }),
      columnHelper.accessor('url', {
        header: 'URL',
        cell: ({ row }) => {
          const url = row.original.url
          return url ? (
            <Button
              startIcon={<i className='ri-links-line' />}
              href={url}
              target='_blank'
              size='small'
              variant='outlined'
            >
              Open
            </Button>
          ) : (
            <Typography variant='body2' color='text.secondary'>—</Typography>
          )
        }
      }),
      columnHelper.accessor('guide', {
        header: 'Guide',
        cell: ({ row }) => {
          const guide = row.original.guide
          return guide ? (
            <Chip label={guide.title} size='small' color='primary' variant='tonal' />
          ) : (
            <Typography variant='body2' color='text.secondary'>—</Typography>
          )
        }
      }),
      columnHelper.accessor('is_active', {
        header: 'Status',
        cell: ({ row }) => (
          <Chip
            label={row.original.is_active ? 'Active' : 'Inactive'}
            color={row.original.is_active ? 'success' : 'default'}
            variant='tonal'
            size='small'
          />
        )
      }),
      columnHelper.accessor('action', {
        header: 'Action',
        cell: ({ row }) => {
          const tool = row.original
          return (
            <div className='flex items-center'>
              <IconButton size='small' onClick={() => onEdit(tool)}>
                <i className='ri-edit-box-line text-textSecondary' />
              </IconButton>
              <IconButton size='small' color='error' onClick={() => onDelete(tool.id)}>
                <i className='ri-delete-bin-7-line text-textSecondary' />
              </IconButton>
              <OptionMenu
                iconButtonProps={{ size: 'medium' }}
                iconClassName='text-textSecondary'
                options={[
                  {
                    text: 'Edit',
                    icon: 'ri-edit-box-line',
                    menuItemProps: {
                      onClick: () => onEdit(tool),
                      className: 'flex items-center gap-2 text-textSecondary'
                    }
                  },
                  {
                    text: 'Delete',
                    icon: 'ri-delete-bin-7-line',
                    menuItemProps: {
                      onClick: () => onDelete(tool.id),
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
    [onEdit, onDelete]
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
          placeholder='Search Tool'
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

export default ToolsListTable
