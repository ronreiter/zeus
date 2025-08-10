import { useState, useCallback, useEffect, useRef } from 'react'
import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { queryApi } from './api'
import type { OpenQuery, Query } from './types'
import Sidebar from './components/Sidebar'
import MainPanel from './components/MainPanel'
import SaveQueryDialog from './components/SaveQueryDialog'
import { DarkModeProvider } from './contexts/DarkModeContext'
import { useDarkMode } from './hooks/useDarkMode'
import { useLocalStorage } from './hooks/useLocalStorage'
import { createQueryUrl } from './utils/slug'


function QueryEditor() {
  return (
    <Routes>
      <Route path="/" element={<AppContent />} />
      <Route path="/query/:queryId" element={<AppContent />} />
      <Route path="/query/:queryId/:slug" element={<AppContent />} />
    </Routes>
  )
}

function AppContent() {
  const { isDarkMode } = useDarkMode()
  const navigate = useNavigate()
  const { queryId } = useParams()
  const [openQueries, setOpenQueries] = useLocalStorage<OpenQuery[]>('zeus-open-queries', [])
  const [activeQueryIndex, setActiveQueryIndex] = useLocalStorage<number>('zeus-active-query-index', -1)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [saveDialogQueryIndex, setSaveDialogQueryIndex] = useState<number | null>(null)
  const [editQueryId, setEditQueryId] = useState<string | null>(null)
  const isUserInitiatedChange = useRef(false)

  const { data: queries = [], refetch: refetchQueries } = useQuery({
    queryKey: ['queries'],
    queryFn: () => queryApi.getQueries().then(res => res.data),
  })

  // Clean up localStorage queries that no longer exist in the database
  useEffect(() => {
    if (queries.length > 0 && openQueries.length > 0) {
      const existingQueryIds = new Set(queries.map(q => q.id))
      const validOpenQueries = openQueries.filter(oq => 
        !oq.id || existingQueryIds.has(oq.id)
      )
      
      if (validOpenQueries.length !== openQueries.length) {
        setOpenQueries(validOpenQueries)
        // Adjust activeQueryIndex if it's out of bounds
        if (activeQueryIndex >= validOpenQueries.length) {
          setActiveQueryIndex(validOpenQueries.length > 0 ? validOpenQueries.length - 1 : -1)
        }
      }
    }
  }, [queries, openQueries, activeQueryIndex, setOpenQueries, setActiveQueryIndex])

  const openQuery = useCallback((query: Query) => {
    const existingIndex = openQueries.findIndex(q => q.id === query.id)
    if (existingIndex !== -1) {
      setActiveQueryIndex(existingIndex)
      navigate(createQueryUrl(query.id, query.name), { replace: true })
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
    navigate(createQueryUrl(query.id, query.name), { replace: true })
  }, [openQueries, navigate])

  // Handle URL-based query loading
  useEffect(() => {
    if (isUserInitiatedChange.current) {
      // Reset flag and skip URL logic for user-initiated changes
      isUserInitiatedChange.current = false
      return
    }

    if (queryId && queries.length > 0) {
      const query = queries.find(q => q.id === queryId)
      if (query) {
        const existingIndex = openQueries.findIndex(q => q.id === queryId)
        if (existingIndex === -1) {
          // Query not open, open it
          openQuery(query)
        } else {
          // Query already open, just activate it
          setActiveQueryIndex(existingIndex)
        }
      }
    } else if (!queryId && openQueries.length > 0 && openQueries[activeQueryIndex]?.id && !openQueries[activeQueryIndex]?.isUnsaved) {
      // No queryId in URL but we have an active saved query, update URL
      const activeQuery = openQueries[activeQueryIndex]
      navigate(createQueryUrl(activeQuery.id!, activeQuery.name))
    }
  }, [queryId, queries, openQueries, activeQueryIndex, navigate, openQuery])

  const handleActiveQueryChange = useCallback((index: number) => {
    isUserInitiatedChange.current = true
    setActiveQueryIndex(index)
    
    // Handle URL navigation for saved queries
    const targetQuery = openQueries[index]
    if (targetQuery?.id && !targetQuery?.isUnsaved) {
      navigate(createQueryUrl(targetQuery.id, targetQuery.name), { replace: true })
    } else {
      navigate('/', { replace: true })
    }
  }, [openQueries, navigate])

  const createNewQuery = useCallback(() => {
    const newQuery: OpenQuery = {
      name: 'Unsaved Query',
      sql: '-- Enter your SQL query here\n',
      description: '',
      isUnsaved: true,
      isDirty: false,
    }

    setOpenQueries(prev => [...prev, newQuery])
    isUserInitiatedChange.current = true
    setActiveQueryIndex(openQueries.length)
    navigate('/', { replace: true })
  }, [openQueries, navigate])

  const createQueryFromTable = useCallback((databaseName: string, tableName: string) => {
    const sql = `SELECT * FROM "${databaseName}"."${tableName}" LIMIT 100;`
    const newQuery: OpenQuery = {
      name: `Query ${tableName}`,
      sql: sql,
      description: `Query to explore ${databaseName}.${tableName}`,
      isUnsaved: true,
      isDirty: false,
    }

    setOpenQueries(prev => [...prev, newQuery])
    isUserInitiatedChange.current = true
    setActiveQueryIndex(openQueries.length)
    navigate('/', { replace: true })
  }, [openQueries, navigate])

  const closeQuery = useCallback((index: number) => {
    setOpenQueries(prev => prev.filter((_, i) => i !== index))
    
    // Update active query index
    if (openQueries.length === 1) {
      // Last query being closed, no active query
      setActiveQueryIndex(-1)
      navigate('/', { replace: true })
    } else if (activeQueryIndex === index) {
      // Active query being closed, select previous or first query
      const newIndex = index > 0 ? index - 1 : 0
      setActiveQueryIndex(newIndex)
    } else if (activeQueryIndex > index) {
      // Active query is after the closed one, shift index down
      setActiveQueryIndex(prev => prev - 1)
    }
  }, [activeQueryIndex, openQueries.length, navigate])

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

  const saveQuery = useCallback((index: number, name?: string) => {
    const query = openQueries[index]
    if (!query) return

    if (query.isUnsaved) {
      // For new queries, we need a name, so open the dialog if no name provided
      if (!name) {
        setSaveDialogQueryIndex(index)
        setSaveDialogOpen(true)
        return
      }
      
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
        setSaveDialogOpen(false)
        setSaveDialogQueryIndex(null)
        
        // Update URL to include the query ID and slug
        if (index === activeQueryIndex) {
          navigate(createQueryUrl(savedQuery.id, savedQuery.name))
        }
      })
    } else {
      // For existing queries, save directly without asking for name
      queryApi.updateQuery(query.id!, {
        name: query.name, // Use existing name
        sql: query.sql,
        description: query.description,
      }).then((response) => {
        const savedQuery = response.data
        updateQuery(index, {
          name: savedQuery.name,
          isDirty: false,
        })
        refetchQueries()
        
        // Update URL if this is the active query and name might have changed
        if (index === activeQueryIndex) {
          navigate(createQueryUrl(savedQuery.id, savedQuery.name))
        }
      })
    }
  }, [openQueries, updateQuery, refetchQueries, navigate, activeQueryIndex])

  const handleSaveQuery = useCallback((index: number) => {
    const query = openQueries[index]
    if (!query) return
    
    // If it's an existing query, save directly
    if (!query.isUnsaved) {
      saveQuery(index)
    } else {
      // If it's a new query, open the save dialog
      setSaveDialogQueryIndex(index)
      setSaveDialogOpen(true)
    }
  }, [openQueries, saveQuery])

  const handleRenameQuery = useCallback((queryId: string, newName: string) => {
    const query = queries.find(q => q.id === queryId)
    if (!query) return

    queryApi.updateQuery(queryId, {
      name: newName,
      sql: query.sql,
      description: query.description,
    }).then((response) => {
      const savedQuery = response.data
      refetchQueries()
      setEditQueryId(null)
      
      // Update any open queries with the same ID
      setOpenQueries(prev => prev.map(q => 
        q.id === queryId ? { ...q, name: savedQuery.name } : q
      ))
      
      // Update URL if this is the active query
      const activeQuery = openQueries[activeQueryIndex]
      if (activeQuery?.id === queryId) {
        navigate(createQueryUrl(savedQuery.id, savedQuery.name), { replace: true })
      }
    }).catch(error => {
      console.error('Failed to rename query:', error)
      setEditQueryId(null)
    })
  }, [queries, refetchQueries, openQueries, activeQueryIndex, navigate])

  return (
    <div className={`flex h-screen transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Sidebar
        queries={queries}
        onQuerySelect={openQuery}
        onTableClick={createQueryFromTable}
        onQueryRename={handleRenameQuery}
        editQueryId={editQueryId}
        onEditQueryId={setEditQueryId}
        refetchQueries={refetchQueries}
      />
      
      <MainPanel
        openQueries={openQueries}
        activeQueryIndex={activeQueryIndex}
        onActiveQueryChange={handleActiveQueryChange}
        onQueryUpdate={updateQuery}
        onQueryClose={closeQuery}
        onQuerySave={handleSaveQuery}
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
      <QueryEditor />
    </DarkModeProvider>
  )
}

export default App
