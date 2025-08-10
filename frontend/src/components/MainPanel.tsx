import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { IconPlus, IconSun, IconMoon } from '@tabler/icons-react'
import type { OpenQuery } from '../types'
import QueryTabs from './QueryTabs'
import QueryEditor from './QueryEditor'
import QueryRunsList from './QueryRunsList'
import ResultsPanel from './ResultsPanel'
import { useDarkMode } from '../contexts/DarkModeContext'

interface MainPanelProps {
  openQueries: OpenQuery[]
  activeQueryIndex: number
  onActiveQueryChange: (index: number) => void
  onQueryUpdate: (index: number, updates: Partial<OpenQuery>) => void
  onQueryClose: (index: number) => void
  onQuerySave: (index: number) => void
  onNewQuery: () => void
}

export default function MainPanel({
  openQueries,
  activeQueryIndex,
  onActiveQueryChange,
  onQueryUpdate,
  onQueryClose,
  onQuerySave,
  onNewQuery
}: MainPanelProps) {
  const { isDarkMode, toggleDarkMode } = useDarkMode()
  const queryClient = useQueryClient()
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null)
  const [resultsKey, setResultsKey] = useState(0)

  const activeQuery = openQueries[activeQueryIndex]

  // Reset results when switching between queries
  useEffect(() => {
    setCurrentExecutionId(null)
    setResultsKey(prev => prev + 1)
  }, [activeQueryIndex])

  const handleQueryExecute = (executionId: string) => {
    setCurrentExecutionId(executionId)
    setResultsKey(prev => prev + 1) // Force re-render of results
    
    // Immediately invalidate and refetch query runs to show the new run
    if (activeQuery.id) {
      queryClient.invalidateQueries({ queryKey: ['queryRuns', activeQuery.id] })
    }
  }

  const handleRunClick = (executionId: string) => {
    setCurrentExecutionId(executionId)
    setResultsKey(prev => prev + 1) // Force re-render of results
  }

  const handleStatusChange = () => {
    // Force refresh the query runs list when a query completes
    if (activeQuery.id) {
      queryClient.invalidateQueries({ queryKey: ['queryRuns', activeQuery.id] })
    }
  }

  if (!activeQuery) {
    return (
      <div className={`flex-1 flex items-center justify-center transition-colors ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className={`transition-colors ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>No query selected</div>
      </div>
    )
  }

  return (
    <div className={`flex-1 flex flex-col transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <div className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className={`px-6 py-3 border-b ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white'}`}>
          <div className="flex items-center justify-between">
            <h1 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Query Editor</h1>
            <div className="flex items-center space-x-3">
              <button
                onClick={onNewQuery}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                title="New Query"
              >
                <IconPlus size={16} />
                <span>New Query</span>
              </button>
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-md transition-colors cursor-pointer ${
                  isDarkMode 
                    ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? <IconSun size={20} /> : <IconMoon size={20} />}
              </button>
            </div>
          </div>
        </div>
        
        <QueryTabs
          queries={openQueries}
          activeIndex={activeQueryIndex}
          onActiveChange={onActiveQueryChange}
          onQueryClose={onQueryClose}
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 flex flex-col min-w-0">
            <QueryEditor
              query={activeQuery}
              onQueryUpdate={(updates) => onQueryUpdate(activeQueryIndex, updates)}
              onQuerySave={() => onQuerySave(activeQueryIndex)}
              onQueryExecute={handleQueryExecute}
            />
          </div>
          
          <div className="w-80 border-l border-gray-200">
            <QueryRunsList queryId={activeQuery.id} onRunClick={handleRunClick} />
          </div>
        </div>
        
        {currentExecutionId && (
          <div className="border-t border-gray-200">
            <ResultsPanel 
              key={resultsKey} 
              executionId={currentExecutionId}
              onStatusChange={handleStatusChange}
            />
          </div>
        )}
      </div>
    </div>
  )
}