import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IconDownload, IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { queryApi } from '../api'
import { useDarkMode } from '../contexts/DarkModeContext'

interface ResultsPanelProps {
  executionId: string
}

export default function ResultsPanel({ executionId }: ResultsPanelProps) {
  const { isDarkMode } = useDarkMode()
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)

  const { data: results, isLoading, error } = useQuery({
    queryKey: ['queryResults', executionId, page, pageSize],
    queryFn: () => queryApi.getQueryResults(executionId, page, pageSize).then(res => {
      console.log(`Query ${executionId} status:`, res.data.status, res.data.errorMessage || '')
      return res.data
    }),
    enabled: !!executionId,
    refetchInterval: (query) => {
      // Poll every 2 seconds if query is still running
      // query.state.data contains the actual response data
      const data = query.state.data
      if (data?.status === 'QUEUED' || data?.status === 'RUNNING') {
        return 2000
      }
      return false
    },
  })

  const handleExport = async () => {
    try {
      const response = await queryApi.exportResults(executionId)
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'query_results.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to export results:', error)
    }
  }

  const totalPages = results ? Math.ceil(results.total / pageSize) : 0

  return (
    <div className={`flex flex-col h-80 transition-colors ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <div className={`flex items-center justify-between p-4 border-b transition-colors ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <h3 className={`text-sm font-medium transition-colors ${
          isDarkMode ? 'text-gray-200' : 'text-gray-700'
        }`}>Query Results</h3>
        
        <div className="flex items-center space-x-4">
          {results && results.status === 'SUCCEEDED' && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className={`p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                  isDarkMode 
                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <IconChevronLeft size={16} />
              </button>
              
              <span className={`text-sm transition-colors ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Page {page} of {totalPages} ({results.total} total)
              </span>
              
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className={`p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                  isDarkMode 
                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <IconChevronRight size={16} />
              </button>
            </div>
          )}
          
          {results?.status === 'SUCCEEDED' && (
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
            >
              <IconDownload size={14} />
              <span>Export to CSV</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className={`text-sm transition-colors ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>Loading results...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className={`text-sm transition-colors ${
              isDarkMode ? 'text-red-400' : 'text-red-600'
            }`}>
              Error loading results: {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          </div>
        ) : results?.status === 'QUEUED' ? (
          <div className="flex items-center justify-center h-full">
            <div className={`text-sm transition-colors ${
              isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
            }`}>Query is queued for execution...</div>
          </div>
        ) : results?.status === 'RUNNING' ? (
          <div className="flex items-center justify-center h-full">
            <div className={`text-sm transition-colors ${
              isDarkMode ? 'text-blue-400' : 'text-blue-600'
            }`}>Query is running...</div>
          </div>
        ) : results?.status === 'FAILED' || results?.status === 'CANCELLED' ? (
          <div className="flex items-center justify-center h-full">
            <div className={`text-sm transition-colors ${
              isDarkMode ? 'text-red-400' : 'text-red-600'
            }`}>
              Query {results.status.toLowerCase()}: {results.errorMessage || 'No details available'}
            </div>
          </div>
        ) : results && results.status === 'SUCCEEDED' && results.columns.length > 0 ? (
          <div className="overflow-auto">
            <table className={`min-w-full divide-y transition-colors ${
              isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
            }`}>
              <thead className={`sticky top-0 transition-colors ${
                isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
              }`}>
                <tr>
                  {results.columns.map((column, index) => (
                    <th
                      key={index}
                      className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap transition-colors ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y transition-colors ${
                isDarkMode 
                  ? 'bg-gray-800 divide-gray-700' 
                  : 'bg-white divide-gray-200'
              }`}>
                {results.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className={`transition-colors ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                  }`}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className={`px-6 py-4 text-sm whitespace-nowrap transition-colors ${
                          isDarkMode ? 'text-gray-200' : 'text-gray-900'
                        }`}
                      >
                        {cell || <span className={`transition-colors ${
                          isDarkMode ? 'text-gray-500' : 'text-gray-400'
                        }`}>null</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className={`text-sm transition-colors ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>No results to display</div>
          </div>
        )}
      </div>
    </div>
  )
}