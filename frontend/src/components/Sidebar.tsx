import { useState } from 'react'
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  IconPlus,
  IconTrash,
  IconDatabase,
  IconTable,
  IconChevronDown,
  IconChevronRight,
  IconSearch,
  IconBoltFilled
} from '@tabler/icons-react'
import type { Query } from '../types'
import { queryApi } from '../api'
import { useDarkMode } from '../contexts/DarkModeContext'

interface SidebarProps {
  queries: Query[]
  onQuerySelect: (query: Query) => void
  onNewQuery: () => void
  onTableClick: (databaseName: string, tableName: string) => void
  refetchQueries: () => void
}

export default function Sidebar({ queries, onQuerySelect, onNewQuery, onTableClick, refetchQueries }: SidebarProps) {
  const { isDarkMode } = useDarkMode()
  const [hoveredQuery, setHoveredQuery] = useState<string | null>(null)
  const [expandedDatabases, setExpandedDatabases] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  const { data: catalog } = useQuery({
    queryKey: ['athenaCatalog'],
    queryFn: () => queryApi.getAthenaCatalog().then(res => res.data),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

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

  const toggleDatabaseExpanded = (databaseName: string) => {
    setExpandedDatabases(prev => {
      const newSet = new Set(prev)
      if (newSet.has(databaseName)) {
        newSet.delete(databaseName)
      } else {
        newSet.add(databaseName)
      }
      return newSet
    })
  }

  // Filter databases and tables based on search query
  const filteredCatalog = React.useMemo(() => {
    if (!catalog || !searchQuery.trim()) {
      return catalog
    }

    const query = searchQuery.toLowerCase().trim()
    
    return {
      databases: catalog.databases.map(database => {
        const databaseNameMatch = database.name.toLowerCase().includes(query)
        const filteredTables = database.tables.filter(table => 
          table.name.toLowerCase().includes(query)
        )

        // Include database if its name matches or if it has matching tables
        if (databaseNameMatch || filteredTables.length > 0) {
          return {
            ...database,
            tables: filteredTables
          }
        }
        return null
      }).filter(Boolean) as typeof catalog.databases
    }
  }, [catalog, searchQuery])

  // Auto-expand databases when searching
  React.useEffect(() => {
    if (searchQuery.trim() && filteredCatalog) {
      const expandedSet = new Set<string>()
      filteredCatalog.databases.forEach(database => {
        if (database.tables.length > 0) {
          expandedSet.add(database.name)
        }
      })
      setExpandedDatabases(expandedSet)
    }
  }, [searchQuery, filteredCatalog])

  return (
    <div className={`w-80 border-r flex flex-col transition-colors ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className={`p-4 border-b transition-colors ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <IconBoltFilled className={`transition-colors ${
              isDarkMode ? 'text-orange-400' : 'text-orange-600'
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
        {/* Queries Section */}
        <div className={`p-4 border-b transition-colors ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
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
                
                <button
                  onClick={(e) => handleDeleteQuery(e, query.id)}
                  className={`ml-2 p-1 rounded transition-all ${
                    hoveredQuery === query.id
                      ? isDarkMode 
                        ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20 opacity-100' 
                        : 'text-red-600 hover:text-red-700 hover:bg-red-50 opacity-100'
                      : 'opacity-0 pointer-events-none'
                  }`}
                  title="Delete Query"
                >
                  <IconTrash size={16} />
                </button>
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

        {/* Data Catalog Section */}
        <div className="p-4">
          <h2 className={`text-sm font-medium mb-3 transition-colors ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>Data Catalog</h2>
          
          {/* Search Input */}
          <div className="mb-3 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <IconSearch size={14} className={`transition-colors ${
                isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`} />
            </div>
            <input
              type="text"
              placeholder="Search tables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 text-xs rounded-md border transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
              } focus:outline-none`}
            />
          </div>
          
          <div className="space-y-1">
            {filteredCatalog?.databases.map((database) => (
              <div key={database.name} className="space-y-1">
                <div
                  className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                    isDarkMode 
                      ? 'hover:bg-gray-700' 
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => toggleDatabaseExpanded(database.name)}
                >
                  <div className="flex items-center space-x-2 flex-1">
                    {expandedDatabases.has(database.name) ? (
                      <IconChevronDown size={16} className={`transition-colors ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`} />
                    ) : (
                      <IconChevronRight size={16} className={`transition-colors ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`} />
                    )}
                    <IconDatabase size={16} className={`transition-colors ${
                      isDarkMode ? 'text-blue-400' : 'text-blue-600'
                    }`} />
                    <span className={`text-sm font-medium truncate transition-colors ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {database.name}
                    </span>
                  </div>
                </div>
                
                {expandedDatabases.has(database.name) && (
                  <div className="ml-6 space-y-1">
                    {database.tables.map((table) => (
                      <div
                        key={`${database.name}.${table.name}`}
                        className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                          isDarkMode 
                            ? 'hover:bg-gray-700' 
                            : 'hover:bg-gray-100'
                        }`}
                        title={`Click to query ${database.name}.${table.name} (${table.type})`}
                        onClick={() => onTableClick(database.name, table.name)}
                      >
                        <div className="flex items-center space-x-2 flex-1">
                          <IconTable size={14} className={`transition-colors ${
                            isDarkMode ? 'text-green-400' : 'text-green-600'
                          }`} />
                          <span className={`text-xs truncate transition-colors ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            {table.name}
                          </span>
                        </div>
                      </div>
                    ))}
                    
                    {database.tables.length === 0 && (
                      <div className={`text-xs text-center py-2 ml-6 transition-colors ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        No tables found
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {!catalog && (
              <div className={`text-sm text-center py-4 transition-colors ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Loading data catalog...
              </div>
            )}
            
            {catalog && filteredCatalog?.databases.length === 0 && (
              <div className={`text-sm text-center py-4 transition-colors ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {searchQuery.trim() ? 'No matching tables found' : 'No databases found in catalog'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}