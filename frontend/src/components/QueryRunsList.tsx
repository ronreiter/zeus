import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IconTrash, IconRefresh, IconLoader } from '@tabler/icons-react'
import { queryApi } from '../api'
import { useDarkMode } from '../contexts/DarkModeContext'
import type { QueryRun } from '../types'

interface QueryRunsListProps {
  queryId?: string
  onRunClick?: (queryRun: QueryRun) => void
}

export default function QueryRunsList({ queryId, onRunClick }: QueryRunsListProps) {
  const { isDarkMode } = useDarkMode()
  const [hoveredRun, setHoveredRun] = useState<string | null>(null)

  const { data: queryRuns = [], refetch, isLoading } = useQuery({
    queryKey: ['queryRuns', queryId],
    queryFn: () => queryId ? queryApi.getQueryRuns(queryId).then(res => res.data) : Promise.resolve([]),
    enabled: !!queryId,
    refetchInterval: 5000, // Refetch every 5 seconds to update status
    staleTime: 0, // Always consider data stale to ensure fresh fetches
    refetchOnWindowFocus: true, // Refetch when window regains focus
  })

  const handleDeleteRun = async (e: React.MouseEvent, runId: string) => {
    e.stopPropagation()
    try {
      await queryApi.deleteQueryRun(runId)
      refetch()
    } catch (error) {
      console.error('Failed to delete query run:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCEEDED':
        return 'bg-green-100 text-green-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      case 'RUNNING':
        return 'bg-blue-100 text-blue-800'
      case 'QUEUED':
        return 'bg-blue-100 text-blue-800'  // Same as RUNNING
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!queryId) {
    return (
      <div className={`p-4 transition-colors ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-sm font-medium transition-colors ${
            isDarkMode ? 'text-gray-200' : 'text-gray-700'
          }`}>Query Runs</h3>
        </div>
        <div className={`text-sm text-center py-8 transition-colors ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          Save the query to see execution history
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full transition-colors ${
      isDarkMode ? 'bg-gray-800' : 'bg-white'
    }`}>
      <div className={`p-4 border-b transition-colors ${
        isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
      }`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-sm font-medium transition-colors ${
            isDarkMode ? 'text-gray-200' : 'text-gray-700'
          }`}>Query Runs</h3>
          <button
            onClick={() => refetch()}
            className={`p-1 rounded transition-colors cursor-pointer ${
              isDarkMode 
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title="Refresh"
          >
            <IconRefresh size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className={`text-sm text-center py-8 transition-colors ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            Loading runs...
          </div>
        ) : queryRuns.length === 0 ? (
          <div className={`text-sm text-center py-8 transition-colors ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            No query runs yet.<br />
            Execute the query to see results.
          </div>
        ) : (
          <div className={`divide-y transition-colors ${
            isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
          }`}>
            {queryRuns.map((run) => (
              <div
                key={run.id}
                className={`group px-4 py-3 cursor-pointer transition-colors ${
                  isDarkMode 
                    ? 'hover:bg-gray-700' 
                    : 'hover:bg-gray-50'
                }`}
                onMouseEnter={() => setHoveredRun(run.id)}
                onMouseLeave={() => setHoveredRun(null)}
                onClick={() => onRunClick?.(run)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(run.status)}`}>
                      {(run.status === 'RUNNING' || run.status === 'QUEUED') && (
                        <IconLoader size={12} className="mr-1 animate-spin" />
                      )}
                      {run.status === 'QUEUED' ? 'Running' : run.status}
                    </span>
                    <div className={`text-xs transition-colors ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {new Date(run.executedAt).toLocaleString()}
                    </div>
                  </div>
                  
                  {hoveredRun === run.id && (
                    <button
                      onClick={(e) => handleDeleteRun(e, run.id)}
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        isDarkMode 
                          ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20' 
                          : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                      }`}
                      title="Delete Run"
                    >
                      <IconTrash size={14} />
                    </button>
                  )}
                </div>
                
                {run.errorMessage && (
                  <div className={`text-xs p-2 rounded mt-2 transition-colors ${
                    isDarkMode 
                      ? 'text-red-300 bg-red-900/20' 
                      : 'text-red-600 bg-red-50'
                  }`}>
                    {run.errorMessage}
                  </div>
                )}
                
                {run.parameters && Object.keys(run.parameters).length > 0 && (
                  <div className="mt-2">
                    <div className={`text-xs font-medium mb-1 transition-colors ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      Parameters:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(run.parameters).map(([key, value]) => (
                        <span
                          key={key}
                          className={`inline-flex items-center px-2 py-1 rounded text-xs transition-colors ${
                            isDarkMode 
                              ? 'bg-gray-700 text-gray-200 border border-gray-600' 
                              : 'bg-gray-100 text-gray-700 border border-gray-300'
                          }`}
                        >
                          <span className="font-medium">{key}:</span>
                          <span className="ml-1">{value}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}