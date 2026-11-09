import { AppRouter } from './app/router/AppRouter'
import { AuthProvider } from './app/providers/AuthProvider'
import { GameProvider } from './app/providers/GameProvider'
import { ThemeProvider } from './app/providers/ThemeProvider'

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <GameProvider>
          <AppRouter />
        </GameProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App
