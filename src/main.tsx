import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import './styles/variables.css'
import './styles/islandVisualRefresh.css'
import './styles/accountLoginRefresh.css'
import './styles/gameInterfacePreview.css'
import './styles/gatheringMapPreview.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
