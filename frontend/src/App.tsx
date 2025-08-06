import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryApi } from './api'
import type { OpenQuery, Query } from './types'
import Sidebar from './components/Sidebar'
import MainPanel from './components/MainPanel'
import SaveQueryDialog from './components/SaveQueryDialog'
import { DarkModeProvider, useDarkMode } from './contexts/DarkModeContext'

function AppContent() {
  const { isDarkMode } = useDarkMode()
  const [openQueries, setOpenQueries] = useState<OpenQuery[]>([
    {
      name: 'Unsaved Query',
      sql: '-- Enter your SQL query here\nSELECT * FROM users LIMIT 10;',
      description: '',
      isUnsaved: true,
      isDirty: false,
    },
  ])
  const [activeQueryIndex, setActiveQueryIndex] = useState(0)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [saveDialogQueryIndex, setSaveDialogQueryIndex] = useState<number | null>(null)

  const { data: queries = [], refetch: refetchQueries } = useQuery({
    queryKey: ['queries'],
    queryFn: () => queryApi.getQueries().then(res => res.data),
  })

  const openQuery = useCallback((query: Query) => {
    const existingIndex = openQueries.findIndex(q => q.id === query.id)
    if (existingIndex !== -1) {
      setActiveQueryIndex(existingIndex)
      return
    }

    const newQuery: OpenQuery = {
      id: query.id,
      name: query.name,
      sql: query.sql,
      description: query.description,
      isUnsaved: false,
      isDirty: false,
    }

    setOpenQueries(prev => [...prev, newQuery])
    setActiveQueryIndex(openQueries.length)
  }, [openQueries])

  const createNewQuery = useCallback(() => {
    const newQuery: OpenQuery = {
      name: 'Unsaved Query',
      sql: '-- Enter your SQL query here\n',
      description: '',
      isUnsaved: true,
      isDirty: false,
    }

    setOpenQueries(prev => [...prev, newQuery])
    setActiveQueryIndex(openQueries.length)
  }, [openQueries])

  const closeQuery = useCallback((index: number) => {
    setOpenQueries(prev => prev.filter((_, i) => i !== index))
    if (activeQueryIndex >= index && activeQueryIndex > 0) {
      setActiveQueryIndex(prev => prev - 1)
    }
    if (openQueries.length === 1) {
      createNewQuery()
    }
  }, [activeQueryIndex, openQueries.length, createNewQuery])

  const updateQuery = useCallback((index: number, updates: Partial<OpenQuery>) => {
    setOpenQueries(prev => prev.map((q, i) => {
      if (i === index) {
        const updated = { ...q, ...updates }
        if (updates.sql !== undefined && updates.sql !== q.sql) {
          updated.isDirty = true
        }
        return updated
      }
      return q
    }))
  }, [])

  const saveQuery = useCallback((index: number, name: string) => {
    setSaveDialogOpen(false)
    setSaveDialogQueryIndex(null)

    const query = openQueries[index]
    if (!query) return

    if (query.isUnsaved) {
      queryApi.createQuery({
        name,
        sql: query.sql,
        description: query.description,
      }).then((response) => {
        const savedQuery = response.data
        updateQuery(index, {
          id: savedQuery.id,
          name: savedQuery.name,
          isUnsaved: false,
          isDirty: false,
        })
        refetchQueries()
      })
    } else {
      queryApi.updateQuery(query.id!, {
        name,
        sql: query.sql,
        description: query.description,
      }).then((response) => {
        const savedQuery = response.data
        updateQuery(index, {
          name: savedQuery.name,
          isDirty: false,
        })
        refetchQueries()
      })
    }
  }, [openQueries, updateQuery, refetchQueries])

  const openSaveDialog = useCallback((index: number) => {
    setSaveDialogQueryIndex(index)
    setSaveDialogOpen(true)
  }, [])

  return (
    <div className={`flex h-screen transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Sidebar
        queries={queries}
        onQuerySelect={openQuery}
        onNewQuery={createNewQuery}
        refetchQueries={refetchQueries}
      />
      
      <MainPanel
        openQueries={openQueries}
        activeQueryIndex={activeQueryIndex}
        onActiveQueryChange={setActiveQueryIndex}
        onQueryUpdate={updateQuery}
        onQueryClose={closeQuery}
        onQuerySave={openSaveDialog}
        onNewQuery={createNewQuery}
      />

      <SaveQueryDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        onSave={(name) => {
          if (saveDialogQueryIndex !== null) {
            saveQuery(saveDialogQueryIndex, name)
          }
        }}
        initialName={saveDialogQueryIndex !== null ? openQueries[saveDialogQueryIndex]?.name : ''}
      />
    </div>
  )
}

function App() {
  return (
    <DarkModeProvider>
      <AppContent />
    </DarkModeProvider>
  )
}

export default App
