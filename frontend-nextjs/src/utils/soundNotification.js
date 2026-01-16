/**
 * Утилита для воспроизведения звукового сигнала при получении нового сообщения
 */

/**
 * Воспроизводит звуковой сигнал уведомления
 * Использует Web Audio API для генерации простого звука
 * Звук воспроизводится только если страница видна в браузере
 */
export const playNotificationSound = () => {
  try {
    // Проверяем, что страница видна (не в фоне) - это правильная проверка
    // Мы не хотим воспроизводить звук, если пользователь переключился на другую вкладку
    if (document.visibilityState !== 'visible') {
      return
    }

    // Создаем AudioContext
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    
    // Генерируем простой звук уведомления (короткий бип)
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    // Подключаем узлы
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    // Настраиваем звук
    oscillator.frequency.value = 800 // Частота в Гц (высокий тон)
    oscillator.type = 'sine' // Тип волны
    
    // Настраиваем громкость (envelope)
    const now = audioContext.currentTime
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01) // Быстро нарастает
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1) // Плавно затухает
    
    // Воспроизводим звук
    oscillator.start(now)
    oscillator.stop(now + 0.1) // Длительность 100мс
    
    // Очищаем после завершения
    oscillator.onended = () => {
      audioContext.close()
    }
  } catch (error) {
    console.error('Error playing notification sound:', error)
    // Fallback: пытаемся использовать HTML5 Audio, если есть файл
    try {
      const audio = new Audio('/sounds/notification.mp3')
      audio.volume = 0.5
      audio.play().catch(() => {
        // Игнорируем ошибки воспроизведения
      })
    } catch (fallbackError) {
      // Если и это не работает, просто игнорируем
    }
  }
}

/**
 * Воспроизводит звук только если страница видна и не в фоне
 */
export const playNotificationSoundIfVisible = () => {
  if (document.visibilityState === 'visible') {
    playNotificationSound()
  }
}

