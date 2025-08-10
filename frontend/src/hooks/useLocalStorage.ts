import { useState, useCallback } from 'react'

/**
 * Custom hook for persisting state in localStorage
 */
export function useLocalStorage<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
      return defaultValue
    }
  })

  const setStoredValue = useCallback<React.Dispatch<React.SetStateAction<T>>>((newValue) => {
    try {
      setValue((currentValue) => {
        // Handle functional updates
        const valueToStore = newValue instanceof Function ? newValue(currentValue) : newValue
        localStorage.setItem(key, JSON.stringify(valueToStore))
        return valueToStore
      })
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error)
    }
  }, [key])

  return [value, setStoredValue]
}