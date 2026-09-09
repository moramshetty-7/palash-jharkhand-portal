import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'

// Phase 2 will fetch real data from Supabase for all sections
const NAV_ITEMS = [
  { id: 'overview',       icon: '📊', label: 'Overview' },
  { id: 'available',      icon: '📋', label: 'Available Problems' },
  { id: 'assigned',       icon: '📌', label: 'Assigned Problems' },
  { id: 'active',         icon: '⚙️',  label: 'Active Projects' },
  { id: 'completed',      icon: '✅', label: 'Completed Projects' },
  { id: 'collaboration',  icon: '🤝', label: 'Collaboration Requests' },
  { id: 'notifications',  icon: '🔔', label: 'Notifications' },
  { id: 'profile',        icon: '🏛️', label: 'Organization Profile' },
]

function EmptyState({ icon, title, description }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}

function StatCard({ icon, label, bg }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: bg }}>{icon}</div>
      <div className="stat-info">
        <div className="stat-value">—</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div className="card-header">
        <span style={{ fontWeight: 700, fontSize: '1rem' }}>{title}</span>
      </div>
      <div className="card-body">{children}</div>
    </div>
  )
}

export default function OrganizationDashboardPage() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('overview')

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="dashboard-layout">

        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <nav className="sidebar-nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`sidebar-nav-item${activeSection === item.id ? ' active' : ''}`}
                onClick={() => setActiveSection(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <button className="btn btn-ghost btn-sm btn-block" onClick={handleSignOut}>
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="dashboard-main">

          {/* Overview */}
          {activeSection === 'overview' && (
            <>
              <div className="dashboard-header">
                <div className="dashboard-title">
                  Welcome, {profile?.organizations?.name || profile?.name || 'Organization'}
                </div>
                <div className="dashboard-subtitle">
                  Organization Dashboard · Jharkhand Societal Innovation Portal
                </div>
              </div>

              <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                <StatCard icon="📋" label="Available Problems"   bg="#dbeafe" />
                <StatCard icon="📌" label="Assigned Problems"    bg="#ede9fe" />
                <StatCard icon="⚙️"  label="Active Projects"     bg="#d1fae5" />
                <StatCard icon="✅" label="Completed Projects"   bg="#fef3c7" />
              </div>

              <div className="grid-2">
                <SectionCard title="🔔 Recent Notifications">
                  <EmptyState
                    icon="🔔"
                    title="No notifications yet"
                    description="You will be notified when problems matching your domain are posted."
                  />
                </SectionCard>
                <SectionCard title="🤝 Pending Collaboration Requests">
                  <EmptyState
                    icon="🤝"
                    title="No pending requests"
                    description="Collaboration requests from other organizations will appear here."
                  />
                </SectionCard>
              </div>
            </>
          )}

          {/* Available Problems */}
          {activeSection === 'available' && (
            <>
              <div className="dashboard-header">
                <div className="dashboard-title">Available Problems</div>
                <div className="dashboard-subtitle">
                  Problems matched to your organization's domain and expertise
                </div>
              </div>
              <SectionCard title="📋 Problems Available for Assignment">
                <EmptyState
                  icon="📋"
                  title="No available problems yet"
                  description="When citizens post problems matching your domain, they will appear here. You can review and request assignment."
                />
              </SectionCard>
            </>
          )}

          {/* Assigned Problems */}
          {activeSection === 'assigned' && (
            <>
              <div className="dashboard-header">
                <div className="dashboard-title">Assigned Problems</div>
                <div className="dashboard-subtitle">Problems assigned to your organization by the government</div>
              </div>
              <SectionCard title="📌 Your Assigned Problems">
                <EmptyState
                  icon="📌"
                  title="No assigned problems"
                  description="Problems assigned to your organization will appear here. You can begin working on them and update milestones."
                />
              </SectionCard>
            </>
          )}

          {/* Active Projects */}
          {activeSection === 'active' && (
            <>
              <div className="dashboard-header">
                <div className="dashboard-title">Active Projects</div>
                <div className="dashboard-subtitle">Projects currently in progress</div>
              </div>
              <SectionCard title="⚙️ In-Progress Projects">
                <EmptyState
                  icon="⚙️"
                  title="No active projects"
                  description="Once you begin working on assigned problems, active projects and milestone progress will appear here."
                />
              </SectionCard>
            </>
          )}

          {/* Completed Projects */}
          {activeSection === 'completed' && (
            <>
              <div className="dashboard-header">
                <div className="dashboard-title">Completed Projects</div>
                <div className="dashboard-subtitle">Successfully delivered projects</div>
              </div>
              <SectionCard title="✅ Completed Projects">
                <EmptyState
                  icon="🏆"
                  title="No completed projects yet"
                  description="Projects you have successfully delivered will be archived here."
                />
              </SectionCard>
            </>
          )}

          {/* Collaboration Requests */}
          {activeSection === 'collaboration' && (
            <>
              <div className="dashboard-header">
                <div className="dashboard-title">Collaboration Requests</div>
                <div className="dashboard-subtitle">Requests to collaborate from other organizations</div>
              </div>
              <div className="grid-2">
                <SectionCard title="📥 Incoming Requests">
                  <EmptyState
                    icon="📥"
                    title="No incoming requests"
                    description="Other organizations can request to collaborate on your active projects."
                  />
                </SectionCard>
                <SectionCard title="📤 Sent Requests">
                  <EmptyState
                    icon="📤"
                    title="No sent requests"
                    description="Collaboration requests you have sent to other organizations will appear here."
                  />
                </SectionCard>
              </div>
            </>
          )}

          {/* Notifications */}
          {activeSection === 'notifications' && (
            <>
              <div className="dashboard-header">
                <div className="dashboard-title">Notifications</div>
                <div className="dashboard-subtitle">System and activity notifications</div>
              </div>
              <SectionCard title="🔔 All Notifications">
                <EmptyState
                  icon="🔔"
                  title="No notifications"
                  description="Notifications about new problem matches, assignment updates, and collaboration activity will appear here."
                />
              </SectionCard>
            </>
          )}

          {/* Organization Profile */}
          {activeSection === 'profile' && (
            <>
              <div className="dashboard-header">
                <div className="dashboard-title">Organization Profile</div>
                <div className="dashboard-subtitle">Your organization's details and domain areas</div>
              </div>
              <SectionCard title="🏛️ Profile Information">
                {profile?.organizations ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[
                      { label: 'Organization Name', value: profile.organizations.name },
                      { label: 'Type',               value: profile.organizations.type },
                      { label: 'Email',              value: profile.email },
                      { label: 'Domains',            value: profile.organizations.domains?.join(', ') || '—' },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', gap: '1rem' }}>
                        <span style={{ minWidth: 160, fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                          {label}
                        </span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--gray-800)' }}>
                          {value || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon="🏛️"
                    title="Profile data unavailable"
                    description="Connect Supabase to load your organization profile."
                  />
                )}
              </SectionCard>
            </>
          )}

        </main>
      </div>
    </div>
  )
}
