import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import PostProblemPage from './pages/PostProblemPage'
import TrackProblemPage from './pages/TrackProblemPage'
import InstitutionLoginPage from './pages/InstitutionLoginPage'
import InstitutionDashboardPage from './pages/InstitutionDashboardPage'
import IndustryLoginPage from './pages/IndustryLoginPage'
import IndustryDashboardPage from './pages/IndustryDashboardPage'
import GovernmentLoginPage from './pages/GovernmentLoginPage'
import GovernmentDashboardPage from './pages/GovernmentDashboardPage'
import OrganizationLoginPage from './pages/OrganizationLoginPage'
import OrganizationDashboardPage from './pages/OrganizationDashboardPage'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      {/* 1. Citizen routes (No login or account creation required) */}
      <Route path="/" element={<HomePage />} />
      <Route path="/post-problem" element={<PostProblemPage />} />
      <Route path="/track-problem" element={<TrackProblemPage />} />

      {/* 2. Institution routes (Universities, Colleges, R&D Labs) */}
      <Route path="/institution/login" element={<InstitutionLoginPage />} />
      <Route
        path="/institution/dashboard"
        element={
          <ProtectedRoute requiredRole="institution">
            <InstitutionDashboardPage />
          </ProtectedRoute>
        }
      />

      {/* 3. Industry routes (Industry Partners, MSMEs, Startups, CSR) */}
      <Route path="/industry/login" element={<IndustryLoginPage />} />
      <Route
        path="/industry/dashboard"
        element={
          <ProtectedRoute requiredRole="industry">
            <IndustryDashboardPage />
          </ProtectedRoute>
        }
      />

      {/* 4. Government routes (Jharkhand State Administration) */}
      <Route path="/government/login" element={<GovernmentLoginPage />} />
      <Route
        path="/government/dashboard"
        element={
          <ProtectedRoute requiredRole="government">
            <GovernmentDashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Legacy / Shared Organization routes */}
      <Route path="/organization/login" element={<OrganizationLoginPage />} />
      <Route
        path="/organization/dashboard"
        element={
          <ProtectedRoute requiredRole="organization">
            <OrganizationDashboardPage />
          </ProtectedRoute>
        }
      />

      {/* 404 fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

function NotFound() {
  return (
    <div className="loading-page" style={{ minHeight: '100vh' }}>
      <div style={{ fontSize: '4rem' }}>404</div>
      <h2 style={{ color: 'var(--gray-700)' }}>Page not found</h2>
      <a href="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>
        Go to Home
      </a>
    </div>
  )
}
