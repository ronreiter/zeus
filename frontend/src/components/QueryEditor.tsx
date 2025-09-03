import { useCallback, useEffect, useRef, useState } from 'react'
import AceEditor from 'react-ace'
import { IconDeviceFloppy, IconPlayerPlay, IconCode } from '@tabler/icons-react'
import { format } from 'sql-formatter'
import { useQuery } from '@tanstack/react-query'
import type { OpenQuery } from '../types'
import { queryApi } from '../api'
import { useDarkMode } from '../hooks/useDarkMode'
import QueryParameters from './QueryParameters'
import { extractParameters, validateParameters } from '../utils/queryParameters'

// Import ace editor themes and modes
import 'ace-builds/src-noconflict/mode-sql'
import 'ace-builds/src-noconflict/theme-github'
import 'ace-builds/src-noconflict/theme-monokai'
import 'ace-builds/src-noconflict/ext-language_tools'
import ace from 'ace-builds/src-noconflict/ace'
import '../themes/monokai-blue.js'

// Set ace base path to fix dynamic loading issues
ace.config.set('basePath', '/node_modules/ace-builds/src-noconflict/')
ace.config.set('modePath', '/node_modules/ace-builds/src-noconflict/')
ace.config.set('themePath', '/node_modules/ace-builds/src-noconflict/')

interface QueryEditorProps {
  query: OpenQuery
  onQueryUpdate: (updates: Partial<OpenQuery>) => void
  onQuerySave: () => void
  onQueryExecute: (executionId: string) => void
  initialParameters?: Record<string, string>
}

export default function QueryEditor({ query, onQueryUpdate, onQuerySave, onQueryExecute, initialParameters }: QueryEditorProps) {
  const { isDarkMode } = useDarkMode()
  const aceEditorRef = useRef<AceEditor>(null)
  const [parameterValues, setParameterValues] = useState<Record<string, string>>({})
  const [errorDialog, setErrorDialog] = useState<{ show: boolean; message: string }>({ show: false, message: '' })
  const [previousSQL, setPreviousSQL] = useState(query.sql)

  // Fetch Athena catalog for autocomplete
  const { data: catalog } = useQuery({
    queryKey: ['athenaCatalog'],
    queryFn: () => queryApi.getAthenaCatalog().then(res => res.data),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
  
  // Extract parameters from SQL
  const parameters = extractParameters(query.sql)
  const canExecute = !parameters.length || validateParameters(query.sql, parameterValues)

  const handleSQLChange = useCallback((sql: string) => {
    onQueryUpdate({ sql })
  }, [onQueryUpdate])

  const handleExecute = async () => {
    if (!canExecute) return
    
    try {
      if (query.id) {
        // Execute through query run
        const response = await queryApi.executeQuery(query.id, query.sql, parameterValues)
        onQueryExecute(response.data.executionId)
      } else {
        // Direct execution
        const response = await queryApi.executeAthenaQuery(query.sql, parameterValues)
        onQueryExecute(response.data.executionId)
      }
    } catch (error: unknown) {
      console.error('Failed to execute query:', error)
      
      // Extract error message from the response
      let errorMessage = 'An unknown error occurred while executing the query.'
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as { response?: { data?: { error?: string } } }
        if (apiError.response?.data?.error) {
          errorMessage = apiError.response.data.error
        }
      } else if (error && typeof error === 'object' && 'message' in error) {
        const baseError = error as { message: string }
        errorMessage = baseError.message
      }
      
      setErrorDialog({ show: true, message: errorMessage })
    }
  }

  const handleFormat = useCallback(() => {
    try {
      const formattedSQL = format(query.sql, {
        language: 'sql',
        tabWidth: 2,
        keywordCase: 'upper',
        functionCase: 'upper'
      })
      onQueryUpdate({ sql: formattedSQL })
    } catch (error) {
      console.error('Failed to format SQL:', error)
      // If formatting fails, just keep the original SQL
    }
  }, [query.sql, onQueryUpdate])

  const canSave = query.isUnsaved || query.isDirty

  // Setup autocomplete with database/table names
  useEffect(() => {
    if (!catalog || !aceEditorRef.current) return

    const editor = aceEditorRef.current.editor
    
    // Create custom completer
    const customCompleter = {
      getCompletions: function(editor: unknown, session: { getLine: (row: number) => string }, pos: { row: number; column: number }, prefix: string, callback: (error: null, completions: Array<{ caption: string; value: string; meta: string; score: number }>) => void) {
        const completions: Array<{ caption: string; value: string; meta: string; score: number }> = []
        
        // Get the current line and analyze context
        const currentLine = session.getLine(pos.row)
        const beforeCursor = currentLine.substring(0, pos.column - prefix.length)
        
        // Check for table context (typing after table_name.)
        const tableMatch = beforeCursor.match(/(\w+)\.$/i)
        if (tableMatch) {
          const tableName = tableMatch[1]
          
          // Find tables that match this name across all databases
          catalog.databases.forEach(database => {
            const table = database.tables.find(t => t.name.toLowerCase() === tableName.toLowerCase())
            if (table) {
              // Show only columns for this specific table
              table.columns.forEach(column => {
                if (column.name.toLowerCase().startsWith(prefix.toLowerCase())) {
                  completions.push({
                    caption: column.name,
                    value: column.name,
                    meta: `column (${column.type})`,
                    score: 900
                  })
                }
              })
            }
          })
          
          callback(null, completions)
          return
        }
        
        // Check for database context (typing after database_name.)
        const dbMatch = beforeCursor.match(/(\w+)\.$/i)
        if (dbMatch) {
          const dbName = dbMatch[1]
          
          // Find the specific database
          const database = catalog.databases.find(db => db.name.toLowerCase() === dbName.toLowerCase())
          if (database) {
            // Show only tables for this specific database
            database.tables.forEach(table => {
              if (table.name.toLowerCase().startsWith(prefix.toLowerCase())) {
                completions.push({
                  caption: table.name,
                  value: table.name,
                  meta: `table (${database.name})`,
                  score: 900
                })
              }
            })
            
            callback(null, completions)
            return
          }
        }
        
        // Default completions when no specific context
        
        // Add SQL keywords
        const sqlKeywords = [
          'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 
          'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TABLE', 
          'DATABASE', 'INDEX', 'VIEW', 'UNION', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 
          'FULL', 'OUTER', 'ON', 'AND', 'OR', 'NOT', 'NULL', 'IS', 'IN', 'EXISTS', 
          'BETWEEN', 'LIKE', 'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN',
          'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'IF', 'COALESCE', 'ISNULL'
        ]
        
        sqlKeywords.forEach(keyword => {
          if (keyword.toLowerCase().startsWith(prefix.toLowerCase())) {
            completions.push({
              caption: keyword,
              value: keyword,
              meta: 'keyword',
              score: 900
            })
          }
        })
        
        // Add database names
        catalog.databases.forEach(database => {
          if (database.name.toLowerCase().startsWith(prefix.toLowerCase())) {
            completions.push({
              caption: database.name,
              value: database.name,
              meta: 'database',
              score: 800
            })
          }
          
          // Add table names (standalone)
          database.tables.forEach(table => {
            if (table.name.toLowerCase().startsWith(prefix.toLowerCase())) {
              completions.push({
                caption: table.name,
                value: table.name,
                meta: `table (${database.name})`,
                score: 700
              })
            }
            
            // Add fully qualified table names (database.table)
            const fullTableName = `${database.name}.${table.name}`
            if (fullTableName.toLowerCase().startsWith(prefix.toLowerCase())) {
              completions.push({
                caption: fullTableName,
                value: fullTableName,
                meta: 'table',
                score: 750
              })
            }
            
            // Add column names (standalone)
            table.columns.forEach(column => {
              if (column.name.toLowerCase().startsWith(prefix.toLowerCase())) {
                completions.push({
                  caption: column.name,
                  value: column.name,
                  meta: `column (${table.name} - ${column.type})`,
                  score: 600
                })
              }
            })
          })
        })
        
        callback(null, completions)
      }
    }
    
    // Remove existing custom completers and add new one
    editor.completers = editor.completers || []
    editor.completers = editor.completers.filter((c: unknown) => c !== customCompleter)
    editor.completers.push(customCompleter)
    
    // Add custom CSS to make autocomplete dialog wider
    const addCustomCSS = () => {
      const styleId = 'ace-autocomplete-custom-styles'
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style')
        style.id = styleId
        style.textContent = `
          .ace_autocomplete {
            width: 400px !important;
            max-width: 500px !important;
          }
          .ace_autocomplete .ace_completion-highlight {
            color: #3b82f6 !important;
          }
          .ace_autocomplete .ace_completion-meta {
            font-style: italic;
            opacity: 0.8;
          }
        `
        document.head.appendChild(style)
      }
    }
    
    addCustomCSS()
    
    // Focus editor when component mounts
    editor.focus()
  }, [catalog])

  useEffect(() => {
    // Focus editor when component mounts if catalog isn't loaded yet
    if (!catalog && aceEditorRef.current) {
      aceEditorRef.current.editor.focus()
    }
  }, [catalog])

  useEffect(() => {
    // Update parameter values when initialParameters change (from historical runs)
    if (initialParameters) {
      setParameterValues(initialParameters)
    }
  }, [initialParameters])

  useEffect(() => {
    // Reset parameter values when SQL changes significantly (new query context)
    // But preserve them when initialParameters is set (historical run restoration)
    if (query.sql !== previousSQL && !initialParameters) {
      const currentParameters = extractParameters(query.sql)
      const previousParameters = extractParameters(previousSQL)
      
      // Check if the parameter structure changed significantly
      const parameterStructureChanged = 
        currentParameters.length !== previousParameters.length ||
        !currentParameters.every(param => previousParameters.includes(param))
      
      if (parameterStructureChanged) {
        // Reset to empty values for new parameter structure
        setParameterValues({})
      }
    }
    
    setPreviousSQL(query.sql)
  }, [query.sql, initialParameters, previousSQL])

  useEffect(() => {
    // Add keyboard shortcut for save (Cmd+S / Ctrl+S)
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault()
        if (canSave) {
          onQuerySave()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [canSave, onQuerySave])

  return (
    <div className="flex flex-col h-full min-w-0">
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
              flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium cursor-pointer
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
            onClick={handleFormat}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700 cursor-pointer"
          >
            <IconCode size={16} />
            <span>Format</span>
          </button>
          
          <button
            onClick={handleExecute}
            disabled={!canExecute}
            className={`
              flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium cursor-pointer
              ${canExecute
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <IconPlayerPlay size={16} />
            <span>Execute</span>
          </button>
        </div>
      </div>

      {/* Parameter inputs */}
      <QueryParameters
        parameters={parameters}
        values={parameterValues}
        onChange={setParameterValues}
      />

      <div className="flex-1">
        <AceEditor
          ref={aceEditorRef}
          mode="sql"
          theme={isDarkMode ? "monokai-blue" : "github"}
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

      {/* Error Dialog */}
      {errorDialog.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`max-w-md w-full mx-4 rounded-lg shadow-lg transition-colors ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className={`px-6 py-4 border-b transition-colors ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h3 className={`text-lg font-medium transition-colors ${
                isDarkMode ? 'text-gray-100' : 'text-gray-900'
              }`}>
                Query Execution Error
              </h3>
            </div>
            <div className="px-6 py-4">
              <p className={`text-sm transition-colors ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {errorDialog.message}
              </p>
            </div>
            <div className={`px-6 py-4 border-t transition-colors ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <button
                onClick={() => setErrorDialog({ show: false, message: '' })}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}