import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Phase 2 will wire signIn() to Supabase and redirect on success
export default function OrganizationLoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email.trim() || !form.password.trim()) {
      setError('Email and password are required.')
      return
    }
    setLoading(true)
    setError('')

    const { error: authError, profile } = await signIn(form.email.trim(), form.password)
    if (authError) {
      setError(authError.message || 'Login failed. Please check your credentials.')
      setLoading(false)
      return
    }

    const role = profile?.stakeholderRole || profile?.role
    if (role === 'government') {
      navigate('/government/dashboard')
    } else if (role === 'institution') {
      navigate('/institution/dashboard')
    } else if (role === 'industry') {
      navigate('/industry/dashboard')
    } else {
      navigate('/organization/dashboard')
    }
  }

  return (
    <div className="login-wrapper">
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Back link */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <Link to="/" className="btn btn-ghost btn-sm">← Back to Home</Link>
        </div>

        <div className="login-card">

          {/* Logo */}
          <div className="login-logo">
            <div className="login-logo-icon">🏛️</div>
            <h2>Organization Login</h2>
            <p>Universities, Research Institutes &amp; Industry Partners</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>

            <div className="form-group">
              <label className="form-label" htmlFor="org-email">
                Email Address
              </label>
              <input
                id="org-email"
                className="form-input"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="your@organization.edu"
                autoComplete="email"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="org-password">
                Password
              </label>
              <input
                id="org-password"
                className="form-input"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
                required
              />
            </div>

            {/* Error area */}
            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                <span className="alert-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? (
                <><span className="loading-spinner" /> Signing in…</>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="divider" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'center', fontSize: '0.82rem', color: 'var(--gray-500)' }}>
            <div>
              Academic Institution?{' '}
              <Link to="/institution/login" style={{ fontWeight: 600, color: 'var(--jh-green-dark)' }}>
                Institution Login →
              </Link>
            </div>
            <div>
              Industry Partner or Startup?{' '}
              <Link to="/industry/login" style={{ fontWeight: 600, color: 'var(--jh-blue-dark, #2563eb)' }}>
                Industry Login →
              </Link>
            </div>
            <div>
              Government Official?{' '}
              <Link to="/government/login" style={{ fontWeight: 600, color: 'var(--jh-saffron-dark)' }}>
                Government Login →
              </Link>
            </div>
          </div>
        </div>

        {/* Info note */}
        <div className="alert alert-info" style={{ marginTop: '1.25rem' }}>
          <span className="alert-icon">ℹ️</span>
          <div style={{ fontSize: '0.82rem' }}>
            Organization accounts are created by the Jharkhand government administrator.
            Contact your nodal officer if you do not have credentials.
          </div>
        </div>

      </div>
    </div>
  )
}
