'use client'

import { useState, useEffect } from 'react'
import { Box, Grid } from '@mui/material'
import api from '@/lib/api'
import DocumentationHeader from '@/components/documentation/DocumentationHeader'
import Documentations from '@/components/documentation/Documentations'

export default function ModeratorDocumentationPage() {
  const [categories, setCategories] = useState([])
  const [pages, setPages] = useState([])

  useEffect(() => {
    loadCategories()
    loadPages()
  }, [])

  const loadCategories = async () => {
    try {
      const response = await api.get('/moderator/documentation/categories')
      setCategories(response.data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
      setCategories([])
    }
  }

  const loadPages = async () => {
    try {
      const response = await api.get('/moderator/documentation/pages')
      setPages(response.data || [])
    } catch (error) {
      console.error('Error loading pages:', error)
      setPages([])
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <DocumentationHeader
            onAddDocumentation={null}
            onAddCategory={null}
            title="Documentation"
            subtitle="Browse documentation pages and categories"
            showButtons={false}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Documentations
            categories={categories}
            pages={pages}
            onEditPage={null}
            onEditCategory={null}
            onDeleteCategory={null}
            readOnly={true}
          />
        </Grid>
      </Grid>
    </Box>
  )
}
