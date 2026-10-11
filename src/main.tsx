import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './state/auth'
import { CartProvider } from './state/cart'
import './index.css'
import { applyTheme, getTheme } from './lib/theme'

// Apply the persisted theme before the first frame so there is no flash.
applyTheme(getTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
