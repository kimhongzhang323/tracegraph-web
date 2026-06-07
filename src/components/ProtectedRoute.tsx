import { useAuth } from '@/contexts/authContext'
import { Navigate, useLocation } from 'react-router-dom'
import { PageLoader } from './PageLoader'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />

  if (!user) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />
  }

  return <>{children}</>
}
