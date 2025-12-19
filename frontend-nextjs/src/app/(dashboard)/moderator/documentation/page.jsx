'use client'

// React Imports
import { useState, useEffect } from 'react'

// Component Imports
import HelpCenterHeader from '@/views/apps/documentation/HelpCenterHeader'
import Articles from '@/views/apps/documentation/Articles'
import KnowledgeBase from '@/views/apps/documentation/KnowledgeBase'
import { useSettings } from '@core/hooks/useSettings'

const ModeratorDocumentationPage = () => {
  // States
  const [searchValue, setSearchValue] = useState('')

  // Hooks
  const { updatePageSettings } = useSettings()

  // For Page specific settings
  useEffect(() => {
    return updatePageSettings({
      skin: 'default'
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <HelpCenterHeader searchValue={searchValue} setSearchValue={setSearchValue} />
      <Articles />
      <KnowledgeBase />
    </>
  )
}

export default ModeratorDocumentationPage
