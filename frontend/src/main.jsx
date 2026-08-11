import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './style/base.css'
import './style/auth.css'
import './style/forms.css'
import './style/components.css'
import './style/editor.css'
import './style/performance.css'
import './style/profile.css'
import './style/reports.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
