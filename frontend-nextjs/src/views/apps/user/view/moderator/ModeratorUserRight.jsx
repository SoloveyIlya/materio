'use client'

// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
import Grid from '@mui/material/Grid'

// Component Imports
import CustomTabList from '@core/components/mui/TabList'

const ModeratorUserRight = ({ tabContentList, user }) => {
  // States
  const [activeTab, setActiveTab] = useState('overview')

  const handleChange = (event, value) => {
    setActiveTab(value)
  }

  // Агрессивно убираем aria-hidden с элементов, содержащих фокус
  useEffect(() => {
    const checkAndFixAriaHidden = () => {
      // Находим все элементы с aria-hidden="true"
      const hiddenElements = document.querySelectorAll('[aria-hidden="true"]')
      
      hiddenElements.forEach((el) => {
        // Проверяем, есть ли внутри фокусируемые элементы
        const focusedElement = el.querySelector(':focus')
        const hasInteractiveElements = el.querySelector('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')
        
        if (focusedElement || hasInteractiveElements) {
          // Сохраняем оригинальное значение
          if (!el.hasAttribute('data-original-aria-hidden')) {
            el.setAttribute('data-original-aria-hidden', 'true')
          }
          // Временно убираем aria-hidden
          el.setAttribute('aria-hidden', 'false')
        }
      })
    }

    // MutationObserver для отслеживания изменений aria-hidden
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
          const target = mutation.target
          if (target.getAttribute('aria-hidden') === 'true') {
            // Проверяем немедленно
            const focusedElement = target.querySelector(':focus')
            const hasInteractiveElements = target.querySelector('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')
            
            if (focusedElement || hasInteractiveElements) {
              if (!target.hasAttribute('data-original-aria-hidden')) {
                target.setAttribute('data-original-aria-hidden', 'true')
              }
              target.setAttribute('aria-hidden', 'false')
            }
          }
        }
      })
    })

    // Наблюдаем за изменениями во всем документе
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['aria-hidden'],
      subtree: true
    })

    // Отслеживаем фокус
    const handleFocus = () => {
      setTimeout(checkAndFixAriaHidden, 0)
    }

    // Отслеживаем клики
    const handleClick = () => {
      setTimeout(checkAndFixAriaHidden, 0)
    }

    document.addEventListener('focusin', handleFocus, true)
    document.addEventListener('click', handleClick, true)
    
    // Первоначальная проверка
    checkAndFixAriaHidden()
    
    // Периодическая проверка (на случай если что-то пропустили)
    const interval = setInterval(checkAndFixAriaHidden, 100)

    return () => {
      observer.disconnect()
      document.removeEventListener('focusin', handleFocus, true)
      document.removeEventListener('click', handleClick, true)
      clearInterval(interval)
    }
  }, [])

  return (
    <>
      <TabContext value={activeTab}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12 }}>
            <CustomTabList onChange={handleChange} variant='scrollable' pill='true'>
              <Tab icon={<i className='ri-user-3-line' />} value='overview' label='Overview' iconPosition='start' />
              <Tab icon={<i className='ri-file-text-line' />} value='documents' label='Documents' iconPosition='start' />
              <Tab icon={<i className='ri-lock-line' />} value='secure' label='Secure' iconPosition='start' />
            </CustomTabList>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TabPanel 
              value={activeTab} 
              className='p-0'
              keepMounted={false}
              sx={{ 
                '&[aria-hidden="true"]': { 
                  display: 'none !important',
                  visibility: 'hidden !important'
                }
              }}
            >
              {tabContentList[activeTab]}
            </TabPanel>
          </Grid>
        </Grid>
      </TabContext>
    </>
  )
}

export default ModeratorUserRight

