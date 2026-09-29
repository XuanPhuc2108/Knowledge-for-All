import { lazy, Suspense } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppLayout } from '../components/AppLayout'
import { AuthGuard } from '../components/AuthGuard'
import { PageTransition } from '../components/PageTransition'

const LandingPage = lazy(() => import('../pages/LandingPage').then((m) => ({ default: m.LandingPage })))
const LoginPage = lazy(() => import('../pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('../pages/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const DashboardPage = lazy(() => import('../pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const AddBookPage = lazy(() => import('../pages/AddBookPage').then((m) => ({ default: m.AddBookPage })))
const NearbyPage = lazy(() => import('../pages/NearbyPage').then((m) => ({ default: m.NearbyPage })))
const MyBooksPage = lazy(() => import('../pages/MyBooksPage').then((m) => ({ default: m.MyBooksPage })))
const ProfilePage = lazy(() => import('../pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-dark">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent-yellow border-t-transparent" />
    </div>
  )
}

export function AppRoutes() {
  const location = useLocation()

  return (
    <Suspense fallback={<Loading />}>
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
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  )
}
