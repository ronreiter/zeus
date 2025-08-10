import { useDarkMode } from '../contexts/DarkModeContext'

interface QueryParametersProps {
  parameters: string[]
  values: Record<string, string>
  onChange: (values: Record<string, string>) => void
}

export default function QueryParameters({ parameters, values, onChange }: QueryParametersProps) {
  const { isDarkMode } = useDarkMode()

  if (parameters.length === 0) {
    return null
  }

  const handleParameterChange = (paramName: string, value: string) => {
    onChange({
      ...values,
      [paramName]: value
    })
  }

  return (
    <div className={`border-t p-4 space-y-3 transition-colors ${
      isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
    }`}>
      <h4 className={`text-sm font-medium transition-colors ${
        isDarkMode ? 'text-gray-200' : 'text-gray-700'
      }`}>
        Query Parameters
      </h4>
      
      <div className="space-y-3">
        {parameters.map((paramName) => (
          <div key={paramName}>
            <label 
              htmlFor={`param-${paramName}`}
              className={`block text-xs font-medium mb-1 transition-colors ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}
            >
              {paramName}
            </label>
            <input
              id={`param-${paramName}`}
              type="text"
              value={values[paramName] || ''}
              onChange={(e) => handleParameterChange(paramName, e.target.value)}
              placeholder={`Enter value for ${paramName}`}
              className={`w-full px-3 py-2 text-sm rounded-md border transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
              } focus:outline-none`}
            />
          </div>
        ))}
      </div>
    </div>
  )
}