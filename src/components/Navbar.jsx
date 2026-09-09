import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const getDashboardLink = () => {
    if (!profile) return null
    const role = profile.stakeholderRole || profile.role
    if (role === 'government') return '/government/dashboard'
    if (role === 'institution') return '/institution/dashboard'
    if (role === 'industry') return '/industry/dashboard'
    if (role === 'organization') return '/organization/dashboard'
    return null
  }

  const getStakeholderBadge = () => {
    if (!profile) return null
    const role = profile.stakeholderRole || profile.role
    if (role === 'government') return { text: 'Government', bg: 'rgba(245, 158, 11, 0.25)', color: '#fef3c7' }
    if (role === 'institution') return { text: 'Institution', bg: 'rgba(16, 185, 129, 0.25)', color: '#a7f3d0' }
    if (role === 'industry') return { text: 'Industry', bg: 'rgba(59, 130, 246, 0.25)', color: '#bfdbfe' }
    return { text: 'Partner', bg: 'rgba(255, 255, 255, 0.2)', color: '#ffffff' }
  }

  const badge = getStakeholderBadge()

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img
            src="/assets/palash-logo-exact.png"
            alt="PALASH - From Challenges to Change"
            style={{
              height: '38px',
              width: 'auto',
              maxHeight: '38px',
              objectFit: 'contain',
              background: '#ffffff',
              padding: '3px 10px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.18)',
              display: 'block',
            }}
          />
        </Link>

        <div className="navbar-actions">
          {user && profile ? (
            <>
              {badge && (
                <span
                  style={{
                    background: badge.bg,
                    color: badge.color,
                    padding: '0.2rem 0.55rem',
                    borderRadius: 999,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {badge.text}
                </span>
              )}
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.82rem', fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.organization?.name || profile?.name || profile?.email}
              </span>
              {getDashboardLink() && (
                <Link to={getDashboardLink()} className="btn btn-outline-white btn-sm">
                  Dashboard
                </Link>
              )}
              <button onClick={handleSignOut} className="btn btn-outline-white btn-sm">
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/institution/login" className="btn btn-saffron btn-sm">
                🎓 Institution
              </Link>
              <Link to="/industry/login" className="btn btn-saffron btn-sm">
                🏭 Industry
              </Link>
              <Link to="/government/login" className="btn btn-saffron btn-sm">
                ⚙️ Government
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
