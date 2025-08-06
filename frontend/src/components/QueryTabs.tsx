import { IconX } from '@tabler/icons-react'
import type { OpenQuery } from '../types'

interface QueryTabsProps {
  queries: OpenQuery[]
  activeIndex: number
  onActiveChange: (index: number) => void
  onQueryClose: (index: number) => void
}

export default function QueryTabs({ queries, activeIndex, onActiveChange, onQueryClose }: QueryTabsProps) {
  return (
    <div className="flex border-b border-gray-200">
      {queries.map((query, index) => (
        <div
          key={index}
          className={`
            flex items-center px-4 py-2 border-r border-gray-200 cursor-pointer
            ${index === activeIndex 
              ? 'bg-white border-b-white -mb-px' 
              : 'bg-gray-50 hover:bg-gray-100'
            }
          `}
        >
          <button
            onClick={() => onActiveChange(index)}
            className="flex items-center space-x-2 mr-2"
          >
            <span className="text-sm font-medium truncate max-w-32">
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
              className="p-1 hover:bg-gray-200 rounded"
            >
              <IconX size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}