import { IconX } from '@tabler/icons-react'
import type { OpenQuery } from '../types'
import { useDarkMode } from '../contexts/DarkModeContext'

interface QueryTabsProps {
  queries: OpenQuery[]
  activeIndex: number
  onActiveChange: (index: number) => void
  onQueryClose: (index: number) => void
}

export default function QueryTabs({ queries, activeIndex, onActiveChange, onQueryClose }: QueryTabsProps) {
  const { isDarkMode } = useDarkMode()
  
  return (
    <div className={`flex border-b transition-colors ${
      isDarkMode ? 'border-gray-700' : 'border-gray-200'
    }`}>
      {queries.map((query, index) => (
        <div
          key={index}
          className={`
            flex items-center px-4 py-2 border-r cursor-pointer transition-colors
            ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}
            ${index === activeIndex 
              ? isDarkMode
                ? 'bg-gray-900 border-b-gray-900 -mb-px'
                : 'bg-white border-b-white -mb-px'
              : isDarkMode
                ? 'bg-gray-800 hover:bg-gray-700'
                : 'bg-gray-50 hover:bg-gray-100'
            }
          `}
        >
          <button
            onClick={() => onActiveChange(index)}
            className="flex items-center space-x-2 mr-2"
          >
            <span className={`text-sm font-medium truncate max-w-32 transition-colors ${
              query.isUnsaved 
                ? isDarkMode
                  ? 'italic text-gray-400'
                  : 'italic text-gray-500'
                : isDarkMode
                  ? 'text-gray-100'
                  : 'text-gray-900'
            }`}>
              {query.name}
              {query.isDirty && !query.isUnsaved && <span className="text-orange-500">*</span>}
            </span>
          </button>
          
          {queries.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onQueryClose(index)
              }}
              className={`p-1 rounded transition-colors ${
                isDarkMode 
                  ? 'hover:bg-gray-600' 
                  : 'hover:bg-gray-200'
              }`}
            >
              <IconX size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}