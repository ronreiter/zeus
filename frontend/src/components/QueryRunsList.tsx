import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IconTrash, IconRefresh, IconLoader } from '@tabler/icons-react'
import { queryApi } from '../api'

interface QueryRunsListProps {
  queryId?: string
  onRunClick?: (executionId: string) => void
}

export default function QueryRunsList({ queryId, onRunClick }: QueryRunsListProps) {
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
        return 'bg-yellow-100 text-yellow-800'
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!queryId) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-700">Query Runs</h3>
        </div>
        <div className="text-sm text-gray-500 text-center py-8">
          Save the query to see execution history
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Query Runs</h3>
          <button
            onClick={() => refetch()}
            className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
            title="Refresh"
          >
            <IconRefresh size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="text-sm text-gray-500 text-center py-8">
            Loading runs...
          </div>
        ) : queryRuns.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-8">
            No query runs yet.<br />
            Execute the query to see results.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {queryRuns.map((run) => (
              <div
                key={run.id}
                className="group px-4 py-3 hover:bg-gray-50 cursor-pointer"
                onMouseEnter={() => setHoveredRun(run.id)}
                onMouseLeave={() => setHoveredRun(null)}
                onClick={() => onRunClick?.(run.executionId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(run.status)}`}>
                      {run.status === 'RUNNING' && (
                        <IconLoader size={12} className="mr-1 animate-spin" />
                      )}
                      {run.status}
                    </span>
                    <div className="text-xs text-gray-500">
                      {new Date(run.executedAt).toLocaleString()}
                    </div>
                  </div>
                  
                  {hoveredRun === run.id && (
                    <button
                      onClick={(e) => handleDeleteRun(e, run.id)}
                      className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                      title="Delete Run"
                    >
                      <IconTrash size={14} />
                    </button>
                  )}
                </div>
                
                {run.errorMessage && (
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded mt-2">
                    {run.errorMessage}
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