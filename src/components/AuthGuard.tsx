import { Navigate, useLocation } from 'react-router-dom'
import { EmptyState } from './EmptyState'
import { useAuth } from '../hooks/useAuthState'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, error, refreshUser } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent-yellow border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        title="Không thể xác thực phiên đăng nhập"
        description={error}
        actionLabel="Thử lại"
        onAction={() => void refreshUser()}
      />
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
