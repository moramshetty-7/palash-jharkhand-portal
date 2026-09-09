import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Phase 2 will wire signIn() to Supabase and redirect on success
export default function GovernmentLoginPage() {
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
      setError(authError.message || 'Login failed. Please check your official credentials.')
      setLoading(false)
      return
    }

    const role = profile?.stakeholderRole || profile?.role
    if (role === 'institution') {
      navigate('/institution/dashboard')
    } else if (role === 'industry') {
      navigate('/industry/dashboard')
    } else {
      navigate('/government/dashboard')
    }
  }

  return (
    <div className="login-wrapper">
      <div style={{ width: '100%', maxWidth: 430 }}>

        {/* Back link */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <Link to="/" className="btn btn-ghost btn-sm">← Back to Home</Link>
        </div>

        <div className="login-card">

          {/* Logo */}
          <div className="login-logo">
            <div className="login-logo-icon" style={{
              background: 'linear-gradient(135deg, var(--jh-saffron-dark), var(--jh-saffron))'
            }}>
              ⚙️
            </div>
            <h2>Government Login</h2>
            <p>Jharkhand State Administration Portal</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>

            <div className="form-group">
              <label className="form-label" htmlFor="gov-email">
                Official Email Address
              </label>
              <input
                id="gov-email"
                className="form-input"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="officer@jharkhand.gov.in"
                autoComplete="email"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="gov-password">
                Password
              </label>
              <input
                id="gov-password"
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
              className="btn btn-saffron btn-block"
              disabled={loading}
            >
              {loading ? (
                <><span className="loading-spinner" /> Signing in…</>
              ) : 'Sign In to Dashboard'}
            </button>
          </form>

          <div className="divider" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'center', fontSize: '0.82rem', color: 'var(--gray-500)' }}>
            <div>
              Academic or Research Institution?{' '}
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
          </div>
        </div>

        {/* Security note */}
        <div className="alert alert-warning" style={{ marginTop: '1.25rem' }}>
          <span className="alert-icon">🔒</span>
          <div style={{ fontSize: '0.82rem' }}>
            This portal is restricted to authorized Jharkhand government officials only.
            Unauthorized access attempts are logged.
          </div>
        </div>

      </div>
    </div>
  )
}
