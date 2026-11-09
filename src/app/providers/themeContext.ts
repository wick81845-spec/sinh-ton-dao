import { createContext } from 'react'

export interface ThemePreference {
  theme: 'light' | 'dark'
  themeReady: boolean
  toggleTheme(): void
}

export const ThemeContext = createContext<ThemePreference | null>(null)
