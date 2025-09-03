import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IconDownload, IconChevronLeft, IconChevronRight, IconX } from '@tabler/icons-react'
import { queryApi } from '../api'
import { useDarkMode } from '../hooks/useDarkMode'

interface ResultsPanelProps {
  executionId: string
  parameters?: Record<string, string>
  onStatusChange?: (oldStatus: string | undefined, newStatus: string) => void
  onClose?: () => void
}

export default function ResultsPanel({ executionId, parameters, onStatusChange, onClose }: ResultsPanelProps) {
  const { isDarkMode } = useDarkMode()
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const previousStatusRef = useRef<string | undefined>(undefined)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  const { data: results, isLoading, error } = useQuery({
    queryKey: ['queryResults', executionId, page, pageSize],
    queryFn: () => queryApi.getQueryResults(executionId, page, pageSize).then(res => res.data),
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

  // Track status changes and manage timer
  useEffect(() => {
    if (results?.status) {
      const currentStatus = results.status
      const previousStatus = previousStatusRef.current
      
      // Start timer when query starts running
      if ((currentStatus === 'QUEUED' || currentStatus === 'RUNNING') && 
          (!previousStatus || (previousStatus !== 'QUEUED' && previousStatus !== 'RUNNING'))) {
        setStartTime(new Date())
        setElapsedTime(0)
      }
      
      // Stop timer when query completes
      if ((currentStatus === 'SUCCEEDED' || currentStatus === 'FAILED' || currentStatus === 'CANCELLED') &&
          (previousStatus === 'QUEUED' || previousStatus === 'RUNNING')) {
        setStartTime(null)
      }
      
      // Call callback if status changed and query completed
      if (onStatusChange && previousStatus !== currentStatus && 
          (previousStatus === 'QUEUED' || previousStatus === 'RUNNING') &&
          (currentStatus === 'SUCCEEDED' || currentStatus === 'FAILED' || currentStatus === 'CANCELLED')) {
        onStatusChange(previousStatus, currentStatus)
      }
      
      previousStatusRef.current = currentStatus
    }
  }, [results?.status, onStatusChange])

  // Update elapsed time every second while running
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (startTime && (results?.status === 'QUEUED' || results?.status === 'RUNNING')) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((new Date().getTime() - startTime.getTime()) / 1000))
      }, 1000)
    }
    
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [startTime, results?.status])

  const formatElapsedTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`
    } else if (seconds < 3600) {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}m ${secs}s`
    } else {
      const hours = Math.floor(seconds / 3600)
      const mins = Math.floor((seconds % 3600) / 60)
      const secs = seconds % 60
      return `${hours}h ${mins}m ${secs}s`
    }
  }

  const handleExport = async () => {
    try {
      const response = await queryApi.exportResults(executionId)
      
      const blob = response.data // response.data is already a Blob due to responseType: 'blob'
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // Extract filename from Content-Disposition header, fallback to default
      let contentDisposition: string | undefined
      const headers = response.headers
      if (typeof headers.get === 'function') {
        // If headers has a get method (Headers object)
        contentDisposition = (headers.get('content-disposition') || headers.get('Content-Disposition') || undefined) as string | undefined
      } else {
        // If headers is a plain object
        contentDisposition = (headers['content-disposition'] || headers['Content-Disposition']) as string | undefined
      }
      let filename = 'query_results.csv'
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename=([^;]+)/)
        if (filenameMatch) {
          filename = filenameMatch[1].replace(/"/g, '').trim() // Remove quotes and trim
        }
      }
      a.download = filename
      
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
    <div className={`flex flex-col h-80 min-w-0 w-full transition-colors ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <div className={`flex items-center justify-between p-4 border-b transition-colors ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <h3 className={`text-sm font-medium transition-colors ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>Query Results</h3>
            
            {/* Execution date */}
            {results && results.completedAt && (
              <div className={`text-xs transition-colors ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {new Date(results.completedAt).toLocaleString()}
              </div>
            )}
          </div>
          
          {/* Parameters display */}
          {parameters && Object.keys(parameters).length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mt-1">
              <span className={`text-xs transition-colors ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>Parameters:</span>
              {Object.entries(parameters).map(([key, value]) => (
                <span
                  key={key}
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs transition-colors ${
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
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {results && results.status === 'SUCCEEDED' && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className={`p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors ${
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
                className={`p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors ${
                  isDarkMode 
                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <IconChevronRight size={16} />
              </button>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            {results?.status === 'SUCCEEDED' && (
              <button
                onClick={handleExport}
                className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 cursor-pointer"
              >
                <IconDownload size={14} />
                <span>Export to CSV</span>
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className={`p-1 rounded-md transition-colors cursor-pointer ${
                  isDarkMode 
                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title="Close Results"
              >
                <IconX size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
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
        ) : results?.status === 'QUEUED' || results?.status === 'RUNNING' ? (
          <div className="flex items-center justify-center h-full">
            <div className={`text-sm transition-colors ${
              isDarkMode ? 'text-blue-400' : 'text-blue-600'
            }`}>
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                <span>
                  Query is running...
                  {startTime && elapsedTime > 0 && (
                    <span className="ml-1 opacity-75">({formatElapsedTime(elapsedTime)})</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        ) : results?.status === 'FAILED' || results?.status === 'CANCELLED' ? (
          <div className="flex items-center justify-center h-full">
            <div className={`text-sm transition-colors ${
              isDarkMode ? 'text-red-400' : 'text-red-600'
            }`}>
              Query {results.status.toLowerCase()}: {results.errorMessage || 'No details available'}
            </div>
          </div>
        ) : results && results.status === 'SUCCEEDED' && results.columns?.length > 0 && results.rows?.length > 0 ? (
          <div className="overflow-auto h-full">
            <table className={`divide-y transition-colors ${
              isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
            }`}>
              <thead className={`sticky top-0 transition-colors ${
                isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
              }`}>
                <tr>
                  {results.columns?.map((column, index) => (
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
                {results.rows?.map((row, rowIndex) => (
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