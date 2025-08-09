import { useState, useCallback, useEffect, useRef } from 'react'
import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { queryApi } from './api'
import type { OpenQuery, Query } from './types'
import Sidebar from './components/Sidebar'
import MainPanel from './components/MainPanel'
import SaveQueryDialog from './components/SaveQueryDialog'
import { DarkModeProvider, useDarkMode } from './contexts/DarkModeContext'

const defaultQuery = "WITH sample_sales AS (\n" +
  "    SELECT *\n" +
  "    FROM (VALUES\n" +
  "        --  order_id |   customer   |   order_date    | amount_usd\n" +
  "        (101,        'Alice',        DATE '2025-08-01',  125.50),\n" +
  "        (102,        'Bob',          DATE '2025-08-02',   70.00),\n" +
  "        (103,        'Carol',        DATE '2025-08-02',  200.00),\n" +
  "        (104,        'Alice',        DATE '2025-08-03',   40.00),\n" +
  "        (105,        'Dave',         DATE '2025-08-03',  350.00)\n" +
  "    ) AS t(order_id, customer, order_date, amount_usd)\n" +
  ")\n" +
  "\n" +
  "-- Example analysis: total sales per customer,\n" +
  "-- only showing customers with > $100 in total purchases\n" +
  "SELECT\n" +
  "    customer,\n" +
  "    ROUND(SUM(amount_usd), 2)      AS total_spend,\n" +
  "    COUNT(*)                       AS orders_placed\n" +
  "FROM sample_sales\n" +
  "GROUP BY customer\n" +
  "HAVING SUM(amount_usd) > 100\n" +
  "ORDER BY total_spend DESC;\n"

function QueryEditor() {
  return (
    <Routes>
      <Route path="/" element={<AppContent />} />
      <Route path="/query/:queryId" element={<AppContent />} />
    </Routes>
  )
}

function AppContent() {
  const { isDarkMode } = useDarkMode()
  const navigate = useNavigate()
  const { queryId } = useParams()
  const [openQueries, setOpenQueries] = useState<OpenQuery[]>([
    {
      name: 'Unsaved Query',
      sql: defaultQuery,
      description: '',
      isUnsaved: true,
      isDirty: false,
    },
  ])
  const [activeQueryIndex, setActiveQueryIndex] = useState(0)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [saveDialogQueryIndex, setSaveDialogQueryIndex] = useState<number | null>(null)
  const isUserInitiatedChange = useRef(false)

  const { data: queries = [], refetch: refetchQueries } = useQuery({
    queryKey: ['queries'],
    queryFn: () => queryApi.getQueries().then(res => res.data),
  })

  const openQuery = useCallback((query: Query) => {
    const existingIndex = openQueries.findIndex(q => q.id === query.id)
    if (existingIndex !== -1) {
      setActiveQueryIndex(existingIndex)
      navigate(`/query/${query.id}`)
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
    navigate(`/query/${query.id}`)
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
      navigate(`/query/${openQueries[activeQueryIndex].id}`)
    }
  }, [queryId, queries, openQueries, activeQueryIndex, navigate, openQuery])

  const handleActiveQueryChange = useCallback((index: number) => {
    isUserInitiatedChange.current = true
    setActiveQueryIndex(index)
    
    // Handle URL navigation for saved queries
    const targetQuery = openQueries[index]
    if (targetQuery?.id && !targetQuery?.isUnsaved) {
      navigate(`/query/${targetQuery.id}`)
    } else {
      navigate('/')
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
    navigate('/')
  }, [openQueries, navigate])

  const createQueryFromTable = useCallback((databaseName: string, tableName: string) => {
    const sql = `SELECT * FROM ${databaseName}.${tableName} LIMIT 100;`
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
    navigate('/')
  }, [openQueries, navigate])

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
        onTableClick={createQueryFromTable}
        refetchQueries={refetchQueries}
      />
      
      <MainPanel
        openQueries={openQueries}
        activeQueryIndex={activeQueryIndex}
        onActiveQueryChange={handleActiveQueryChange}
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
      <QueryEditor />
    </DarkModeProvider>
  )
}

export default App
