import { createContext } from 'react'

export interface DarkModeContextType {
  isDarkMode: boolean
  toggleDarkMode: () => void
}

export const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined)