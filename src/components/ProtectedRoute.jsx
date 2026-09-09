import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requiredRole, allowedRoles }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-spinner loading-spinner-green"></div>
        <p>Verifying authentication…</p>
      </div>
    )
  }

  // If not logged in, redirect to appropriate stakeholder login page
  if (!user) {
    if (requiredRole === 'government') return <Navigate to="/government/login" replace />
    if (requiredRole === 'institution') return <Navigate to="/institution/login" replace />
    if (requiredRole === 'industry') return <Navigate to="/industry/login" replace />
    if (requiredRole === 'organization') return <Navigate to="/organization/login" replace />
    return <Navigate to="/" replace />
  }

  const effectiveRole = profile?.stakeholderRole || profile?.role || 'citizen'
  const validRoles = allowedRoles || (requiredRole ? [requiredRole] : [])

  if (validRoles.length > 0) {
    const isAuthorized = validRoles.some((role) => {
      if (role === 'organization') {
        return ['organization', 'institution', 'industry'].includes(effectiveRole)
      }
      if (role === 'institution') {
        return (
          effectiveRole === 'institution' ||
          (effectiveRole === 'organization' && profile?.organization?.type !== 'Industry')
        )
      }
      if (role === 'industry') {
        return (
          effectiveRole === 'industry' ||
          (effectiveRole === 'organization' && profile?.organization?.type === 'Industry')
        )
      }
      return effectiveRole === role
    })

    if (!isAuthorized) {
      // User is logged in with a different role; redirect them to their own dashboard
      if (effectiveRole === 'government') return <Navigate to="/government/dashboard" replace />
      if (effectiveRole === 'institution') return <Navigate to="/institution/dashboard" replace />
      if (effectiveRole === 'industry') return <Navigate to="/industry/dashboard" replace />
      if (effectiveRole === 'organization') return <Navigate to="/organization/dashboard" replace />
      return <Navigate to="/" replace />
    }
  }

  return children
}
