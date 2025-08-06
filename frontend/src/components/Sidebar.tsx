import { useState } from 'react'
import { IconPlus, IconTrash, IconBolt } from '@tabler/icons-react'
import type { Query } from '../types'
import { queryApi } from '../api'
import { useDarkMode } from '../contexts/DarkModeContext'

interface SidebarProps {
  queries: Query[]
  onQuerySelect: (query: Query) => void
  onNewQuery: () => void
  refetchQueries: () => void
}

export default function Sidebar({ queries, onQuerySelect, onNewQuery, refetchQueries }: SidebarProps) {
  const { isDarkMode } = useDarkMode()
  const [hoveredQuery, setHoveredQuery] = useState<string | null>(null)

  const handleDeleteQuery = async (e: React.MouseEvent, queryId: string) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this query?')) {
      try {
        await queryApi.deleteQuery(queryId)
        refetchQueries()
      } catch (error) {
        console.error('Failed to delete query:', error)
      }
    }
  }

  return (
    <div className={`w-80 border-r flex flex-col transition-colors ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className={`p-4 border-b transition-colors ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <IconBolt className={`transition-colors ${
              isDarkMode ? 'text-blue-400' : 'text-blue-600'
            }`} size={24} />
            <h1 className={`text-xl font-semibold transition-colors ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Zeus</h1>
          </div>
          <button
            onClick={onNewQuery}
            className={`p-2 rounded-md transition-colors ${
              isDarkMode 
                ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title="New Query"
          >
            <IconPlus size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-4">
          <h2 className={`text-sm font-medium mb-3 transition-colors ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>Queries</h2>
          <div className="space-y-1">
            {queries.map((query) => (
              <div
                key={query.id}
                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  isDarkMode 
                    ? 'hover:bg-gray-700' 
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => onQuerySelect(query)}
                onMouseEnter={() => setHoveredQuery(query.id)}
                onMouseLeave={() => setHoveredQuery(null)}
              >
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate transition-colors ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {query.name}
                  </div>
                  {query.description && (
                    <div className={`text-xs truncate mt-1 transition-colors ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {query.description}
                    </div>
                  )}
                </div>
                
                {hoveredQuery === query.id && (
                  <button
                    onClick={(e) => handleDeleteQuery(e, query.id)}
                    className={`ml-2 p-1 rounded transition-colors ${
                      isDarkMode 
                        ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20' 
                        : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                    }`}
                    title="Delete Query"
                  >
                    <IconTrash size={16} />
                  </button>
                )}
              </div>
            ))}
            
            {queries.length === 0 && (
              <div className={`text-sm text-center py-8 transition-colors ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                No saved queries yet.<br />
                Create your first query to get started.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}