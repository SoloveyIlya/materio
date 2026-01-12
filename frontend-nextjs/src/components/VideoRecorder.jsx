// React Imports
import { useRef, useState, useEffect } from 'react'

// MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'

/**
 * Компонент для записи видео с фронтальной камеры в формате круга
 */
const VideoRecorder = ({ open, onClose, onRecordComplete }) => {
  const videoRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState(null)
  const [chunks, setChunks] = useState([])
  const [error, setError] = useState(null)

  // Инициализация камеры при открытии диалога
  useEffect(() => {
    if (open) {
      startCamera()
    } else {
      stopCamera()
      resetState()
    }

    return () => {
      stopCamera()
    }
  }, [open])

  const startCamera = async () => {
    try {
      setError(null)
      // Запрашиваем фронтальную камеру
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user', // Фронтальная камера
          width: { ideal: 640 },
          height: { ideal: 640 }
        },
        audio: true
      })

      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      setError('Не удалось получить доступ к камере. Пожалуйста, разрешите доступ к камере.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const resetState = () => {
    setIsRecording(false)
    setRecordedBlob(null)
    setChunks([])
    setError(null)
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current = null
    }
  }

  const startRecording = () => {
    if (!streamRef.current) {
      setError('Камера не инициализирована')
      return
    }

    try {
      const chunks = []
      setChunks(chunks)

      // Создаем MediaRecorder для записи видео
      const options = {
        mimeType: 'video/webm;codecs=vp8,opus',
        videoBitsPerSecond: 2500000
      }

      let mediaRecorder
      try {
        mediaRecorder = new MediaRecorder(streamRef.current, options)
      } catch (e) {
        // Fallback на дефолтные настройки
        mediaRecorder = new MediaRecorder(streamRef.current)
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        setRecordedBlob(blob)
      }

      mediaRecorder.start(100) // Записываем данные каждые 100мс
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)
    } catch (err) {
      console.error('Error starting recording:', err)
      setError('Ошибка при запуске записи')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleSave = () => {
    if (recordedBlob) {
      // Создаем файл из записанного видео
      // Круглая маска будет применена при отображении
      const file = new File([recordedBlob], `video-circle-${Date.now()}.webm`, { type: 'video/webm' })
      onRecordComplete(file)
      onClose()
    }
  }

  const handleCancel = () => {
    resetState()
    onClose()
  }

  const handleRetry = () => {
    resetState()
    startCamera()
  }

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflow: 'hidden'
        }
      }}
    >
      <DialogContent sx={{ p: 0, position: 'relative', bgcolor: 'black' }}>
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            paddingTop: '100%', // Квадратный контейнер
            bgcolor: 'black'
          }}
        >
          {/* Видео с круглой маской */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}
          >
            <Box
              component="video"
              ref={videoRef}
              autoPlay
              playsInline
              muted
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '50%',
                border: '4px solid white',
                display: recordedBlob ? 'none' : 'block'
              }}
            />
            
            {/* Превью записанного видео */}
            {recordedBlob && (
              <Box
                component="video"
                src={URL.createObjectURL(recordedBlob)}
                autoPlay
                loop
                playsInline
                muted
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '50%',
                  border: '4px solid white'
                }}
              />
            )}


            {/* Индикатор записи */}
            {isRecording && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 16,
                  left: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  px: 2,
                  py: 1,
                  borderRadius: 2
                }}
              >
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: 'error.main',
                    animation: 'pulse 1s infinite'
                  }}
                />
                <Box component="span" sx={{ fontSize: '0.875rem' }}>
                  Запись...
                </Box>
              </Box>
            )}


            {/* Ошибка */}
            {error && (
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  bgcolor: 'error.main',
                  color: 'white',
                  p: 2,
                  borderRadius: 2,
                  textAlign: 'center',
                  maxWidth: '80%'
                }}
              >
                <Box sx={{ mb: 1 }}>{error}</Box>
                <Button size="small" variant="contained" onClick={handleRetry}>
                  Повторить
                </Button>
              </Box>
            )}
          </Box>
        </Box>

        {/* Кнопки управления */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            bgcolor: 'rgba(0, 0, 0, 0.8)',
            p: 2,
            display: 'flex',
            justifyContent: 'center',
            gap: 2
          }}
        >
          {!recordedBlob ? (
            <>
              {!isRecording ? (
                <IconButton
                  onClick={startRecording}
                  sx={{
                    bgcolor: 'error.main',
                  }}
                >
                  <i className="ri-vidicon-line" style={{ fontSize: 32, color: 'white' }} />
                </IconButton>
              ) : (
                <IconButton
                  onClick={stopRecording}
                  sx={{
                    bgcolor: 'error.main',
                  }}
                >
                  <i className="ri-stop-circle-line" style={{ fontSize: 32, color: 'white' }} />
                </IconButton>
              )}
            </>
          ) : (
            <>
              <Button
                variant="outlined"
                onClick={handleCancel}
                sx={{ color: 'white', borderColor: 'white' }}
              >
                Отмена
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
                startIcon={<i className="ri-check-line" />}
              >
                Отправить
              </Button>
              <Button
                variant="outlined"
                onClick={handleRetry}
                sx={{ color: 'white', borderColor: 'white' }}
              >
                Записать снова
              </Button>
            </>
          )}
        </Box>
      </DialogContent>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </Dialog>
  )
}

export default VideoRecorder

