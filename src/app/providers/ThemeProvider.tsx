import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { localStorageAdapter } from '../../services/storage/localStorageAdapter'
import { ThemeContext } from './themeContext'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [themeReady, setThemeReady] = useState(false)

  useEffect(() => {
    let active = true
    void localStorageAdapter.get<unknown>('settings.theme').then((savedTheme) => {
      if (!active) return
      if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme)
      else if (savedTheme !== null) console.warn('Bỏ qua giá trị giao diện không hợp lệ trong cài đặt đã lưu.')
      setThemeReady(true)
    }).catch((error: unknown) => {
      if (!active) return
      console.error('Không thể đọc tùy chọn giao diện đã lưu.', error)
      setThemeReady(true)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!themeReady) return
    document.documentElement.dataset.theme = theme
    void localStorageAdapter.set('settings.theme', theme).catch((error: unknown) => {
      console.error('Không thể lưu tùy chọn giao diện.', error)
    })
  }, [theme, themeReady])

  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) => currentTheme === 'light' ? 'dark' : 'light')
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, themeReady, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
