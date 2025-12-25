'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardHeader,
  CardContent, 
  CardMedia,
  Chip, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  Paper,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Alert,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Checkbox,
  InputAdornment
} from '@mui/material'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
import api from '@/lib/api'
import { API_URL } from '@/lib/api'
import CustomAvatar from '@core/components/mui/Avatar'
import CustomTabList from '@/@core/components/mui/TabList'
import classnames from 'classnames'

export default function AdminTaskViewPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.id
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [activeTab, setActiveTab] = useState(0) // 0 = Task, 1 = Report
  const [activeReportSection, setActiveReportSection] = useState('store_details') // Для навигации в Report
  const [selectedTool, setSelectedTool] = useState(null) // Для выбранного инструмента
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false)
  const [revisionComment, setRevisionComment] = useState('')

  useEffect(() => {
    if (taskId) {
      loadTask()
    }
  }, [taskId])

  const loadTask = async () => {
    try {
      const response = await api.get(`/admin/tasks/${taskId}`)
      setTask(response.data)
    } catch (error) {
      console.error('Error loading task:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl)
    setImageDialogOpen(true)
  }

  const handleApprove = async () => {
    try {
      await api.post(`/admin/tasks/${taskId}/moderate`, {
        action: 'approve'
      })
      await loadTask()
    } catch (error) {
      console.error('Error approving task:', error)
    }
  }

  const handleReject = async () => {
    try {
      await api.post(`/admin/tasks/${taskId}/moderate`, {
        action: 'reject'
      })
      await loadTask()
    } catch (error) {
      console.error('Error rejecting task:', error)
    }
  }

  const handleSendForRevision = async () => {
    try {
      await api.post(`/admin/tasks/${taskId}/moderate`, {
        action: 'revision',
        comment: revisionComment
      })
      setRevisionDialogOpen(false)
      setRevisionComment('')
      await loadTask()
    } catch (error) {
      console.error('Error sending task for revision:', error)
    }
  }

  const handleOpenRevisionDialog = () => {
    setRevisionDialogOpen(true)
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

  if (loading) {
    return <Box sx={{ p: 6 }}>Loading...</Box>
  }

  if (!task) {
    return <Box sx={{ p: 6 }}>Task not found</Box>
  }

  const images = []
  if (task.document_image) {
    images.push(task.document_image.startsWith('http') ? task.document_image : `${API_URL}/storage/${task.document_image}`)
  }
  if (task.selfie_image) {
    images.push(task.selfie_image.startsWith('http') ? task.selfie_image : `${API_URL}/storage/${task.selfie_image}`)
  }

  // Получаем список инструментов (может быть task.tools или task.tool)
  const tools = task.tools || (task.tool ? [task.tool] : [])

  // Получаем данные для выбранного инструмента из результата
  const getToolData = (toolId) => {
    if (!task.result?.tool_data || !Array.isArray(task.result.tool_data)) return null
    return task.result.tool_data.find(td => td.tool_id === toolId)
  }

  // Функция для получения URL изображения
  const getImageUrl = (path) => {
    if (!path) return ''
    if (path.startsWith('http')) return path
    if (path.startsWith('/storage')) return `${API_URL}${path}`
    return `${API_URL}/storage/${path}`
  }

  // Рендер контента для Report
  const renderReportContent = () => {
    if (selectedTool) {
      // Показываем данные по выбранному инструменту
      const toolData = getToolData(selectedTool.id)
      return (
        <Card>
          <CardContent>
            <Typography variant='h5' gutterBottom>{selectedTool.name}</Typography>
            {toolData ? (
              <>
                {toolData.description && (
                  <Box sx={{ mt: 2, mb: 2 }}>
                    <Typography variant='body1' sx={{ whiteSpace: 'pre-wrap' }}>
                      {toolData.description}
                    </Typography>
                  </Box>
                )}
                {toolData.images && Array.isArray(toolData.images) && toolData.images.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant='h6' gutterBottom>Images</Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
                      {toolData.images.map((img, index) => {
                        const imageUrl = getImageUrl(typeof img === 'string' ? img : img.url || img.path)
                        return (
                          <Box
                            key={index}
                            onClick={() => handleImageClick(imageUrl)}
                            sx={{
                              width: 200,
                              height: 200,
                              cursor: 'pointer',
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1,
                              overflow: 'hidden',
                              '&:hover': { opacity: 0.8 }
                            }}
                          >
                            <img
                              src={imageUrl}
                              alt={`Tool image ${index + 1}`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </Box>
                        )
                      })}
                    </Box>
                  </Box>
                )}
              </>
            ) : (
              <Typography color='text.secondary' sx={{ mt: 2 }}>
                No data provided for this tool yet.
              </Typography>
            )}
          </CardContent>
        </Card>
      )
    }

    // Различные секции отчета с использованием шаблона eCommerce settings
    switch (activeReportSection) {
      case 'store_details':
        return (
          <Grid container spacing={6}>
            {/* Profile */}
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardHeader title='Profile' />
                <CardContent>
                  <Grid container spacing={5}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField fullWidth label='Store name' placeholder='ABCD' defaultValue={task.first_name && task.last_name ? `${task.first_name} ${task.last_name}` : task.title || ''} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField fullWidth label='Phone' placeholder='+(123) 456-7890' defaultValue={task.phone_number || ''} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField fullWidth label='Store contact email' placeholder='johndoe@email.com' defaultValue={task.email || ''} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField fullWidth label='Sender email' placeholder='johndoe@email.com' defaultValue={task.email || ''} />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Billing Information */}
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardHeader title='Billing Information' />
                <CardContent>
                  <Grid container spacing={5}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField fullWidth label='Legal business name' placeholder='Pixinvent' defaultValue={task.first_name && task.last_name ? `${task.first_name} ${task.last_name}` : ''} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <FormControl fullWidth>
                        <InputLabel>Country*</InputLabel>
                        <Select label='Country*' name='country' variant='outlined' value={task.country || ''}>
                          <MenuItem value='India'>India</MenuItem>
                          <MenuItem value='Canada'>Canada</MenuItem>
                          <MenuItem value='UK'>UK</MenuItem>
                          <MenuItem value='United States'>United States</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField fullWidth label='Address' placeholder='126, New Street' defaultValue={task.address || ''} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField fullWidth label='Apartment,suit, etc.' placeholder='Empire Heights' />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField fullWidth label='City' placeholder='New York' />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField fullWidth label='State' placeholder='New York' />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField fullWidth type='number' label='PIN Code' placeholder='111011' />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Time Zone */}
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardHeader title='Time zone and units of measurement' subheader='Used to calculate product prices, shipping weights, and order times.' />
                <CardContent>
                  <Grid container spacing={5}>
                    <Grid size={{ xs: 12 }}>
                      <FormControl fullWidth>
                        <InputLabel>Time zone</InputLabel>
                        <Select label='Time zone' name='timezone' variant='outlined' value=''>
                          <MenuItem value='International Date Line West'>(UTC-12:00) International Date Line West</MenuItem>
                          <MenuItem value='Coordinated Universal Time-11'>(UTC-11:00) Coordinated Universal Time-11</MenuItem>
                          <MenuItem value='Alaska'>(UTC-09:00) Alaska</MenuItem>
                          <MenuItem value='Baja California'>(UTC-08:00) Baja California</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <FormControl fullWidth>
                        <InputLabel>Unit system</InputLabel>
                        <Select label='Unit system' name='unit' variant='outlined' value=''>
                          <MenuItem value='Metric System'>Metric System</MenuItem>
                          <MenuItem value='Imperial'>Imperial</MenuItem>
                          <MenuItem value='International System'>International System</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <FormControl fullWidth>
                        <InputLabel>Default weight unit</InputLabel>
                        <Select label='Default weight unit' name='default' variant='outlined' value=''>
                          <MenuItem value='Kilogram'>Kilogram</MenuItem>
                          <MenuItem value='Pounds'>Pounds</MenuItem>
                          <MenuItem value='Gram'>Gram</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Store Currency */}
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardHeader title='Store currency' subheader='The currency your products are sold in.' />
                <CardContent>
                  <FormControl fullWidth>
                    <InputLabel>Store currency</InputLabel>
                    <Select label='Store currency' name='store-currency' variant='outlined' value='USD'>
                      <MenuItem value='USD'>USD</MenuItem>
                      <MenuItem value='INR'>INR</MenuItem>
                      <MenuItem value='Euro'>Euro</MenuItem>
                      <MenuItem value='Pound'>Pound</MenuItem>
                    </Select>
                  </FormControl>
                </CardContent>
              </Card>
            </Grid>

            {/* Order ID Format */}
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardHeader title='Order id format' subheader='Shown on the Orders page, customer pages, and customer order notifications to identify orders.' />
                <CardContent>
                  <Grid container spacing={5}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label='Prefix'
                        defaultValue='#'
                        slotProps={{
                          input: {
                            startAdornment: <InputAdornment position='start'>#</InputAdornment>
                          }
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label='Suffix'
                        slotProps={{
                          input: {
                            endAdornment: <InputAdornment position='end'>#</InputAdornment>
                          }
                        }}
                      />
                    </Grid>
                  </Grid>
                  <Typography className='mbs-2'>Your order ID will appear as #1001, #1002, #1003 ...</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )

      case 'payments':
        return (
          <Grid container spacing={6}>
            {/* Payment Providers */}
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardHeader title='Payment providers' />
                <CardContent>
                  <Typography className='mbe-5'>
                    Providers that enable you to accept payment methods at a rate set by the third-party. An additional fee will
                    apply to new orders once you select a plan.
                  </Typography>
                  <Button variant='outlined'>Choose A Provider</Button>
                </CardContent>
              </Card>
            </Grid>

            {/* Supported Payment Methods */}
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardHeader
                  title='Supported payment methods'
                  subheader={`Payment methods that are available with one of Vuexy's approved payment providers.`}
                />
                <CardContent className='flex flex-col items-start gap-5'>
                  <Typography className='font-medium' color='text.primary'>
                    Default
                  </Typography>
                  <div className='bg-actionHover rounded is-full p-5'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center justify-center rounded bg-white shadow-sm min-is-[58px] min-bs-[37px]'>
                        <img src='/images/apps/ecommerce/paypal.png' height={25} alt='PayPal' />
                      </div>
                      <Typography component='a' href='#' color='primary.main' className='font-medium'>
                        Activate PayPal
                      </Typography>
                    </div>
                    <Divider className='mlb-6' />
                    <Grid container spacing={6}>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <div>
                          <Typography variant='body2' className='mbe-2'>
                            Provider
                          </Typography>
                          <Typography className='font-medium' color='text.primary'>
                            Paypal
                          </Typography>
                        </div>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <div>
                          <Typography variant='body2' className='mbe-2'>
                            Status
                          </Typography>
                          <Chip variant='tonal' size='small' label='Inactive' color='warning' />
                        </div>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <div>
                          <Typography variant='body2' className='mbe-2'>
                            Transaction Fee
                          </Typography>
                          <Typography className='font-medium' color='text.primary'>
                            2.99%
                          </Typography>
                        </div>
                      </Grid>
                    </Grid>
                  </div>
                  <Button variant='outlined'>Add Payment Methods</Button>
                </CardContent>
              </Card>
            </Grid>

            {/* Manual Payment Methods */}
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardHeader title='Manual payment methods' />
                <CardContent>
                  <Typography className='mbe-5'>
                    Payments that are made outside your online store. When a customer selects a manual payment method such as cash
                    on delivery, you&apos;ll need to approve their order before it can be fulfilled.
                  </Typography>
                  <Button variant='outlined'>Add Manual Payment Method</Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )

      case 'checkout':
        return (
          <Grid container spacing={6}>
            {/* Customer Contact */}
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardHeader title='Customer contact method' subheader='Select what contact method customers use to check out.' />
                <CardContent>
                  <RadioGroup
                    defaultValue='phone'
                    aria-labelledby='method-radio-buttons-group'
                    className='items-start mbe-4'
                  >
                    <FormControlLabel value='phone' control={<Radio />} label='Phone number' />
                    <FormControlLabel value='email' control={<Radio />} label='Email' />
                  </RadioGroup>
                  <Alert severity='warning' icon={<i className='ri-information-line' />} className='font-medium text-lg'>
                    To send SMS updates, you need to install an SMS App.
                  </Alert>
                </CardContent>
              </Card>
            </Grid>

            {/* Customer Information */}
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardHeader title='Customer information' />
                <CardContent className='flex flex-col gap-4'>
                  <div>
                    <FormLabel id='name-radio-buttons-group-label'>Full name</FormLabel>
                    <RadioGroup defaultValue='last-name' aria-labelledby='name-radio-buttons-group' className='items-start'>
                      <FormControlLabel value='last-name' control={<Radio />} label='Only require last name' />
                      <FormControlLabel value='first-last-name' control={<Radio />} label='Require first and last name' />
                    </RadioGroup>
                  </div>
                  <div>
                    <FormLabel id='company-radio-buttons-group-label'>Company name</FormLabel>
                    <RadioGroup defaultValue='dont' aria-labelledby='company-radio-buttons-group' className='items-start'>
                      <FormControlLabel value='dont' control={<Radio />} label="Don't include" />
                      <FormControlLabel value='optional' control={<Radio />} label='Optional' />
                      <FormControlLabel value='required' control={<Radio />} label='Required' />
                    </RadioGroup>
                  </div>
                  <div>
                    <FormLabel id='address-radio-buttons-group-label'>Address line 2 (apartment, unit, etc.)</FormLabel>
                    <RadioGroup defaultValue='dont' aria-labelledby='address-radio-buttons-group' className='items-start'>
                      <FormControlLabel value='dont' control={<Radio />} label="Don't include" />
                      <FormControlLabel value='optional' control={<Radio />} label='Optional' />
                      <FormControlLabel value='required' control={<Radio />} label='Required' />
                    </RadioGroup>
                  </div>
                  <div>
                    <FormLabel id='shipping-radio-buttons-group-label'>Shipping address phone number</FormLabel>
                    <RadioGroup defaultValue='dont' aria-labelledby='shipping-radio-buttons-group' className='items-start'>
                      <FormControlLabel value='dont' control={<Radio />} label="Don't include" />
                      <FormControlLabel value='optional' control={<Radio />} label='Optional' />
                      <FormControlLabel value='required' control={<Radio />} label='Required' />
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )

      case 'shipping_delivery':
        const domesticTableData = [
          { rate: 'Weight', condition: '5Kg-10Kg', price: '$9' },
          { rate: 'VAT', condition: '12%', price: '$25' },
          { rate: 'Duty', condition: '-', price: '-' }
        ]

        const internationalTableData = [
          { rate: 'Weight', condition: '5Kg-10Kg', price: '$19' },
          { rate: 'VAT', condition: '12%', price: '$25' },
          { rate: 'Duty', condition: 'Japan', price: '$49' }
        ]

        const ShippingRateCard = ({ title, avatar, data }) => {
          return (
            <div className='flex flex-col items-start gap-4'>
              <div className='flex items-center gap-2 is-full'>
                <CustomAvatar src={avatar} size={34} />
                <div className='flex-auto'>
                  <Typography className='font-medium' color='text.primary'>
                    {title}
                  </Typography>
                  <Typography variant='body2'>{task.country || 'United states of America'}</Typography>
                </div>
                <IconButton size='small'>
                  <i className='ri-pencil-line' />
                </IconButton>
                <IconButton size='small'>
                  <i className='ri-delete-bin-7-line' />
                </IconButton>
              </div>
              <div className='is-full border rounded overflow-x-auto'>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(var(--mui-palette-dividerChannel) / 0.12)' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Rate Name</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Condition</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Price</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, width: '100px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid rgba(var(--mui-palette-dividerChannel) / 0.12)' }}>
                        <td style={{ padding: '12px' }}>{row.rate}</td>
                        <td style={{ padding: '12px' }}>{row.condition}</td>
                        <td style={{ padding: '12px' }}>{row.price}</td>
                        <td style={{ padding: '12px', width: '100px' }}>
                          <IconButton size='small'>
                            <i className='ri-more-2-line text-textSecondary' />
                          </IconButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button variant='outlined' size='small'>
                Add Rate
              </Button>
            </div>
          )
        }

        return (
          <Card>
            <CardHeader
              title='Shipping zones'
              subheader='Choose where you ship and how much you charge for shipping at checkout.'
              className='gap-2'
              action={
                <Typography component='a' href='#' color='primary.main' className='font-medium'>
                  Create zone
                </Typography>
              }
              sx={{ '& .MuiCardHeader-action': { alignSelf: 'center' } }}
            />
            <CardContent className='flex flex-col gap-6'>
              <ShippingRateCard title='Domestic' avatar='/images/avatars/1.png' data={domesticTableData} />
              <ShippingRateCard title='International' avatar='/images/cards/us.png' data={internationalTableData} />
            </CardContent>
          </Card>
        )

      case 'locations':
        return (
          <Grid container spacing={6}>
            {/* Location Name */}
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardHeader title='Location Name' />
                <CardContent className='flex flex-col items-start gap-4'>
                  <TextField fullWidth label='Location Name' placeholder='Empire Hub' defaultValue={task.address || ''} />
                  <FormControlLabel control={<Checkbox defaultChecked />} label='Fulfill online orders from this location' />
                  <Alert severity='info' icon={<i className='ri-information-line' />} className='font-medium text-lg'>
                    This is your default location. To change whether you fulfill online orders from this location, select another
                    default location first.
                  </Alert>
                </CardContent>
              </Card>
            </Grid>

            {/* Address */}
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardHeader title='Address' />
                <CardContent className='flex flex-col gap-4'>
                  <Grid container spacing={5}>
                    <Grid size={{ xs: 12 }}>
                      <FormControl fullWidth>
                        <InputLabel>Country/Region</InputLabel>
                        <Select label='Country/Region' value={task.country || ''}>
                          <MenuItem value='United States'>United States</MenuItem>
                          <MenuItem value='UK'>UK</MenuItem>
                          <MenuItem value='Canada'>Canada</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField fullWidth label='Address' placeholder='123, New Street' defaultValue={task.address || ''} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField fullWidth label='Apartment, suite, etc.' placeholder='Empire Heights' />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField fullWidth label='Phone' placeholder='+1 (234) 456-7890' defaultValue={task.phone_number || ''} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField fullWidth label='City' placeholder='New York' />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField fullWidth label='State' placeholder='New York' />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField fullWidth type='number' label='PIN code' placeholder='123897' />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )

      case 'notifications':
        const customerData = [
          { type: 'New customer sign up', email: true, app: false },
          { type: 'Customer account password reset', email: false, app: true },
          { type: 'Customer account invite', email: false, app: false }
        ]

        const shippingData = [
          { type: 'Picked up', email: true, app: false },
          { type: 'Shipping update ', email: false, app: true },
          { type: 'Delivered', email: false, app: false }
        ]

        const ordersData = [
          { type: 'Order purchase', email: true, app: false },
          { type: 'Order cancelled', email: false, app: true },
          { type: 'Order refund request', email: false, app: false },
          { type: 'Order confirmation', email: false, app: true },
          { type: 'Payment error', email: false, app: true }
        ]

        const TableCard = ({ title, data }) => {
          return (
            <div className='flex flex-col gap-4'>
              <Typography variant='h5'>{title}</Typography>
              <div className='border rounded overflow-x-auto'>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(var(--mui-palette-dividerChannel) / 0.12)' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, width: '50%' }}>Type</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, width: '25%' }}>Email</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, width: '25%' }}>App</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid rgba(var(--mui-palette-dividerChannel) / 0.12)' }}>
                        <td style={{ padding: '12px', color: 'var(--mui-palette-text-primary)' }}>{row.type}</td>
                        <td style={{ padding: '12px' }}>
                          <Checkbox defaultChecked={row.email} />
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Checkbox defaultChecked={row.app} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        }

        return (
          <Card>
            <CardContent className='flex flex-col gap-6'>
              <TableCard title='Customer' data={customerData} />
              <TableCard title='Orders' data={ordersData} />
              <TableCard title='Shipping' data={shippingData} />
            </CardContent>
          </Card>
        )

      default:
        return (
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>Content</Typography>
              <Typography color='text.secondary' sx={{ mt: 2 }}>Please select a section from the navigation</Typography>
            </CardContent>
          </Card>
        )
    }
  }

  return (
    <Box sx={{ p: 6 }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          variant='outlined'
          startIcon={<i className='ri-arrow-left-line' />}
          onClick={() => router.back()}
        >
          Back
        </Button>
      </Box>

      {/* Header Section - баннер, аватар, имя, кнопки в стиле шаблона */}
      <Card sx={{ mb: 4, overflow: 'hidden' }}>
        <CardMedia 
          image='/images/pages/profile-banner.png'
          sx={{ 
            height: 250,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <CardContent className='flex gap-6 justify-center flex-col items-center md:items-end md:flex-row !pt-0 md:justify-start'>
          <div className='flex rounded-bs-md mbs-[-45px] border-[5px] border-backgroundPaper bg-backgroundPaper'>
            <CustomAvatar 
              src={task.assigned_user?.avatar}
              sx={{ width: 120, height: 120 }}
            >
              {task.assigned_user?.name ? task.assigned_user.name.charAt(0).toUpperCase() : 'M'}
            </CustomAvatar>
          </div>
          <div className='flex is-full flex-wrap justify-center flex-col items-center sm:flex-row sm:justify-between sm:items-end gap-5'>
                  <div className='flex flex-col items-center sm:items-start gap-2'>
                    <Typography variant='h4'>{task.assigned_user?.name || task.assigned_user?.email || 'Moderator'}</Typography>
                  </div>
                  <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', sm: { justifyContent: 'flex-end' } }}>
                    <Chip 
                      label={getStatusLabel(task.status)} 
                      color={getStatusColor(task.status)}
                      size='medium'
                      variant='tonal'
                    />
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                      <Button 
                        variant='contained' 
                        color='success'
                        onClick={handleApprove}
                        disabled={task.status === 'approved' || task.status === 'rejected'}
                        startIcon={<i className='ri-check-line' />}
                      >
                        Approve
                      </Button>
                      <Button 
                        variant='contained' 
                        color='error'
                        onClick={handleReject}
                        disabled={task.status === 'approved' || task.status === 'rejected'}
                        startIcon={<i className='ri-close-line' />}
                      >
                        Reject
                      </Button>
                      <Button 
                        variant='contained' 
                        color='warning'
                        onClick={handleOpenRevisionDialog}
                        disabled={task.status === 'approved' || task.status === 'rejected'}
                        startIcon={<i className='ri-send-plane-line' />}
                      >
                        Send for Revision
                      </Button>
                    </Box>
                  </Box>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <TabContext value={activeTab.toString()}>
        <Box sx={{ mb: 4 }}>
          <CustomTabList onChange={(e, newValue) => setActiveTab(parseInt(newValue))} variant='scrollable' pill='true'>
            <Tab
              label={
                <div className='flex items-center gap-1.5'>
                  <i className='ri-task-line text-lg' />
                  Task
                </div>
              }
              value='0'
            />
            <Tab
              label={
                <div className='flex items-center gap-1.5'>
                  <i className='ri-file-text-line text-lg' />
                  Report
                </div>
              }
              value='1'
            />
          </CustomTabList>
        </Box>

      {/* Tab: Task */}
      <TabPanel value='0' className='p-0'>
        <Grid container spacing={6}>
          {/* Left Side - Task Info в стиле user profile AboutOverview */}
          <Grid size={{ xs: 12, md: 5, lg: 4 }}>
            <Grid container spacing={6}>
              {/* About Card */}
              <Grid size={{ xs: 12 }}>
                <Card>
                  <CardContent className='flex flex-col gap-6'>
                    <div className='flex flex-col gap-4'>
                      <Typography variant='caption' className='uppercase'>
                        About
                      </Typography>
                      {task.first_name && (
                        <div className='flex items-center gap-2'>
                          <i className='ri-user-line text-textSecondary' />
                          <div className='flex items-center flex-wrap gap-2'>
                            <Typography className='font-medium'>First name:</Typography>
                            <Typography>{task.first_name}</Typography>
                          </div>
                        </div>
                      )}
                      {task.last_name && (
                        <div className='flex items-center gap-2'>
                          <i className='ri-user-line text-textSecondary' />
                          <div className='flex items-center flex-wrap gap-2'>
                            <Typography className='font-medium'>Last name:</Typography>
                            <Typography>{task.last_name}</Typography>
                          </div>
                        </div>
                      )}
                      {task.date_of_birth && (
                        <div className='flex items-center gap-2'>
                          <i className='ri-calendar-line text-textSecondary' />
                          <div className='flex items-center flex-wrap gap-2'>
                            <Typography className='font-medium'>Date of birth:</Typography>
                            <Typography>{new Date(task.date_of_birth).toLocaleDateString()}</Typography>
                          </div>
                        </div>
                      )}
                      {task.country && (
                        <div className='flex items-center gap-2'>
                          <i className='ri-map-pin-line text-textSecondary' />
                          <div className='flex items-center flex-wrap gap-2'>
                            <Typography className='font-medium'>Country:</Typography>
                            <Typography>{task.country}</Typography>
                          </div>
                        </div>
                      )}
                      {task.address && (
                        <div className='flex items-center gap-2'>
                          <i className='ri-community-line text-textSecondary' />
                          <div className='flex items-center flex-wrap gap-2'>
                            <Typography className='font-medium'>Language:</Typography>
                            <Typography>{task.address}</Typography>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className='flex flex-col gap-4'>
                      <Typography variant='caption' className='uppercase'>
                        Contacts
                      </Typography>
                      {task.phone_number && (
                        <div className='flex items-center gap-2'>
                          <i className='ri-phone-line text-textSecondary' />
                          <div className='flex items-center flex-wrap gap-2'>
                            <Typography className='font-medium'>Phone number:</Typography>
                            <Typography>{task.phone_number}</Typography>
                          </div>
                        </div>
                      )}
                      {task.email && (
                        <div className='flex items-center gap-2'>
                          <i className='ri-mail-line text-textSecondary' />
                          <div className='flex items-center flex-wrap gap-2'>
                            <Typography className='font-medium'>Email:</Typography>
                            <Typography>{task.email}</Typography>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Grid>

            </Grid>
          </Grid>

          {/* Right Side - Additional Info */}
          <Grid size={{ xs: 12, lg: 8, md: 7 }}>
            <Grid container spacing={6}>
              {/* Additional Materials */}
              <Grid size={{ xs: 12 }}>
                <Card>
                  <CardContent>
                    <Typography variant='h6' gutterBottom sx={{ mb: 4 }}>Additional Materials</Typography>
                    
                    <Box sx={{ position: 'relative', pl: 2 }}>
                      {/* Documentation Section */}
                      {task.documentation && (
                        <Box sx={{ mb: 4, position: 'relative' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  bgcolor: '#4CAF50',
                                  flexShrink: 0,
                                  zIndex: 2
                                }}
                              />
                              {(() => {
                                const hasNextSections = (task.result?.admin_comment && task.status === 'sent_for_revision') || 
                                                       task.result?.moderator_comment || 
                                                       task.result?.answers;
                                if (!hasNextSections) return null;
                                
                                let height = 60; // Base height
                                if (task.result?.admin_comment && task.status === 'sent_for_revision') height += 40;
                                if (task.result?.moderator_comment) height += 40;
                                if (task.result?.answers) height += 40;
                                
                                return (
                                  <Box
                                    sx={{
                                      position: 'absolute',
                                      left: 5,
                                      top: 12,
                                      width: 2,
                                      height: height,
                                      bgcolor: '#E0E0E0',
                                      zIndex: 1
                                    }}
                                  />
                                );
                              })()}
                            </Box>
                            <Typography 
                              variant='h6' 
                              sx={{ 
                                fontWeight: 700, 
                                color: '#000',
                                fontSize: '1.1rem'
                              }}
                            >
                              Документация
                            </Typography>
                          </Box>
                          <Box sx={{ pl: 4, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <i className='ri-file-text-line' style={{ fontSize: '20px', color: '#4CAF50' }} />
                              <Typography variant='body1'>{task.documentation.title}</Typography>
                            </Box>
                          </Box>
                        </Box>
                      )}

                      {/* Tools Section */}
                      {tools.length > 0 && (
                        <Box sx={{ mb: 4, position: 'relative' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  bgcolor: '#2196F3',
                                  flexShrink: 0,
                                  zIndex: 2
                                }}
                              />
                              {(() => {
                                const hasNextSections = (task.result?.admin_comment && task.status === 'sent_for_revision') || 
                                                       task.result?.moderator_comment || 
                                                       task.result?.answers;
                                if (!hasNextSections) return null;
                                
                                let height = 60; // Base height
                                if (task.result?.admin_comment && task.status === 'sent_for_revision') height += 40;
                                if (task.result?.moderator_comment) height += 40;
                                if (task.result?.answers) height += 40;
                                
                                return (
                                  <Box
                                    sx={{
                                      position: 'absolute',
                                      left: 5,
                                      top: 12,
                                      width: 2,
                                      height: height,
                                      bgcolor: '#E0E0E0',
                                      zIndex: 1
                                    }}
                                  />
                                );
                              })()}
                            </Box>
                            <Typography 
                              variant='h6' 
                              sx={{ 
                                fontWeight: 700, 
                                color: '#000',
                                fontSize: '1.1rem'
                              }}
                            >
                              Тулз
                            </Typography>
                          </Box>
                          <Box sx={{ pl: 4, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {tools.map((tool, index) => (
                              <Box key={tool.id || index} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <i className='ri-tools-line' style={{ fontSize: '20px', color: '#2196F3' }} />
                                <Typography variant='body1'>{tool.name}</Typography>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      )}

                      {/* Revision Section */}
                      {task.result?.admin_comment && task.status === 'sent_for_revision' && (
                        <Box sx={{ mb: 4, position: 'relative' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  bgcolor: '#FF9800',
                                  flexShrink: 0,
                                  zIndex: 2
                                }}
                              />
                              {(task.result?.moderator_comment || task.result?.answers) && (
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    left: 5,
                                    top: 12,
                                    width: 2,
                                    height: task.result?.moderator_comment && task.result?.answers ? 100 : 60,
                                    bgcolor: '#E0E0E0',
                                    zIndex: 1
                                  }}
                                />
                              )}
                            </Box>
                            <Typography 
                              variant='h6' 
                              sx={{ 
                                fontWeight: 700, 
                                color: '#000',
                                fontSize: '1.1rem'
                              }}
                            >
                              Отправка на исправление
                            </Typography>
                          </Box>
                          <Box sx={{ pl: 4, mt: 1 }}>
                            <Typography variant='body2' sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                              {task.result.admin_comment}
                            </Typography>
                          </Box>
                        </Box>
                      )}

                      {/* Moderator Comment Section */}
                      {task.result?.moderator_comment && (
                        <Box sx={{ mb: 4, position: 'relative' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  bgcolor: '#9C27B0',
                                  flexShrink: 0,
                                  zIndex: 2
                                }}
                              />
                              {task.result?.answers && (
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    left: 5,
                                    top: 12,
                                    width: 2,
                                    height: 60,
                                    bgcolor: '#E0E0E0',
                                    zIndex: 1
                                  }}
                                />
                              )}
                            </Box>
                            <Typography 
                              variant='h6' 
                              sx={{ 
                                fontWeight: 700, 
                                color: '#000',
                                fontSize: '1.1rem'
                              }}
                            >
                              Moderator Comment
                            </Typography>
                          </Box>
                          <Box sx={{ pl: 4, mt: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                              <i className='ri-message-3-line' style={{ fontSize: '20px', color: '#9C27B0', marginTop: '2px' }} />
                              <Typography variant='body2' sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                                {task.result.moderator_comment}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      )}

                      {/* Answers Section */}
                      {task.result?.answers && (
                        <Box sx={{ position: 'relative' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                bgcolor: '#3F51B5',
                                flexShrink: 0
                              }}
                            />
                            <Typography 
                              variant='h6' 
                              sx={{ 
                                fontWeight: 700, 
                                color: '#000',
                                fontSize: '1.1rem'
                              }}
                            >
                              Answers
                            </Typography>
                          </Box>
                          <Box sx={{ pl: 4, mt: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                              <i className='ri-question-answer-line' style={{ fontSize: '20px', color: '#3F51B5', marginTop: '2px' }} />
                              <Typography 
                                variant='body2' 
                                sx={{ 
                                  whiteSpace: 'pre-wrap', 
                                  bgcolor: 'action.hover', 
                                  p: 2, 
                                  borderRadius: 1,
                                  color: 'text.secondary',
                                  lineHeight: 1.7,
                                  flex: 1
                                }}
                              >
                                {typeof task.result.answers === 'object' 
                                  ? JSON.stringify(task.result.answers, null, 2)
                                  : task.result.answers}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Images */}
              {images.length > 0 && (
                <Grid size={{ xs: 12 }}>
                  <Card>
                    <CardContent>
                      <Typography variant='h6' gutterBottom>Images</Typography>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
                        {images.map((imageUrl, index) => (
                          <Box
                            key={index}
                            onClick={() => handleImageClick(imageUrl)}
                            sx={{
                              width: 150,
                              height: 150,
                              cursor: 'pointer',
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1,
                              overflow: 'hidden',
                              '&:hover': {
                                opacity: 0.8,
                              },
                            }}
                          >
                            <img
                              src={imageUrl}
                              alt={`Image ${index + 1}`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Screenshots from result */}
              {task.result?.screenshots && Array.isArray(task.result.screenshots) && task.result.screenshots.length > 0 && (
                <Grid size={{ xs: 12 }}>
                  <Card>
                    <CardContent>
                      <Typography variant='h6' gutterBottom>Screenshots</Typography>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
                        {task.result.screenshots.map((screenshot, index) => {
                          const imageUrl = typeof screenshot === 'string' 
                            ? getImageUrl(screenshot)
                            : getImageUrl(screenshot.url || screenshot.path)
                          return (
                            <Box
                              key={index}
                              onClick={() => handleImageClick(imageUrl)}
                              sx={{
                                width: 150,
                                height: 150,
                                cursor: 'pointer',
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                overflow: 'hidden',
                                '&:hover': {
                                  opacity: 0.8,
                                },
                              }}
                            >
                              <img
                                src={imageUrl}
                                alt={`Screenshot ${index + 1}`}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </Box>
                          )
                        })}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Attachments from result */}
              {task.result?.attachments && Array.isArray(task.result.attachments) && task.result.attachments.length > 0 && (
                <Grid size={{ xs: 12 }}>
                  <Card>
                    <CardContent>
                      <Typography variant='h6' gutterBottom>Attachments</Typography>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
                        {task.result.attachments.map((attachment, index) => {
                          const fileUrl = typeof attachment === 'string'
                            ? getImageUrl(attachment)
                            : getImageUrl(attachment.url || attachment.path)
                          return (
                            <Button
                              key={index}
                              variant="outlined"
                              startIcon={<i className='ri-file-line' />}
                              href={fileUrl}
                              target="_blank"
                            >
                              Attachment {index + 1}
                            </Button>
                          )
                        })}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab: Report */}
      <TabPanel value='1' className='p-0'>
        <Box>

          {/* Report Content - две колонки */}
          <Grid container spacing={4}>
            {/* Left Column - Navigation */}
            <Grid size={{ xs: 12, md: 4, lg: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant='h6' gutterBottom sx={{ mb: 3 }}>Navigation</Typography>
                  <List className='gap-2'>
                    <ListItem disablePadding className='mbe-1'>
                      <ListItemButton 
                        selected={activeReportSection === 'store_details' && !selectedTool}
                        onClick={() => {
                          setActiveReportSection('store_details')
                          setSelectedTool(null)
                        }}
                        className={classnames({
                          'bg-primaryLightOpacity': activeReportSection === 'store_details' && !selectedTool
                        })}
                      >
                        <ListItemIcon>
                          <i className='ri-store-line text-xl' />
                        </ListItemIcon>
                        <ListItemText primary='Store Details' />
                      </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding className='mbe-1'>
                      <ListItemButton 
                        selected={activeReportSection === 'payments' && !selectedTool}
                        onClick={() => {
                          setActiveReportSection('payments')
                          setSelectedTool(null)
                        }}
                        className={classnames({
                          'bg-primaryLightOpacity': activeReportSection === 'payments' && !selectedTool
                        })}
                      >
                        <ListItemIcon>
                          <i className='ri-money-dollar-circle-line text-xl' />
                        </ListItemIcon>
                        <ListItemText primary='Payments' />
                      </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding className='mbe-1'>
                      <ListItemButton 
                        selected={activeReportSection === 'checkout' && !selectedTool}
                        onClick={() => {
                          setActiveReportSection('checkout')
                          setSelectedTool(null)
                        }}
                        className={classnames({
                          'bg-primaryLightOpacity': activeReportSection === 'checkout' && !selectedTool
                        })}
                      >
                        <ListItemIcon>
                          <i className='ri-shopping-cart-line text-xl' />
                        </ListItemIcon>
                        <ListItemText primary='Checkout' />
                      </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding className='mbe-1'>
                      <ListItemButton 
                        selected={activeReportSection === 'shipping_delivery' && !selectedTool}
                        onClick={() => {
                          setActiveReportSection('shipping_delivery')
                          setSelectedTool(null)
                        }}
                        className={classnames({
                          'bg-primaryLightOpacity': activeReportSection === 'shipping_delivery' && !selectedTool
                        })}
                      >
                        <ListItemIcon>
                          <i className='ri-truck-line text-xl' />
                        </ListItemIcon>
                        <ListItemText primary='Shipping & Delivery' />
                      </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding className='mbe-1'>
                      <ListItemButton 
                        selected={activeReportSection === 'locations' && !selectedTool}
                        onClick={() => {
                          setActiveReportSection('locations')
                          setSelectedTool(null)
                        }}
                        className={classnames({
                          'bg-primaryLightOpacity': activeReportSection === 'locations' && !selectedTool
                        })}
                      >
                        <ListItemIcon>
                          <i className='ri-map-pin-line text-xl' />
                        </ListItemIcon>
                        <ListItemText primary='Locations' />
                      </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding className='mbe-1'>
                      <ListItemButton 
                        selected={activeReportSection === 'notifications' && !selectedTool}
                        onClick={() => {
                          setActiveReportSection('notifications')
                          setSelectedTool(null)
                        }}
                        className={classnames({
                          'bg-primaryLightOpacity': activeReportSection === 'notifications' && !selectedTool
                        })}
                      >
                        <ListItemIcon>
                          <i className='ri-notification-line text-xl' />
                        </ListItemIcon>
                        <ListItemText primary='Notifications' />
                      </ListItemButton>
                    </ListItem>
                    
                    {tools.length > 0 && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant='caption' className='uppercase' sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>
                          Tools
                        </Typography>
                        {tools.map((tool) => (
                          <ListItem key={tool.id} disablePadding className='mbe-1'>
                            <ListItemButton 
                              selected={selectedTool?.id === tool.id}
                              onClick={() => {
                                setSelectedTool(tool)
                                setActiveReportSection(null)
                              }}
                              className={classnames({
                                'bg-primaryLightOpacity': selectedTool?.id === tool.id
                              })}
                            >
                              <ListItemIcon>
                                <i className='ri-tools-line text-xl' />
                              </ListItemIcon>
                              <ListItemText primary={tool.name} />
                            </ListItemButton>
                          </ListItem>
                        ))}
                      </>
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Right Column - Content */}
            <Grid size={{ xs: 12, md: 8, lg: 9 }}>
              {renderReportContent()}
            </Grid>
          </Grid>
        </Box>
      </TabPanel>
      </TabContext>

      {/* Image Fullscreen Dialog */}
      <Dialog open={imageDialogOpen} onClose={() => setImageDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <IconButton onClick={() => setImageDialogOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <i className='ri-close-line' />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedImage && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
              <img
                src={selectedImage}
                alt="Full size"
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Revision Dialog */}
      <Dialog 
        open={revisionDialogOpen} 
        onClose={() => {
          setRevisionDialogOpen(false)
          setRevisionComment('')
        }}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiDialog-container': {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }
        }}
      >
        <DialogTitle>
          Send for Revision
        </DialogTitle>
        <DialogContent>
          <Typography variant='body2' sx={{ mb: 2 }}>
            Please specify the reason why the task is being sent for revision:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label='Причина отправки на доработку'
            value={revisionComment}
            onChange={(e) => setRevisionComment(e.target.value)}
            placeholder='Введите причину...'
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setRevisionDialogOpen(false)
            setRevisionComment('')
          }}>
            Отмена
          </Button>
          <Button 
            variant='contained' 
            color='warning'
            onClick={handleSendForRevision}
            disabled={!revisionComment.trim()}
          >
            Отправить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
