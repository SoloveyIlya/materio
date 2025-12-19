'use client'

import { useState, useEffect } from 'react'
import { 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  Paper, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText, 
  Avatar, 
  TextField, 
  Button, 
  IconButton, 
  Badge,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  Tooltip
} from '@mui/material'
import api from '@/lib/api'
import { API_URL } from '@/lib/api'

export default function MessagesPage() {
  const [activeTab, setActiveTab] = useState(0) // 0 = message, 1 = support
  const [messagesData, setMessagesData] = useState(null)
  const [selectedChat, setSelectedChat] = useState(null)
  const [messageText, setMessageText] = useState('')
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [editingMessage, setEditingMessage] = useState(null)
  const [editText, setEditText] = useState('')

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadMessages()
    }
  }, [activeTab, user])

  // Автоматическое обновление сообщений каждые 3 секунды (polling)
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      // Обновляем только если страница видна (не в фоне)
      if (document.visibilityState === 'visible') {
        loadMessages(true) // silent = true, чтобы не показывать loading
      }
    }, 3000) // Каждые 3 секунды

    return () => clearInterval(interval)
  }, [user, activeTab])

  // Проверяем URL параметры для привязки к таску
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const taskId = urlParams.get('task_id')
      if (taskId) {
        // Можно добавить логику для автоматического выбора чата с админом по таску
        // Пока просто отмечаем что есть task_id
      }
    }
  }, [])

  // Обновляем selectedChat когда messagesData изменится
  useEffect(() => {
    if (selectedChat && selectedChat.user && messagesData) {
      const selectedUserId = selectedChat.user.id
      
      // Для админа
      if (user?.roles?.some(r => r.name === 'admin') && messagesData?.tabs) {
        for (const tab of messagesData.tabs) {
          const chat = tab.chats.find(c => c.user.id === selectedUserId)
          if (chat) {
            setSelectedChat(chat)
            return
          }
        }
        const unassignedChat = messagesData.unassigned?.chats?.find(c => c.user.id === selectedUserId)
        if (unassignedChat) {
          setSelectedChat(unassignedChat)
        }
      } else if (messagesData && Array.isArray(messagesData) && selectedChat.user) {
        // Для модератора - новая структура данных (массив чатов)
        const updatedChat = messagesData.find(c => c.user.id === selectedUserId)
        if (updatedChat) {
          setSelectedChat(updatedChat)
        }
      }
    }
  }, [messagesData])

  const loadUser = async () => {
    try {
      const response = await api.get('/auth/user')
      setUser(response.data)
    } catch (error) {
      console.error('Error loading user:', error)
    }
  }

  const loadMessages = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true)
      }
      const type = activeTab === 0 ? 'message' : 'support'
      const response = await api.get(`/messages?type=${type}`)
      setMessagesData(response.data)
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  const handleSendMessage = async () => {
    if (!messageText.trim() && attachments.length === 0) return
    if (!selectedChat || !selectedChat.user) return

    try {
      // Проверяем task_id из URL
      const urlParams = new URLSearchParams(window.location.search)
      const taskId = urlParams.get('task_id')

      const messageData = {
        to_user_id: selectedChat.user.id,
        type: activeTab === 0 ? 'message' : 'support',
        body: messageText,
        attachments: attachments.map(f => f.name || f),
        task_id: taskId || null, // Привязка к таску если есть
      }

      // Если есть файлы, используем FormData
      if (attachments.some(f => f instanceof File)) {
        const formData = new FormData()
        formData.append('to_user_id', selectedChat.user.id)
        formData.append('type', activeTab === 0 ? 'message' : 'support')
        formData.append('body', messageText)
        
        // Добавляем task_id если есть
        const urlParams = new URLSearchParams(window.location.search)
        const taskId = urlParams.get('task_id')
        if (taskId) {
          formData.append('task_id', taskId)
        }
        
        attachments.forEach((file, index) => {
          if (file instanceof File) {
            formData.append(`attachments[${index}]`, file)
          } else {
            formData.append(`attachments[${index}]`, file)
          }
        })

        await api.post('/messages', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      } else {
        await api.post('/messages', messageData)
      }

      setMessageText('')
      setAttachments([])
      
      // Перезагружаем сообщения
      await loadMessages()
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Error sending message')
    }
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    setAttachments(prev => [...prev, ...files])
  }

  // Clipboard upload для скриншотов
  const handlePaste = async (e) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile()
        if (file) {
          setAttachments(prev => [...prev, file])
        }
      }
    }
  }

  const handleEditMessage = async (message) => {
    if (!editText.trim()) return

    try {
      await api.put(`/messages/${message.id}`, {
        body: editText,
      })
      setEditingMessage(null)
      setEditText('')
      loadMessages()
    } catch (error) {
      console.error('Error editing message:', error)
      alert('Error editing message')
    }
  }

  const handleDeleteMessage = async (message) => {
    if (!confirm('Are you sure you want to delete this message?')) return

    try {
      await api.delete(`/messages/${message.id}`)
      loadMessages()
    } catch (error) {
      console.error('Error deleting message:', error)
      alert('Error deleting message')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Для админа: показываем вкладки по администраторам
  if (user?.roles?.some(r => r.name === 'admin')) {
    return (
      <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h4">
            {activeTab === 0 ? 'Messages' : 'Support'}
          </Typography>
          <Chip 
            label="🟢 Real-time" 
            size="small" 
            color="success" 
            sx={{ fontSize: '0.75rem' }}
          />
        </Box>

        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
          <Tab label="Messages" />
          <Tab label="Support" />
        </Tabs>

        {loading ? (
          <Box>Loading...</Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 2, flex: 1, overflow: 'hidden' }}>
            {/* Список чатов */}
            <Paper sx={{ width: 300, p: 2, overflow: 'auto' }}>
              <Typography variant="h6" gutterBottom>Chats</Typography>
              
              {/* Вкладки по администраторам */}
              {messagesData?.tabs?.map((tab, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {tab.admin.name}
                  </Typography>
                  {tab.chats.map((chat) => (
                    <Box
                      key={chat.user.id}
                      sx={{
                        p: 1,
                        mb: 1,
                        cursor: 'pointer',
                        borderRadius: 1,
                        bgcolor: selectedChat?.user?.id === chat.user.id ? 'primary.light' : 'transparent',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                      onClick={() => setSelectedChat(chat)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar>{chat.user.name?.[0] || 'U'}</Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight="bold">
                            {chat.user.name}
                          </Typography>
                          {chat.unread_count > 0 && (
                            <Badge badgeContent={chat.unread_count} color="error">
                              <Typography variant="caption">Unread</Typography>
                            </Badge>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Box>
              ))}

              {/* Незакреплённые модераторы */}
              {messagesData?.unassigned?.chats?.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Unassigned
                  </Typography>
                  {messagesData.unassigned.chats.map((chat) => (
                    <Box
                      key={chat.user.id}
                      sx={{
                        p: 1,
                        mb: 1,
                        cursor: 'pointer',
                        borderRadius: 1,
                        bgcolor: selectedChat?.user?.id === chat.user.id ? 'primary.light' : 'transparent',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                      onClick={() => setSelectedChat(chat)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar>{chat.user.name?.[0] || 'U'}</Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight="bold">
                            {chat.user.name}
                          </Typography>
                          {chat.unread_count > 0 && (
                            <Badge badgeContent={chat.unread_count} color="error">
                              <Typography variant="caption">Unread</Typography>
                            </Badge>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>

            {/* Область чата */}
            <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
              {selectedChat ? (
                <>
                  <Box sx={{ borderBottom: 1, borderColor: 'divider', pb: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="h6">{selectedChat.user.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {selectedChat.user.email}
                        </Typography>
                      </Box>
                      {(() => {
                        const urlParams = new URLSearchParams(window.location.search)
                        const taskId = urlParams.get('task_id')
                        if (taskId) {
                          return (
                            <Chip
                              label={`Task #${taskId}`}
                              color="primary"
                              size="small"
                              icon={<i className="ri-task-line" />}
                              onClick={() => window.open(`/moderator/tasks`, '_blank')}
                              sx={{ cursor: 'pointer' }}
                            />
                          )
                        }
                        return null
                      })()}
                    </Box>
                  </Box>

                  {/* Сообщения */}
                  <Box sx={{ flex: 1, overflow: 'auto', mb: 2 }}>
                    {selectedChat.messages && selectedChat.messages.length > 0 ? (
                      selectedChat.messages
                        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                        .map((msg) => (
                          <Box
                            key={msg.id}
                            sx={{
                              mb: 2,
                              display: 'flex',
                              justifyContent: msg.from_user_id === user.id ? 'flex-end' : 'flex-start'
                            }}
                          >
                            <Paper
                              sx={{
                                p: 2,
                                maxWidth: '70%',
                                bgcolor: msg.from_user_id === user.id ? 'primary.light' : 'grey.100',
                                position: 'relative'
                              }}
                            >
                              {editingMessage?.id === msg.id ? (
                                <Box>
                                  <TextField
                                    fullWidth
                                    multiline
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    autoFocus
                                  />
                                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                    <Button size="small" onClick={() => handleEditMessage(msg)} variant="contained">
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
                                  <Typography variant="body2">{msg.body}</Typography>
                                  {msg.task_id && (
                                    <Chip
                                      label={`Task #${msg.task_id}`}
                                      size="small"
                                      color="primary"
                                      icon={<i className="ri-task-line" />}
                                      onClick={() => window.open(`/moderator/tasks`, '_blank')}
                                      sx={{ mt: 1, cursor: 'pointer' }}
                                    />
                                  )}
                                  {msg.is_edited && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic' }}>
                                      (edited)
                                    </Typography>
                                  )}
                                  {msg.attachments && msg.attachments.length > 0 && (
                                    <Box sx={{ mt: 1 }}>
                                      {msg.attachments.map((att, idx) => (
                                        <Chip
                                          key={idx}
                                          label={`Attachment ${idx + 1}`}
                                          size="small"
                                          sx={{ mr: 0.5 }}
                                        />
                                      ))}
                                    </Box>
                                  )}
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                                    <Typography variant="caption" color="text.secondary">
                                      {formatDate(msg.created_at_formatted || msg.created_at)}
                                    </Typography>
                                    {user?.roles?.some(r => r.name === 'admin') && (
                                      <Box>
                                        <Tooltip title="Edit message">
                                          <IconButton
                                            size="small"
                                            onClick={() => {
                                              setEditingMessage(msg)
                                              setEditText(msg.body)
                                            }}
                                          >
                                            <i className="ri-edit-line" style={{ fontSize: 16 }} />
                                          </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete message">
                                          <IconButton
                                            size="small"
                                            onClick={() => handleDeleteMessage(msg)}
                                          >
                                            <i className="ri-delete-bin-line" style={{ fontSize: 16 }} />
                                          </IconButton>
                                        </Tooltip>
                                      </Box>
                                    )}
                                  </Box>
                                </>
                              )}
                            </Paper>
                          </Box>
                        ))
                    ) : (
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        height: '100%',
                        flexDirection: 'column',
                        gap: 2
                      }}>
                        <Typography variant="h6" color="text.secondary">
                          No messages yet
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Start a conversation with {selectedChat.user?.name || 'this admin'}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Форма отправки */}
                  <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
                    {attachments.length > 0 && (
                      <Box sx={{ mb: 1 }}>
                        {attachments.map((file, idx) => (
                          <Chip
                            key={idx}
                            label={file.name || file}
                            onDelete={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                            size="small"
                            sx={{ mr: 0.5 }}
                          />
                        ))}
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        component="label"
                        size="small"
                      >
                        📎
                        <input type="file" hidden multiple onChange={handleFileSelect} />
                      </Button>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onPaste={handlePaste}
                      placeholder="Type a message... (Ctrl+V to paste screenshot)"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                    />
                      <Button variant="contained" onClick={handleSendMessage}>
                        Send
                      </Button>
                    </Box>
                  </Box>
                </>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Typography color="text.secondary">Select a chat to start conversation</Typography>
                </Box>
              )}
            </Paper>
          </Box>
        )}
      </Box>
    )
  }

  // Для модератора: простой список сообщений
  return (
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h4">
          {activeTab === 0 ? 'Messages' : 'Support'}
        </Typography>
        <Chip 
          label="🟢 Real-time" 
          size="small" 
          color="success" 
          sx={{ fontSize: '0.75rem' }}
        />
      </Box>

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
        <Tab label="Messages" />
        <Tab label="Support" />
      </Tabs>

      {loading ? (
        <Box>Loading...</Box>
      ) : (
        <Box sx={{ display: 'flex', gap: 2, flex: 1, overflow: 'hidden' }}>
          {/* Список админов для модератора */}
          <Paper sx={{ width: 250, p: 2, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>Admins</Typography>
            {messagesData && Array.isArray(messagesData) && messagesData.length > 0 ? (
              <List>
                {messagesData.map((chat) => (
                  <ListItem
                    key={chat.user.id}
                    button
                    selected={selectedChat?.user?.id === chat.user.id}
                    onClick={() => setSelectedChat(chat)}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      bgcolor: selectedChat?.user?.id === chat.user.id ? 'primary.light' : 'transparent',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ 
                        bgcolor: chat.user.is_online ? 'success.main' : 'grey.400'
                      }}>
                        {chat.user.name?.[0] || 'A'}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={chat.user.name || 'Admin'}
                      secondary={
                        <Box>
                          <Typography variant="caption" color={chat.user.is_online ? 'success.main' : 'text.secondary'}>
                            {chat.user.is_online ? 'Online' : 'Offline'}
                          </Typography>
                          {chat.messages.length > 0 && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {chat.messages[chat.messages.length - 1].body?.substring(0, 30)}...
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                No admins available
              </Typography>
            )}
          </Paper>

          {/* Область чата */}
          <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
            {selectedChat ? (
              <>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', pb: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h6">{selectedChat.user?.name || 'Admin'}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {selectedChat.user?.email}
                        {selectedChat.user?.is_online && (
                          <Chip 
                            label="Online" 
                            size="small" 
                            color="success" 
                            sx={{ ml: 1, height: 20 }}
                          />
                        )}
                      </Typography>
                    </Box>
                    {(() => {
                      const urlParams = new URLSearchParams(window.location.search)
                      const taskId = urlParams.get('task_id')
                      if (taskId) {
                        return (
                          <Chip
                            label={`Task #${taskId}`}
                            color="primary"
                            size="small"
                            icon={<i className="ri-task-line" />}
                            onClick={() => window.open(`/moderator/tasks`, '_blank')}
                            sx={{ cursor: 'pointer' }}
                          />
                        )
                      }
                      return null
                    })()}
                  </Box>
                </Box>

                {/* Сообщения */}
                <Box sx={{ flex: 1, overflow: 'auto', mb: 2 }}>
                  {selectedChat.messages && selectedChat.messages.length > 0 ? (
                    selectedChat.messages
                      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                      .map((msg) => (
                        <Box
                          key={msg.id}
                          sx={{
                            mb: 2,
                            display: 'flex',
                            justifyContent: msg.from_user_id === user?.id ? 'flex-end' : 'flex-start'
                          }}
                        >
                          <Paper
                            sx={{
                              p: 2,
                              maxWidth: '70%',
                              bgcolor: msg.from_user_id === user?.id ? 'primary.light' : 'grey.100',
                              position: 'relative'
                            }}
                          >
                            <Typography variant="body2">{msg.body}</Typography>
                            {msg.is_edited && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic' }}>
                                (edited)
                              </Typography>
                            )}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <Box sx={{ mt: 1 }}>
                                {msg.attachments.map((att, idx) => (
                                  <Chip
                                    key={idx}
                                    label={`Attachment ${idx + 1}`}
                                    size="small"
                                    sx={{ mr: 0.5 }}
                                  />
                                ))}
                              </Box>
                            )}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(msg.created_at_formatted || msg.created_at)}
                              </Typography>
                            </Box>
                          </Paper>
                        </Box>
                      ))
                  ) : (
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      height: '100%',
                      flexDirection: 'column',
                      gap: 2
                    }}>
                      <Typography variant="h6" color="text.secondary">
                        No messages yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Start a conversation with {selectedChat.user?.name || 'this admin'}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Форма отправки */}
                <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
                  {attachments.length > 0 && (
                    <Box sx={{ mb: 1 }}>
                      {attachments.map((file, idx) => (
                        <Chip
                          key={idx}
                          label={file.name || file}
                          onDelete={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                          size="small"
                          sx={{ mr: 0.5 }}
                        />
                      ))}
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      component="label"
                      size="small"
                    >
                      📎
                      <input type="file" hidden multiple onChange={handleFileSelect} />
                    </Button>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onPaste={handlePaste}
                      placeholder="Type a message... (Ctrl+V to paste screenshot)"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                    />
                    <Button 
                      variant="contained" 
                      onClick={handleSendMessage}
                      disabled={!selectedChat}
                    >
                      Send
                    </Button>
                  </Box>
                </Box>
              </>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography color="text.secondary">Select an admin to start conversation</Typography>
              </Box>
            )}
          </Paper>
        </Box>
      )}
    </Box>
  )
}
