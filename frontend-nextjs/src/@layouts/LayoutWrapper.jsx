'use client'

// React Imports
import { useEffect, useRef } from 'react'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'
import useLayoutInit from '@core/hooks/useLayoutInit'
import { useGlobalMessageNotifications } from '@/hooks/useGlobalMessageNotifications'

const LayoutWrapper = props => {
  // Props
  const { systemMode, verticalLayout, horizontalLayout } = props

  // Hooks
  const { settings } = useSettings()
  const wrapperRef = useRef(null)

  useLayoutInit(systemMode)
  
  // Глобальное отслеживание новых сообщений для звуковых уведомлений
  useGlobalMessageNotifications()

  // Исправление aria-hidden для предотвращения блокировки фокусируемых элементов
  useEffect(() => {
    if (!wrapperRef.current) return

    const checkAndFixAriaHidden = (element) => {
      if (!element) return
      
      // Проверяем, есть ли внутри фокусируемые элементы
      const hasFocusableElements = element.querySelector(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"]), [role="button"]:not([aria-disabled="true"])'
      )
      
      // Проверяем, есть ли элемент с фокусом
      const hasFocusedElement = element.querySelector(':focus')
      
      if ((hasFocusableElements || hasFocusedElement) && element.getAttribute('aria-hidden') === 'true') {
        // Сохраняем оригинальное значение
        if (!element.hasAttribute('data-original-aria-hidden')) {
          element.setAttribute('data-original-aria-hidden', 'true')
        }
        // Убираем aria-hidden
        element.setAttribute('aria-hidden', 'false')
      }
    }

    const handleFocus = (e) => {
      if (wrapperRef.current && wrapperRef.current.contains(e.target)) {
        // Проверяем все родительские элементы до body
        let current = e.target
        while (current && current !== document.body) {
          checkAndFixAriaHidden(current)
          current = current.parentElement
        }
      }
    }

    // MutationObserver для отслеживания изменений aria-hidden
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
          const target = mutation.target
          
          // Проверяем wrapper и его предков
          if (wrapperRef.current && (target === wrapperRef.current || target.contains(wrapperRef.current))) {
            checkAndFixAriaHidden(target)
          }
          
          // Проверяем, если target содержит wrapper
          if (wrapperRef.current && wrapperRef.current.contains(target)) {
            checkAndFixAriaHidden(wrapperRef.current)
          }
        }
      })
    })

    // Наблюдаем за изменениями в wrapper и его родителях
    let current = wrapperRef.current
    while (current && current !== document.body) {
      observer.observe(current, {
        attributes: true,
        attributeFilter: ['aria-hidden'],
        subtree: false
      })
      current = current.parentElement
    }

    // Также наблюдаем за document.body для глобальных изменений
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['aria-hidden'],
      subtree: true
    })

    // Слушаем события фокуса
    document.addEventListener('focusin', handleFocus, true)

    // Проверяем при монтировании
    checkAndFixAriaHidden(wrapperRef.current)

    return () => {
      observer.disconnect()
      document.removeEventListener('focusin', handleFocus, true)
    }
  }, [])

  // Return the layout based on the layout context
  return (
    <div ref={wrapperRef} className='flex flex-col flex-auto' data-skin={settings.skin}>
      {settings.layout === 'horizontal' ? horizontalLayout : verticalLayout}
    </div>
  )
}

export default LayoutWrapper
