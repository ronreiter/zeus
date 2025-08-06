import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IconDownload, IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { queryApi } from '../api'

interface ResultsPanelProps {
  executionId: string
}

export default function ResultsPanel({ executionId }: ResultsPanelProps) {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)

  const { data: results, isLoading, error } = useQuery({
    queryKey: ['queryResults', executionId, page, pageSize],
    queryFn: () => queryApi.getQueryResults(executionId, page, pageSize).then(res => res.data),
    enabled: !!executionId,
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
    <div className="flex flex-col h-80 bg-white">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-700">Query Results</h3>
        
        <div className="flex items-center space-x-4">
          {results && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <IconChevronLeft size={16} />
              </button>
              
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages} ({results.total} total)
              </span>
              
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <IconChevronRight size={16} />
              </button>
            </div>
          )}
          
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            <IconDownload size={14} />
            <span>Export to CSV</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-gray-500">Loading results...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-red-600">
              Error loading results: {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          </div>
        ) : results && results.columns.length > 0 ? (
          <div className="overflow-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {results.columns.map((column, index) => (
                    <th
                      key={index}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap"
                      >
                        {cell || <span className="text-gray-400">null</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-gray-500">No results to display</div>
          </div>
        )}
      </div>
    </div>
  )
}