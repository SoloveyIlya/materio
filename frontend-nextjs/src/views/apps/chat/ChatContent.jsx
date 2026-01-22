// React Imports
import { useEffect, useState, useRef } from 'react'

// MUI Imports
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Avatar from '@mui/material/Avatar'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'

// Third-party Imports
import classnames from 'classnames'
import PerfectScrollbar from 'react-perfect-scrollbar'

// Styles for message animation
const messageAnimationStyles = `
  @keyframes messageAppear {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .message-item.message-appear {
    animation: messageAppear 0.3s ease-out;
  }
`

// Component Imports
import OptionMenu from '@core/components/option-menu'
import AvatarWithBadge from './AvatarWithBadge'
import { statusObj } from './SidebarLeft'
import CustomAvatar from '@core/components/mui/Avatar'
import SendMsgForm from './SendMsgForm'
import UserProfileRight from './UserProfileRight'
import VideoRecorder from '@/components/VideoRecorder'

// Util Imports
import { getInitials } from '@/utils/getInitials'
import { API_URL } from '@/lib/api'

// Wrapper for the chat log to handle scrolling
const ScrollWrapper = ({ children, isBelowLgScreen, scrollRef, className }) => {
  if (isBelowLgScreen) {
    return (
      <div ref={scrollRef} className={classnames('bs-full overflow-y-auto overflow-x-hidden', className)}>
        {children}
      </div>
    )
  } else {
    return (
      <PerfectScrollbar ref={scrollRef} options={{ wheelPropagation: false }} className={className}>
        {children}
      </PerfectScrollbar>
    )
  }
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

const ChatContent = props => {
  // Props
  const {
    selectedChat,
    user,
    selectedAdminTab,
    messagesData,
    onSendMessage,
    onEditMessage,
    onDeleteMessage,
    backdropOpen,
    setBackdropOpen,
    setSidebarOpen,
    isBelowMdScreen,
    isBelowSmScreen,
    isBelowLgScreen,
    messageInputRef
  } = props

  const activeUser = selectedChat?.user

  // States
  const [userProfileRightOpen, setUserProfileRightOpen] = useState(false)
  const [editingMessage, setEditingMessage] = useState(null)
  const [editText, setEditText] = useState('')
  const [attachments, setAttachments] = useState([])
  const [messageText, setMessageText] = useState('')
  const [voiceFile, setVoiceFile] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [videoRecorderOpen, setVideoRecorderOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const [audioChunks, setAudioChunks] = useState([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState(null)
  const [newMessageIds, setNewMessageIds] = useState(new Set())
  const [animatingMessageIds, setAnimatingMessageIds] = useState(new Set())
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1)
  const [previousMessageCount, setPreviousMessageCount] = useState(0)
  const [isSearchActive, setIsSearchActive] = useState(false)

  // Refs
  const scrollRef = useRef(null)
  const messageRefs = useRef({})

  // Function to scroll to bottom when new message is sent
  const scrollToBottom = () => {
    if (scrollRef.current) {
      if (isBelowLgScreen) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      } else {
        scrollRef.current._container.scrollTop = scrollRef.current._container.scrollHeight
      }
    }
  }

  // Function to scroll to a specific message element
  const scrollToMessage = (element) => {
    if (!element || !scrollRef.current) return

    try {
      // For PerfectScrollbar
      if (!isBelowLgScreen && scrollRef.current) {
        const psInstance = scrollRef.current
        const scrollContainer = psInstance._container || psInstance._ps?.element
        
        if (scrollContainer) {
          // Get element position relative to container
          const elementRect = element.getBoundingClientRect()
          const containerRect = scrollContainer.getBoundingClientRect()
          
          // Calculate scroll position to center the element
          const elementTop = elementRect.top - containerRect.top + scrollContainer.scrollTop
          const scrollPosition = elementTop - (containerRect.height / 2) + (elementRect.height / 2)
          
          // Scroll using requestAnimationFrame for smooth animation
          const targetScroll = Math.max(0, scrollPosition)
          const startScroll = scrollContainer.scrollTop
          const distance = targetScroll - startScroll
          const duration = 500 // ms
          let startTime = null
          
          const animateScroll = (currentTime) => {
            if (startTime === null) startTime = currentTime
            const elapsed = currentTime - startTime
            const progress = Math.min(elapsed / duration, 1)
            
            // Easing function (ease-in-out)
            const ease = progress < 0.5 
              ? 2 * progress * progress 
              : 1 - Math.pow(-2 * progress + 2, 2) / 2
            
            scrollContainer.scrollTop = startScroll + distance * ease
            
            if (progress < 1) {
              requestAnimationFrame(animateScroll)
            } else {
              // Update PerfectScrollbar after animation
              if (psInstance.update) {
                psInstance.update()
              }
            }
          }
          
          requestAnimationFrame(animateScroll)
        } else {
          // Fallback for PerfectScrollbar
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      } else if (isBelowLgScreen && scrollRef.current) {
        // For regular div scrolling
        const scrollContainer = scrollRef.current
        const elementRect = element.getBoundingClientRect()
        const containerRect = scrollContainer.getBoundingClientRect()
        const elementTop = elementRect.top - containerRect.top + scrollContainer.scrollTop
        const scrollPosition = elementTop - (containerRect.height / 2) + (elementRect.height / 2)
        
        scrollContainer.scrollTo({
          top: Math.max(0, scrollPosition),
          behavior: 'smooth'
        })
      } else {
        // Fallback: use scrollIntoView
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    } catch (error) {
      console.warn('Error scrolling to message:', error)
      // Final fallback
      try {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } catch (e) {
        console.warn('Fallback scroll also failed:', e)
      }
    }
  }

  // Handle browser search (Ctrl+F) - scroll to found message
  useEffect(() => {
    let scrollTimeout = null
    let lastScrolledMessageId = null

    const findMessageContainer = (node) => {
      let current = node
      while (current && current !== document.body) {
        if (current.getAttribute && current.getAttribute('data-message-id')) {
          return current
        }
        current = current.parentElement
      }
      return null
    }

    const handleSelectionChange = () => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) {
        return
      }

      const range = selection.getRangeAt(0)
      if (range.collapsed) {
        return // No text selected
      }

      // Get the container node
      const containerNode = range.commonAncestorContainer
      const messageElement = findMessageContainer(
        containerNode.nodeType === Node.TEXT_NODE 
          ? containerNode.parentElement 
          : containerNode
      )

      if (messageElement) {
        const messageId = messageElement.getAttribute('data-message-id')
        
        // Avoid scrolling to the same message multiple times
        if (messageId && messageId !== lastScrolledMessageId) {
          lastScrolledMessageId = messageId
          
          // Clear any pending scroll
          if (scrollTimeout) {
            clearTimeout(scrollTimeout)
          }

          // Small delay to ensure the selection is complete
          scrollTimeout = setTimeout(() => {
            scrollToMessage(messageElement)
          }, 100)
        }
      }
    }

    // Listen for selection changes (when browser search finds text)
    document.addEventListener('selectionchange', handleSelectionChange)

    // Also handle when search dialog is used
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        // Reset last scrolled message when search is opened
        lastScrolledMessageId = null
        // Wait for the browser search to find the text
        setTimeout(() => {
          handleSelectionChange()
        }, 500)
      }
    }

    // Handle Enter key in search (next/previous match)
    const handleKeyUp = (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        setTimeout(() => {
          handleSelectionChange()
        }, 100)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
    }
  }, [isBelowLgScreen])

  // Scroll to bottom only on new message (not when search is active)
  useEffect(() => {
    if (selectedChat?.messages && selectedChat.messages.length) {
      const currentMessageCount = selectedChat.messages.length
      
      // Only scroll to bottom if search is not active and message count actually increased
      if (!isSearchActive && !searchDialogOpen && currentMessageCount > previousMessageCount) {
        setTimeout(scrollToBottom, 100)
      }
      
      setPreviousMessageCount(currentMessageCount)
    }
  }, [selectedChat?.messages?.length, isSearchActive, searchDialogOpen, previousMessageCount])

  // Close user profile right drawer if backdrop is closed
  useEffect(() => {
    if (!backdropOpen && userProfileRightOpen) {
      setUserProfileRightOpen(false)
    }
  }, [backdropOpen, userProfileRightOpen])

  // Reset message text when chat changes
  useEffect(() => {
    setMessageText('')
    setAttachments([])
    setVoiceFile(null)
    setVideoFile(null)
    setEditingMessage(null)
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
    }
  }, [selectedChat?.user?.id])

  // Определяем новые (непрочитанные) сообщения при открытии чата
  useEffect(() => {
    if (selectedChat?.messages && selectedChat.messages.length > 0 && selectedChat?.user?.id) {
      // Находим непрочитанные сообщения (не от текущего пользователя)
      const unreadMessages = selectedChat.messages.filter(msg => {
        // Определяем, является ли сообщение отправленным от нас
        let isSender = false
        if (user?.roles?.some(r => r.name === 'admin') && selectedAdminTab) {
          isSender = msg.from_user_id === user.id || msg.from_user_id === selectedAdminTab
        } else {
          isSender = msg.from_user_id === user?.id
        }
        
        // Сообщение считается новым, если оно непрочитанное и не от нас
        return !isSender && (msg.is_read === false || msg.is_read === 0 || msg.is_read === null)
      })

      if (unreadMessages.length > 0) {
        // Сохраняем ID новых сообщений
        const newIds = new Set(unreadMessages.map(msg => msg.id))
        setNewMessageIds(newIds)

        // Убираем подсветку через 7 секунд
        const timer = setTimeout(() => {
          setNewMessageIds(new Set())
        }, 7000)

        return () => clearTimeout(timer)
      } else {
        setNewMessageIds(new Set())
      }
    } else {
      setNewMessageIds(new Set())
    }
  }, [selectedChat?.user?.id, selectedChat?.messages?.length, user?.id, selectedAdminTab])

  // Отслеживаем новые сообщения для анимации
  useEffect(() => {
    if (selectedChat?.messages && selectedChat.messages.length > 0) {
      const lastMessage = selectedChat.messages[selectedChat.messages.length - 1]
      
      // Определяем, является ли сообщение отправленным от нас
      let isSender = false
      if (user?.roles?.some(r => r.name === 'admin') && selectedAdminTab) {
        isSender = lastMessage.from_user_id === user.id || lastMessage.from_user_id === selectedAdminTab
      } else {
        isSender = lastMessage.from_user_id === user?.id
      }

      // Если это наше сообщение или временное сообщение, добавляем анимацию
      if (isSender || (lastMessage.id && lastMessage.id.toString().startsWith('temp-'))) {
        const messageId = lastMessage.id
        setAnimatingMessageIds(prev => new Set([...prev, messageId]))
        
        // Убираем анимацию через 500ms (после завершения анимации)
        const timer = setTimeout(() => {
          setAnimatingMessageIds(prev => {
            const newSet = new Set(prev)
            newSet.delete(messageId)
            return newSet
          })
        }, 500)

        return () => clearTimeout(timer)
      }
    }
  }, [selectedChat?.messages?.length, user?.id, selectedAdminTab])

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    setAttachments(prev => [...prev, ...files])
  }

  const handlePaste = async (e) => {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile()
        const file = new File([blob], `screenshot-${Date.now()}.png`, { type: 'image/png' })
        setAttachments(prev => [...prev, file])
        e.preventDefault()
      }
    }
  }

  const handleSend = async () => {
    if (!messageText.trim() && attachments.length === 0 && !voiceFile && !videoFile) return

    try {
      await onSendMessage(messageText, attachments, voiceFile, videoFile)
      setMessageText('')
      setAttachments([])
      setVoiceFile(null)
      setVideoFile(null)
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleVideoRecordComplete = (file) => {
    setVideoFile(file)
    setVideoRecorderOpen(false)
  }

  const removeVideoFile = () => {
    setVideoFile(null)
  }

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' })
        const file = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' })
        setVoiceFile(file)
        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
      setAudioChunks(chunks)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Error accessing microphone. Please allow microphone access.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
    }
  }

  const handleVoiceFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('audio/')) {
      setVoiceFile(file)
    }
  }

  const removeVoiceFile = () => {
    setVoiceFile(null)
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
    }
  }

  const handleEdit = async (message) => {
    if (!editText.trim()) return

    try {
      await onEditMessage(message, editText)
      setEditingMessage(null)
      setEditText('')
    } catch (error) {
      console.error('Error editing message:', error)
    }
  }

  const handleDelete = (message) => {
    setMessageToDelete(message)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!messageToDelete) return

    try {
      await onDeleteMessage(messageToDelete)
      setDeleteDialogOpen(false)
      setMessageToDelete(null)
    } catch (error) {
      console.error('Error deleting message:', error)
      setDeleteDialogOpen(false)
      setMessageToDelete(null)
    }
  }

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false)
    setMessageToDelete(null)
  }

  // Search functionality
  const escapeRegex = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  const handleSearchChange = (value) => {
    setSearchTerm(value)
    if (!value.trim()) {
      setSearchResults([])
      setCurrentSearchIndex(-1)
      setIsSearchActive(false)
      return
    }

    setIsSearchActive(true)

    if (!selectedChat?.messages) {
      setSearchResults([])
      return
    }

    const term = value.toLowerCase().trim()
    const results = selectedChat.messages
      .map((msg, index) => {
        const body = msg.body?.toLowerCase() || ''
        if (body.includes(term)) {
          return { messageId: msg.id, index }
        }
        return null
      })
      .filter(Boolean)

    setSearchResults(results)
    if (results.length > 0) {
      setCurrentSearchIndex(0)
      // Scroll to first result after a delay to ensure DOM is ready
      setTimeout(() => {
        scrollToSearchResult(results[0])
      }, 300)
    } else {
      setCurrentSearchIndex(-1)
    }
  }

  const handleSearchNext = () => {
    if (searchResults.length === 0) return
    const nextIndex = (currentSearchIndex + 1) % searchResults.length
    setCurrentSearchIndex(nextIndex)
    scrollToSearchResult(searchResults[nextIndex])
  }

  const handleSearchPrevious = () => {
    if (searchResults.length === 0) return
    const prevIndex = currentSearchIndex <= 0 ? searchResults.length - 1 : currentSearchIndex - 1
    setCurrentSearchIndex(prevIndex)
    scrollToSearchResult(searchResults[prevIndex])
  }

  const scrollToSearchResult = (result) => {
    if (!result) return
    
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      let messageElement = messageRefs.current[result.messageId]
      
      // If element not found in refs, try to find it by data attribute
      if (!messageElement) {
        const scrollContainer = isBelowLgScreen 
          ? scrollRef.current 
          : scrollRef.current?._container || scrollRef.current?._ps?.element
        
        if (scrollContainer) {
          messageElement = scrollContainer.querySelector(`[data-message-id="${result.messageId}"]`)
        }
      }
      
      if (messageElement) {
        // Scroll to message
        scrollToMessage(messageElement)
        
        // Highlight the message briefly
        const originalBg = messageElement.style.backgroundColor || ''
        const originalTransition = messageElement.style.transition || ''
        messageElement.style.backgroundColor = 'rgba(25, 118, 210, 0.3)'
        messageElement.style.transition = 'background-color 0.3s ease'
        
        setTimeout(() => {
          messageElement.style.backgroundColor = originalBg
          setTimeout(() => {
            if (!originalTransition) {
              messageElement.style.transition = ''
            } else {
              messageElement.style.transition = originalTransition
            }
          }, 300)
        }, 2000)
      } else {
        console.warn('Message element not found for ID:', result.messageId)
      }
    }, 150)
  }

  // Scroll to current search result when index changes
  useEffect(() => {
    if (currentSearchIndex >= 0 && searchResults[currentSearchIndex]) {
      scrollToSearchResult(searchResults[currentSearchIndex])
    }
  }, [currentSearchIndex, searchResults])

  // Scroll to first result when search results are found
  useEffect(() => {
    if (searchResults.length > 0 && currentSearchIndex === 0) {
      scrollToSearchResult(searchResults[0])
    }
  }, [searchResults.length])

  // Close search dialog and reset when chat changes
  useEffect(() => {
    setSearchDialogOpen(false)
    setSearchTerm('')
    setSearchResults([])
    setCurrentSearchIndex(-1)
    setPreviousMessageCount(0)
    setIsSearchActive(false)
  }, [selectedChat?.user?.id])

  // Renders the user avatar with badge and user information
  const UserAvatar = ({ activeUser, setUserProfileLeftOpen, setBackdropOpen }) => (
    <div
      className='flex items-center gap-4 cursor-pointer'
      onClick={() => {
        setUserProfileLeftOpen(true)
        setBackdropOpen(true)
      }}
    >
      <AvatarWithBadge
        alt={activeUser?.name || activeUser?.email}
        src={activeUser?.avatar}
        color={activeUser?.avatarColor || 'primary'}
        badgeColor={activeUser?.is_online ? statusObj.online : statusObj.offline}
      />
      <div>
        <Typography color='text.primary'>{activeUser?.name || activeUser?.email}</Typography>
        <Typography variant='body2' color='text.secondary'>
          {activeUser?.is_online ? 'Online' : 'Offline'}
        </Typography>
      </div>
    </div>
  )

  return !selectedChat ? (
    <CardContent className='flex flex-col flex-auto items-center justify-center bs-full gap-[18px] bg-[var(--mui-palette-customColors-chatBg)]'>
      <style>{messageAnimationStyles}</style>
      <CustomAvatar variant='circular' size={98} color='primary' skin='light'>
        <i className='ri-wechat-line text-[50px]' />
      </CustomAvatar>
      <Typography className='text-center'>Select a contact to start a conversation.</Typography>
      {isBelowMdScreen && (
        <Button
          variant='contained'
          className='rounded-full'
          onClick={() => {
            setSidebarOpen(true)
            isBelowSmScreen ? setBackdropOpen(false) : setBackdropOpen(true)
          }}
        >
          Select Contact
        </Button>
      )}
    </CardContent>
  ) : (
    <>
      {activeUser && (
        <div className='flex flex-col grow bs-full'>
          <div className='flex items-center justify-between border-be plb-[17px] pli-5 bg-[var(--mui-palette-customColors-chatBg)]'>
            {isBelowMdScreen ? (
              <div className='flex items-center gap-4'>
                <IconButton
                  size='small'
                  onClick={() => {
                    setSidebarOpen(true)
                    setBackdropOpen(true)
                  }}
                >
                  <i className='ri-menu-line text-textSecondary' />
                </IconButton>
                <UserAvatar
                  activeUser={activeUser}
                  setBackdropOpen={setBackdropOpen}
                  setUserProfileLeftOpen={setUserProfileRightOpen}
                />
              </div>
            ) : (
              <UserAvatar
                activeUser={activeUser}
                setBackdropOpen={setBackdropOpen}
                setUserProfileLeftOpen={setUserProfileRightOpen}
              />
            )}
            {isBelowMdScreen ? (
              <OptionMenu
                iconClassName='text-textSecondary'
                options={[
                  {
                    text: 'Search Messages',
                    icon: <i className='ri-search-line' />,
                    menuItemProps: {
                      onClick: () => {
                        setSearchDialogOpen(true)
                      }
                    }
                  },
                  {
                    text: 'View Contact',
                    menuItemProps: {
                      onClick: () => {
                        setUserProfileRightOpen(true)
                        setBackdropOpen(true)
                      }
                    }
                  }
                ]}
              />
            ) : (
              <div className='flex items-center gap-1'>
                <IconButton 
                  size='small'
                  onClick={() => setSearchDialogOpen(true)}
                >
                  <i className='ri-search-line text-textSecondary' />
                </IconButton>
                <OptionMenu
                  iconClassName='text-textSecondary'
                  options={[
                    {
                      text: 'View Contact',
                      menuItemProps: {
                        onClick: () => {
                          setUserProfileRightOpen(true)
                          setBackdropOpen(true)
                        }
                      }
                    }
                  ]}
                />
              </div>
            )}
          </div>

          {/* Chat Messages */}
          <ScrollWrapper
            isBelowLgScreen={isBelowLgScreen}
            scrollRef={scrollRef}
            className='bg-[var(--mui-palette-customColors-chatBg)] flex-1'
          >
            <style>{messageAnimationStyles}</style>
            <CardContent className='p-0'>
              {selectedChat.messages && selectedChat.messages.length > 0 ? (
                selectedChat.messages
                  .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                  .map((msg) => {
                    // Для админов: сообщение считается отправленным от нас, если оно от текущего пользователя или от выбранного админа во вкладке
                    let isSender = false
                    let senderUser = user // По умолчанию отправитель - текущий пользователь
                    
                    if (user?.roles?.some(r => r.name === 'admin') && selectedAdminTab) {
                      isSender = msg.from_user_id === user.id || msg.from_user_id === selectedAdminTab
                      // Если сообщение от выбранного админа, используем его данные для аватара
                      if (msg.from_user_id === selectedAdminTab && messagesData?.tabs) {
                        const tab = messagesData.tabs.find(t => t.admin.id === selectedAdminTab)
                        if (tab && tab.admin) {
                          senderUser = tab.admin
                        }
                      }
                    } else {
                      isSender = msg.from_user_id === user?.id
                    }

                    const isNewMessage = newMessageIds.has(msg.id)
                    const isAnimating = animatingMessageIds.has(msg.id)

                    return (
                      <div
                        key={msg.id}
                        ref={(el) => {
                          if (el) {
                            messageRefs.current[msg.id] = el
                          }
                        }}
                        data-message-id={msg.id}
                        className={classnames('flex gap-4 message-item', { 
                          'flex-row-reverse': isSender,
                          'message-appear': isAnimating
                        })}
                        style={{
                          backgroundColor: isNewMessage && !isSender 
                            ? 'rgba(25, 118, 210, 0.12)' 
                            : 'transparent',
                          borderRadius: isNewMessage && !isSender ? '8px' : '0',
                          margin: isNewMessage && !isSender ? '4px 8px' : '0',
                          padding: '20px',
                          transition: isAnimating 
                            ? 'opacity 0.3s ease-out, transform 0.3s ease-out, background-color 0.6s ease-out, border-radius 0.6s ease-out, margin 0.6s ease-out'
                            : 'background-color 0.6s ease-out, border-radius 0.6s ease-out, margin 0.6s ease-out'
                        }}
                      >
                        {!isSender ? (
                          activeUser?.avatar ? (
                            <Avatar
                              alt={activeUser?.name || activeUser?.email}
                              src={activeUser?.avatar}
                              className='is-8 bs-8'
                            />
                          ) : (
                            <CustomAvatar
                              color={activeUser?.avatarColor || 'primary'}
                              skin='light'
                              size={32}
                            >
                              {getInitials(activeUser?.name || activeUser?.email)}
                            </CustomAvatar>
                          )
                        ) : (() => {
                          // Определяем аватар отправителя
                          const displayUser = senderUser || user
                          return displayUser?.avatar ? (
                            <Avatar alt={displayUser?.name || displayUser?.email} src={displayUser?.avatar} className='is-8 bs-8' />
                          ) : (
                            <CustomAvatar size={32}>
                              {getInitials(displayUser?.name || displayUser?.email || 'User')}
                            </CustomAvatar>
                          )
                        })()}
                        <div
                          className={classnames('flex flex-col gap-2', {
                            'items-end': isSender,
                            'max-is-[65%]': !isBelowMdScreen,
                            'max-is-[75%]': isBelowMdScreen && !isBelowSmScreen,
                            'max-is-[calc(100%-5.75rem)]': isBelowSmScreen
                          })}
                        >
                          {editingMessage?.id === msg.id ? (
                            <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1, minWidth: 200 }}>
                              <TextField
                                fullWidth
                                multiline
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                autoFocus
                                size="small"
                              />
                              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                <Button size="small" onClick={() => handleEdit(msg)} variant="contained">
                                  Save
                                </Button>
                                <Button size="small" onClick={() => {
                                  setEditingMessage(null)
                                  setEditText('')
                                }}>
                                  Cancel
                                </Button>
                              </Box>
                            </Box>
                          ) : (
                            <>
                              {msg.body && (
                                <Typography
                                  className={classnames('whitespace-pre-wrap pli-4 plb-2 shadow-xs', {
                                    'bg-backgroundPaper rounded-e rounded-b': !isSender,
                                    'bg-primary text-[var(--mui-palette-primary-contrastText)] rounded-s rounded-b': isSender
                                  })}
                                  style={{ wordBreak: 'break-word' }}
                                >
                                  {searchTerm && searchTerm.trim() ? (() => {
                                    const term = searchTerm.trim()
                                    const escapedTerm = escapeRegex(term)
                                    const parts = msg.body.split(new RegExp(`(${escapedTerm})`, 'gi'))
                                    return parts.map((part, idx) => 
                                      part.toLowerCase() === term.toLowerCase() ? (
                                        <mark key={idx} style={{ backgroundColor: 'rgba(255, 255, 0, 0.5)', padding: '0 2px' }}>
                                          {part}
                                        </mark>
                                      ) : (
                                        <span key={idx}>{part}</span>
                                      )
                                    )
                                  })() : msg.body}
                                </Typography>
                              )}
                              {msg.task_id && (
                                <Chip
                                  label={`Task #${msg.task_id}`}
                                  size="small"
                                  color="primary"
                                  icon={<i className="ri-task-line" />}
                                  onClick={() => {
                                    const taskUrl = user?.roles?.some(r => r.name === 'admin') 
                                      ? `/admin/tasks` 
                                      : `/moderator/tasks`
                                    window.open(taskUrl, '_blank')
                                  }}
                                  sx={{ cursor: 'pointer', mt: 0.5 }}
                                />
                              )}
                              {/* Показываем метку "(edited)" только для админов, модераторы не должны видеть, что сообщение было отредактировано */}
                              {msg.is_edited && user?.roles?.some(r => r.name === 'admin') && (
                                <Typography variant='caption' className='text-textSecondary italic'>
                                  (edited)
                                </Typography>
                              )}
                              {msg.attachments && msg.attachments.length > 0 && (
                                <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                  {msg.attachments.map((att, idx) => {
                                    // Обработка разных типов attachments
                                    const attachment = typeof att === 'string' ? { url: att, type: 'file' } : att
                                    const isImage = attachment.type === 'image' || /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment.url || '')
                                    const isVoice = attachment.type === 'voice'
                                    const isVideo = attachment.type === 'video' || 
                                                   /\.(mp4|webm|mov|avi)$/i.test(attachment.url || '') || 
                                                   attachment.url?.includes('video-circle') ||
                                                   attachment.name?.includes('video-circle')
                                    const url = attachment.url 
                                      ? (attachment.url.startsWith('http') ? attachment.url : `${API_URL}${attachment.url}`)
                                      : null
                                    
                                    if (isVoice && url) {
                                      return (
                                        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                                          <audio controls src={url} style={{ maxWidth: 250 }} />
                                        </Box>
                                      )
                                    }

                                    if (isVideo && url) {
                                      return (
                                        <Box
                                          key={idx}
                                          sx={{
                                            position: 'relative',
                                            width: 200,
                                            height: 200,
                                            borderRadius: '50%',
                                            overflow: 'hidden',
                                            border: '3px solid',
                                            borderColor: 'primary.main',
                                            cursor: 'pointer',
                                            '&:hover': { opacity: 0.9 }
                                          }}
                                          onClick={() => window.open(url, '_blank')}
                                        >
                                          <Box
                                            component="video"
                                            src={url}
                                            controls
                                            autoPlay={false}
                                            loop
                                            muted
                                            sx={{
                                              width: '100%',
                                              height: '100%',
                                              objectFit: 'cover',
                                              borderRadius: '50%'
                                            }}
                                          />
                                        </Box>
                                      )
                                    }
                                    
                                    return isImage && url ? (
                                      <Box
                                        key={idx}
                                        component="img"
                                        src={url}
                                        alt={`Attachment ${idx + 1}`}
                                        onClick={() => window.open(url, '_blank')}
                                        sx={{
                                          maxWidth: 200,
                                          maxHeight: 200,
                                          objectFit: 'cover',
                                          border: '1px solid #ddd',
                                          borderRadius: 1,
                                          cursor: 'pointer',
                                          '&:hover': { opacity: 0.8 }
                                        }}
                                      />
                                    ) : (
                                      <Chip
                                        key={idx}
                                        label={attachment.name || (typeof attachment.url === 'string' ? attachment.url.split('/').pop() : `Attachment ${idx + 1}`)}
                                        size="small"
                                        icon={<i className="ri-file-line" />}
                                        onClick={() => url && window.open(url, '_blank')}
                                        sx={{ mr: 0.5, cursor: url ? 'pointer' : 'default' }}
                                      />
                                    )
                                  })}
                                </Box>
                              )}
                              <div className='flex items-center gap-2'>
                                <Typography variant='caption' className='text-textSecondary'>
                                  {formatDate(msg.created_at_formatted || msg.created_at)}
                                </Typography>
                                {/* Статус прочтения: админы видят для своих сообщений, модераторы не видят */}
                                {user?.roles?.some(r => r.name === 'admin') && isSender && msg.is_read !== null && msg.is_read !== undefined && (
                                  <Tooltip title={msg.is_read ? `Read at ${msg.read_at_formatted ? formatDate(msg.read_at_formatted) : ''}` : 'Unread'}>
                                    <i className={msg.is_read ? 'ri-check-double-line text-primary' : 'ri-check-line text-textSecondary'} style={{ fontSize: 14 }} />
                                  </Tooltip>
                                )}
                                {user?.roles?.some(r => r.name === 'admin') && isSender && (
                                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    <Tooltip title="Edit message">
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          setEditingMessage(msg)
                                          setEditText(msg.body)
                                        }}
                                      >
                                        <i className="ri-edit-line" style={{ fontSize: 14 }} />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete message">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleDelete(msg)}
                                      >
                                        <i className="ri-delete-bin-line" style={{ fontSize: 14 }} />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '100%',
                  flexDirection: 'column',
                  gap: 2,
                  p: 3
                }}>
                  <Typography variant="h6" color="text.secondary">
                    No messages yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Start a conversation with {activeUser?.name || activeUser?.email || 'this user'}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </ScrollWrapper>

          <SendMsgForm
            messageText={messageText}
            setMessageText={setMessageText}
            attachments={attachments}
            setAttachments={setAttachments}
            voiceFile={voiceFile}
            setVoiceFile={setVoiceFile}
            videoFile={videoFile}
            setVideoFile={setVideoFile}
            videoRecorderOpen={videoRecorderOpen}
            setVideoRecorderOpen={setVideoRecorderOpen}
            isRecording={isRecording}
            onSend={handleSend}
            onFileSelect={handleFileSelect}
            onVoiceFileSelect={handleVoiceFileSelect}
            onPaste={handlePaste}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onRemoveVoiceFile={removeVoiceFile}
            onRemoveVideoFile={removeVideoFile}
            isBelowSmScreen={isBelowSmScreen}
            messageInputRef={messageInputRef}
          />

          {/* Video Recorder Dialog */}
          <VideoRecorder
            open={videoRecorderOpen}
            onClose={() => setVideoRecorderOpen(false)}
            onRecordComplete={handleVideoRecordComplete}
          />
        </div>
      )}

      {activeUser && (
        <UserProfileRight
          open={userProfileRightOpen}
          handleClose={() => {
            setUserProfileRightOpen(false)
            setBackdropOpen(false)
          }}
          activeUser={activeUser}
          isBelowSmScreen={isBelowSmScreen}
          isBelowLgScreen={isBelowLgScreen}
          user={user}
        />
      )}

      {/* Диалог подтверждения удаления сообщения */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 2,
            minWidth: 400,
            maxWidth: 500,
          }
        }}
      >
        <DialogTitle id="delete-dialog-title" sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: 'error.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="ri-delete-bin-line" style={{ fontSize: 24, color: 'var(--mui-palette-error-main)' }} />
            </Box>
            <Typography variant="h6" component="div">
              Delete Message
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description" sx={{ fontSize: '0.95rem', color: 'text.secondary' }}>
            Are you sure you want to delete this message? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            onClick={handleCancelDelete}
            variant="outlined"
            sx={{ minWidth: 100 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            sx={{ minWidth: 100 }}
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Search Dialog */}
      <Dialog
        open={searchDialogOpen}
        onClose={() => {
          setSearchDialogOpen(false)
          setSearchTerm('')
          setSearchResults([])
          setCurrentSearchIndex(-1)
          setIsSearchActive(false)
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            position: 'absolute',
            top: 80
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <i className='ri-search-line' style={{ fontSize: 24 }} />
            <Typography variant="h6">Search Messages</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            autoFocus
            placeholder="Search in messages..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (e.ctrlKey || e.metaKey) {
                  handleSearchPrevious()
                } else {
                  handleSearchNext()
                }
              }
            }}
            InputProps={{
              startAdornment: (
                <Box sx={{ mr: 1 }}>
                  <i className='ri-search-line' />
                </Box>
              ),
              endAdornment: searchTerm && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {searchResults.length > 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                      {currentSearchIndex + 1} / {searchResults.length}
                    </Typography>
                  )}
                  <IconButton
                    size="small"
                    onClick={handleSearchPrevious}
                    disabled={searchResults.length === 0}
                    title="Previous (Ctrl+Enter)"
                  >
                    <i className='ri-arrow-up-line' />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={handleSearchNext}
                    disabled={searchResults.length === 0}
                    title="Next (Enter)"
                  >
                    <i className='ri-arrow-down-line' />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSearchTerm('')
                      setSearchResults([])
                      setCurrentSearchIndex(-1)
                      setIsSearchActive(false)
                    }}
                  >
                    <i className='ri-close-line' />
                  </IconButton>
                </Box>
              )
            }}
          />
          {searchTerm && searchResults.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
              No messages found
            </Typography>
          )}
          {searchTerm && searchResults.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Found {searchResults.length} message{searchResults.length !== 1 ? 's' : ''}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setSearchDialogOpen(false)
            setSearchTerm('')
            setSearchResults([])
            setCurrentSearchIndex(-1)
            setIsSearchActive(false)
          }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default ChatContent
