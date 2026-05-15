import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useAuthStore } from '@/store/auth'
import { IS_LOCAL_MODE } from '@/local/mode'
import './styles/global.css'

if (IS_LOCAL_MODE) {
  useAuthStore.getState().ensureGuest()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
