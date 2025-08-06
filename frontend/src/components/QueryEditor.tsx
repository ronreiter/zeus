import { useCallback, useEffect, useRef } from 'react'
import AceEditor from 'react-ace'
import { IconDeviceFloppy, IconPlayerPlay } from '@tabler/icons-react'
import type { OpenQuery } from '../types'
import { queryApi } from '../api'
import { useDarkMode } from '../contexts/DarkModeContext'

// Import ace editor themes and modes
import 'ace-builds/src-noconflict/mode-sql'
import 'ace-builds/src-noconflict/theme-github'
import 'ace-builds/src-noconflict/theme-monokai'
import 'ace-builds/src-noconflict/ext-language_tools'
import ace from 'ace-builds/src-noconflict/ace'

// Set ace base path to fix dynamic loading issues
ace.config.set('basePath', '/node_modules/ace-builds/src-noconflict/')
ace.config.set('modePath', '/node_modules/ace-builds/src-noconflict/')
ace.config.set('themePath', '/node_modules/ace-builds/src-noconflict/')

interface QueryEditorProps {
  query: OpenQuery
  onQueryUpdate: (updates: Partial<OpenQuery>) => void
  onQuerySave: () => void
  onQueryExecute: (executionId: string) => void
}

export default function QueryEditor({ query, onQueryUpdate, onQuerySave, onQueryExecute }: QueryEditorProps) {
  const { isDarkMode } = useDarkMode()
  const aceEditorRef = useRef<AceEditor>(null)

  const handleSQLChange = useCallback((sql: string) => {
    onQueryUpdate({ sql })
  }, [onQueryUpdate])

  const handleExecute = async () => {
    try {
      if (query.id) {
        // Execute through query run
        const response = await queryApi.executeQuery(query.id, query.sql)
        onQueryExecute(response.data.executionId)
      } else {
        // Direct execution
        const response = await queryApi.executeAthenaQuery(query.sql)
        onQueryExecute(response.data.executionId)
      }
    } catch (error) {
      console.error('Failed to execute query:', error)
    }
  }

  const canSave = query.isUnsaved || query.isDirty

  useEffect(() => {
    // Focus editor when component mounts
    if (aceEditorRef.current) {
      aceEditorRef.current.editor.focus()
    }
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className={`flex items-center justify-between p-4 border-b transition-colors ${
        isDarkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center space-x-2">
          <button
            onClick={onQuerySave}
            disabled={!canSave}
            className={`
              flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium
              ${canSave
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <IconDeviceFloppy size={16} />
            <span>Save Query</span>
          </button>
          
          <button
            onClick={handleExecute}
            className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
          >
            <IconPlayerPlay size={16} />
            <span>Execute</span>
          </button>
        </div>
      </div>

      <div className="flex-1">
        <AceEditor
          ref={aceEditorRef}
          mode="sql"
          theme={isDarkMode ? "monokai" : "github"}
          value={query.sql}
          onChange={handleSQLChange}
          name="sql-editor"
          width="100%"
          height="100%"
          fontSize="14px"
          showPrintMargin={false}
          showGutter={true}
          highlightActiveLine={true}
          setOptions={{
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            enableSnippets: true,
            showLineNumbers: true,
            tabSize: 2,
            wrap: true,
          }}
          editorProps={{
            $blockScrolling: true,
          }}
        />
      </div>
    </div>
  )
}