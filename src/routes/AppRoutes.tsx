import { lazy, Suspense, useEffect, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppLayout } from '../components/AppLayout'
import { AuthGuard } from '../components/AuthGuard'
import { Navbar } from '../components/Navbar'
import { PageTransition } from '../components/PageTransition'

function InitialRouteReady({ onReady }: { onReady: () => void }) {
  const signaled = useRef(false)

  useEffect(() => {
    if (signaled.current) return
    signaled.current = true
    onReady()
  }, [onReady])

  return null
}

const LandingPage = lazy(() => import('../pages/LandingPage').then((m) => ({ default: m.LandingPage })))
const DashboardPage = lazy(() => import('../pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const LoginPage = lazy(() => import('../pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('../pages/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const AddBookPage = lazy(() => import('../pages/AddBookPage').then((m) => ({ default: m.AddBookPage })))
const NearbyPage = lazy(() => import('../pages/NearbyPage').then((m) => ({ default: m.NearbyPage })))
const MyBooksPage = lazy(() => import('../pages/MyBooksPage').then((m) => ({ default: m.MyBooksPage })))
const ProfilePage = lazy(() => import('../pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const SettingsPage = lazy(() => import('../pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const BookDetailsPage = lazy(() => import('../pages/BookDetailsPage').then((m) => ({ default: m.BookDetailsPage })))
const EditBookPage = lazy(() => import('../pages/EditBookPage').then((m) => ({ default: m.EditBookPage })))
const ModerationPage = lazy(() => import('../pages/ModerationPage').then((m) => ({ default: m.ModerationPage })))
const RequestsPage = lazy(() => import('../pages/RequestsPage').then((m) => ({ default: m.RequestsPage })))
const ChatPage = lazy(() => import('../pages/ChatPage').then((m) => ({ default: m.ChatPage })))

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-dark">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent-yellow border-t-transparent" />
    </div>
  )
}

export function AppRoutes({ onInitialRouteReady }: { onInitialRouteReady: () => void }) {
  const location = useLocation()

  return (
    <Suspense fallback={<Loading />}>
      <InitialRouteReady onReady={onInitialRouteReady} />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <PageTransition>
                <LandingPage />
              </PageTransition>
            }
          />
          <Route
            path="/login"
            element={
              <PageTransition>
                <LoginPage />
              </PageTransition>
            }
          />
          <Route
            path="/register"
            element={
              <PageTransition>
                <RegisterPage />
              </PageTransition>
            }
          />
          <Route
            path="/explore"
            element={
              <PageTransition>
                <div className="app-shell min-h-screen bg-dark">
                  <Navbar variant="app" />
                  <main className="mx-auto max-w-7xl px-5 pb-16 pt-24 sm:px-8 lg:px-16">
                    <DashboardPage publicMode />
                  </main>
                </div>
              </PageTransition>
            }
          />
          <Route
            path="/books/:id"
            element={
              <PageTransition>
                <div className="app-shell min-h-screen bg-dark">
                  <Navbar variant="app" />
                  <main className="mx-auto max-w-7xl px-5 pb-16 pt-24 sm:px-8 lg:px-16">
                    <BookDetailsPage />
                  </main>
                </div>
              </PageTransition>
            }
          />
          <Route
            path="/app"
            element={
              <AuthGuard>
                <AppLayout />
              </AuthGuard>
            }
          >
            <Route
              index
              element={
                <PageTransition>
                  <DashboardPage />
                </PageTransition>
              }
            />
            <Route
              path="add-book"
              element={
                <PageTransition>
                  <AddBookPage />
                </PageTransition>
              }
            />
            <Route
              path="nearby"
              element={
                <PageTransition>
                  <NearbyPage />
                </PageTransition>
              }
            />
            <Route
              path="my-books"
              element={
                <PageTransition>
                  <MyBooksPage />
                </PageTransition>
              }
            />
            <Route
              path="profile"
              element={
                <PageTransition>
                  <ProfilePage />
                </PageTransition>
              }
            />
            <Route
              path="settings"
              element={
                <PageTransition>
                  <SettingsPage />
                </PageTransition>
              }
            />
            <Route
              path="books/:id"
              element={
                <PageTransition>
                  <BookDetailsPage />
                </PageTransition>
              }
            />
            <Route
              path="my-books/:id/edit"
              element={
                <PageTransition>
                  <EditBookPage />
                </PageTransition>
              }
            />
            <Route
              path="moderation"
              element={
                <PageTransition>
                  <ModerationPage />
                </PageTransition>
              }
            />
            <Route
              path="requests"
              element={
                <PageTransition>
                  <RequestsPage />
                </PageTransition>
              }
            />
            <Route
              path="messages/:chatId"
              element={
                <PageTransition>
                  <ChatPage />
                </PageTransition>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  )
}
