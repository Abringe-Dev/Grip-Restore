import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/auth.css'
import './styles/dashboard.css'
import './styles/setup.css'
import './styles/calibration.css'
import './styles/game.css'
import './styles/start-session.css'
import './styles/history.css'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthProvider'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)