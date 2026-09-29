import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ToastProvider } from './components/Toast'
import { AppRoutes } from './routes/AppRoutes'
import { PwaInstallProvider } from './hooks/usePwaInstall'
import { AppSettingsProvider } from './hooks/AppSettingsProvider'

export default function App() {
  return (
    <BrowserRouter>
      <AppSettingsProvider>
        <PwaInstallProvider>
          <AuthProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </AuthProvider>
        </PwaInstallProvider>
      </AppSettingsProvider>
    </BrowserRouter>
  )
}
