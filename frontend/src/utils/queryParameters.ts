// Utility functions for handling query parameters

export function extractParameters(sql: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g
  const parameters: string[] = []
  const seen = new Set<string>()
  
  let match
  while ((match = regex.exec(sql)) !== null) {
    const paramName = match[1].trim()
    if (!seen.has(paramName)) {
      parameters.push(paramName)
      seen.add(paramName)
    }
  }
  
  return parameters
}

export function hasParameters(sql: string): boolean {
  return /\{\{[^}]+\}\}/.test(sql)
}

export function validateParameters(sql: string, parameterValues: Record<string, string>): boolean {
  const requiredParams = extractParameters(sql)
  return requiredParams.every(param => 
    parameterValues[param] !== undefined && 
    parameterValues[param].trim() !== ''
  )
}