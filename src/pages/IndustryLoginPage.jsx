import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function IndustryLoginPage() {
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

    // Role-based routing: if this account belongs to a different stakeholder, redirect accordingly
    const role = profile?.stakeholderRole || profile?.role
    if (role === 'government') {
      navigate('/government/dashboard')
    } else if (role === 'institution') {
      navigate('/institution/dashboard')
    } else {
      navigate('/industry/dashboard')
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
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              boxShadow: '0 8px 20px rgba(37, 99, 235, 0.25)'
            }}>
              🏭
            </div>
            <h2>Industry Login</h2>
            <p>Industry Partners, MSMEs, Startups &amp; CSR</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>

            <div className="form-group">
              <label className="form-label" htmlFor="ind-email">
                Corporate / Business Email
              </label>
              <input
                id="ind-email"
                className="form-input"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="partner@industry.com"
                autoComplete="email"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="ind-password">
                Password
              </label>
              <input
                id="ind-password"
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

            {/* Error message */}
            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                <span className="alert-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block"
              style={{
                background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                borderColor: '#1d4ed8'
              }}
              disabled={loading}
            >
              {loading ? (
                <><span className="loading-spinner" /> Signing in…</>
              ) : 'Sign In as Industry Partner'}
            </button>
          </form>

          <div className="divider" />

          {/* Other stakeholder logins */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'center', fontSize: '0.82rem', color: 'var(--gray-500)' }}>
            <div>
              Academic or Research Institution?{' '}
              <Link to="/institution/login" style={{ fontWeight: 600, color: 'var(--jh-green-dark)' }}>
                Institution Login →
              </Link>
            </div>
            <div>
              Jharkhand Government Official?{' '}
              <Link to="/government/login" style={{ fontWeight: 600, color: 'var(--jh-saffron-dark)' }}>
                Government Login →
              </Link>
            </div>
          </div>
        </div>

        {/* Info notice */}
        <div className="alert alert-info" style={{ marginTop: '1.25rem' }}>
          <span className="alert-icon">💼</span>
          <div style={{ fontSize: '0.82rem' }}>
            Industry and CSR partners participate to sponsor, scale prototypes, and deploy proven technology across Jharkhand districts.
          </div>
        </div>

      </div>
    </div>
  )
}
