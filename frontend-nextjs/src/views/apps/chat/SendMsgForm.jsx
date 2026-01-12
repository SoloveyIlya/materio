// React Imports
import { useRef, useState } from 'react'

// MUI Imports
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Popper from '@mui/material/Popper'
import Fade from '@mui/material/Fade'
import Paper from '@mui/material/Paper'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'

// Third-party Imports
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'

// Component Imports
import CustomIconButton from '@core/components/mui/IconButton'

// Emoji Picker Component for selecting emojis
const EmojiPicker = ({ onChange, isBelowSmScreen, openEmojiPicker, setOpenEmojiPicker, anchorRef }) => {
  return (
    <>
      <Popper
        open={openEmojiPicker}
        transition
        disablePortal
        placement='top-start'
        className='z-[12]'
        anchorEl={anchorRef.current}
      >
        {({ TransitionProps, placement }) => (
          <Fade {...TransitionProps} style={{ transformOrigin: placement === 'top-start' ? 'right top' : 'left top' }}>
            <Paper>
              <ClickAwayListener onClickAway={() => setOpenEmojiPicker(false)}>
                <span>
                  <Picker
                    emojiSize={18}
                    theme='light'
                    data={data}
                    maxFrequentRows={1}
                    onEmojiSelect={emoji => {
                      onChange(emoji.native)
                      setOpenEmojiPicker(false)
                    }}
                    {...(isBelowSmScreen && { perLine: 8 })}
                  />
                </span>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  )
}

const SendMsgForm = ({ 
  messageText, 
  setMessageText, 
  attachments, 
  setAttachments,
  voiceFile,
  setVoiceFile,
  videoFile,
  setVideoFile,
  videoRecorderOpen,
  setVideoRecorderOpen,
  isRecording,
  onSend, 
  onFileSelect,
  onVoiceFileSelect,
  onPaste,
  onStartRecording,
  onStopRecording,
  onRemoveVoiceFile,
  onRemoveVideoFile,
  isBelowSmScreen, 
  messageInputRef 
}) => {
  // States
  const [anchorEl, setAnchorEl] = useState(null)
  const [openEmojiPicker, setOpenEmojiPicker] = useState(false)

  // Refs
  const anchorRef = useRef(null)
  const open = Boolean(anchorEl)

  const handleToggle = () => {
    setOpenEmojiPicker(prevOpen => !prevOpen)
  }

  const handleClick = event => {
    setAnchorEl(prev => (prev ? null : event.currentTarget))
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleSendMsg = (event) => {
    event.preventDefault()

    if (messageText.trim() !== '' || attachments.length > 0 || voiceFile || videoFile) {
      onSend()
    }
  }

  const handleInputEndAdornment = () => {
    return (
      <div className='flex items-center gap-1'>
        {isBelowSmScreen ? (
          <>
            <IconButton
              size='small'
              id='option-menu'
              aria-haspopup='true'
              {...(open && { 'aria-expanded': true, 'aria-controls': 'share-menu' })}
              onClick={handleClick}
              ref={anchorRef}
            >
              <i className='ri-more-2-line text-textPrimary' />
            </IconButton>
            <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
              <MenuItem
                onClick={() => {
                  handleToggle()
                  handleClose()
                }}
                className='justify-center'
              >
                <i className='ri-emotion-happy-line text-textPrimary' />
              </MenuItem>
              <MenuItem onClick={handleClose} className='p-0'>
                <label htmlFor='upload-img' className='plb-2 pli-5'>
                  <i className='ri-attachment-2 text-textPrimary' />
                  <input 
                    hidden 
                    type='file' 
                    id='upload-img' 
                    multiple 
                    onChange={onFileSelect}
                  />
                </label>
              </MenuItem>
              <MenuItem onClick={handleClose} className='p-0'>
                <label htmlFor='upload-voice-sm' className='plb-2 pli-5'>
                  <i className='ri-mic-line text-textPrimary' />
                  <input 
                    hidden 
                    type='file' 
                    id='upload-voice-sm'
                    accept='audio/*'
                    onChange={onVoiceFileSelect}
                  />
                </label>
              </MenuItem>
              <MenuItem onClick={() => { setVideoRecorderOpen(true); handleClose(); }}>
                <i className='ri-vidicon-line text-textPrimary' />
              </MenuItem>
              {isRecording && onStopRecording && (
                <MenuItem onClick={() => { onStopRecording(); handleClose(); }}>
                  <i className='ri-stop-circle-line text-textPrimary' />
                </MenuItem>
              )}
              {!isRecording && onStartRecording && (
                <MenuItem onClick={() => { onStartRecording(); handleClose(); }}>
                  <i className='ri-mic-fill text-textPrimary' />
                </MenuItem>
              )}
            </Menu>
            <EmojiPicker
              anchorRef={anchorRef}
              openEmojiPicker={openEmojiPicker}
              setOpenEmojiPicker={setOpenEmojiPicker}
              isBelowSmScreen={isBelowSmScreen}
              onChange={value => {
                setMessageText(messageText + value)

                if (messageInputRef.current) {
                  messageInputRef.current.focus()
                }
              }}
            />
          </>
        ) : (
          <>
            <IconButton ref={anchorRef} size='small' onClick={handleToggle}>
              <i className='ri-emotion-happy-line text-textPrimary' />
            </IconButton>
            <EmojiPicker
              anchorRef={anchorRef}
              openEmojiPicker={openEmojiPicker}
              setOpenEmojiPicker={setOpenEmojiPicker}
              isBelowSmScreen={isBelowSmScreen}
              onChange={value => {
                setMessageText(messageText + value)

                if (messageInputRef.current) {
                  messageInputRef.current.focus()
                }
              }}
            />
            <IconButton size='small' component='label' htmlFor='upload-img'>
              <i className='ri-attachment-2 text-textPrimary' />
              <input 
                hidden 
                type='file' 
                id='upload-img' 
                multiple 
                onChange={onFileSelect}
              />
            </IconButton>
            <IconButton 
              size='small' 
              component='label' 
              htmlFor='upload-voice'
              color={isRecording ? 'error' : 'default'}
            >
              <i className={isRecording ? 'ri-stop-circle-line text-textPrimary' : 'ri-mic-line text-textPrimary'} />
              <input 
                hidden 
                type='file' 
                id='upload-voice'
                accept='audio/*'
                onChange={onVoiceFileSelect}
              />
            </IconButton>
            {isRecording && onStopRecording && (
              <IconButton 
                size='small' 
                onClick={onStopRecording}
                color='error'
              >
                <i className='ri-stop-circle-fill text-textPrimary' />
              </IconButton>
            )}
            {!isRecording && onStartRecording && (
              <IconButton 
                size='small' 
                onClick={onStartRecording}
              >
                <i className='ri-mic-fill text-textPrimary' />
              </IconButton>
            )}
            <IconButton 
              size='small' 
              onClick={() => setVideoRecorderOpen(true)}
              color={videoFile ? 'primary' : 'default'}
            >
              <i className='ri-vidicon-line text-textPrimary' />
            </IconButton>
          </>
        )}
        {isBelowSmScreen ? (
          <CustomIconButton variant='contained' color='primary' type='submit'>
            <i className='ri-send-plane-line' />
          </CustomIconButton>
        ) : (
          <Button variant='contained' color='primary' type='submit' endIcon={<i className='ri-send-plane-line' />}>
            Send
          </Button>
        )}
      </div>
    )
  }

  return (
    <form
      autoComplete='off'
      onSubmit={handleSendMsg}
      className='bg-[var(--mui-palette-customColors-chatBg)]'
    >
      {(attachments.length > 0 || voiceFile || videoFile) && (
        <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {attachments.map((file, idx) => (
            <Chip
              key={idx}
              label={file.name || file}
              onDelete={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
              size="small"
              sx={{ mr: 0.5, mb: 0.5 }}
            />
          ))}
          {voiceFile && (
            <Chip
              label={voiceFile.name || 'Voice message'}
              onDelete={onRemoveVoiceFile}
              size="small"
              icon={<i className='ri-mic-line' />}
              color="primary"
              sx={{ mr: 0.5, mb: 0.5 }}
            />
          )}
          {videoFile && (
            <Chip
              label={videoFile.name || 'Video circle'}
              onDelete={onRemoveVideoFile}
              size="small"
              icon={<i className='ri-vidicon-line' />}
              color="primary"
              sx={{ mr: 0.5, mb: 0.5 }}
            />
          )}
        </Box>
      )}
      <TextField
        fullWidth
        multiline
        maxRows={4}
        placeholder='Type a message... (Ctrl+V to paste screenshot)'
        value={messageText}
        className='p-5'
        onChange={e => setMessageText(e.target.value)}
        onPaste={onPaste}
        sx={{
          '& fieldset': { border: '0' },
          '& .MuiOutlinedInput-root': {
            background: 'var(--mui-palette-background-paper)',
            boxShadow: 'var(--mui-customShadows-xs)'
          }
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            handleSendMsg(e)
          }
        }}
        size='small'
        inputRef={messageInputRef}
        slotProps={{ input: { endAdornment: handleInputEndAdornment() } }}
      />
    </form>
  )
}

export default SendMsgForm
