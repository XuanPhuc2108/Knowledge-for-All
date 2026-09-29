import { useCallback, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { SiteLoadingScreen } from './components/SiteLoadingScreen'
import { AuthProvider } from './hooks/useAuth'
import { useAuth as useAuthState } from './hooks/useAuthState'
import { useAppSettings } from './hooks/useAppSettings'
import { ToastProvider } from './components/Toast'
import { AppRoutes } from './routes/AppRoutes'
import { PwaInstallProvider } from './hooks/usePwaInstall'
import { AppSettingsProvider } from './hooks/AppSettingsProvider'

function ApplicationContent() {
  const { loading: authLoading } = useAuthState()
  const { initialized: settingsInitialized } = useAppSettings()
  const [initialRouteReady, setInitialRouteReady] = useState(false)
  const markInitialRouteReady = useCallback(() => setInitialRouteReady(true), [])
  const ready = !authLoading && settingsInitialized && initialRouteReady

  return (
    <>
      <div aria-busy={!ready}>
        <AppRoutes onInitialRouteReady={markInitialRouteReady} />
      </div>
      <SiteLoadingScreen ready={ready} />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppSettingsProvider>
        <PwaInstallProvider>
          <AuthProvider>
            <ToastProvider>
              <ApplicationContent />
            </ToastProvider>
          </AuthProvider>
        </PwaInstallProvider>
      </AppSettingsProvider>
    </BrowserRouter>
  )
}
