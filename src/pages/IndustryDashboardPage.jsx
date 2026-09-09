import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  requestCollaboration,
  fetchNotifications,
  markNotificationAsRead,
} from '../lib/workflow'
import {
  subscribeToNotifications,
  subscribeToProblems,
  subscribeToCollaborationRequests,
  subscribeToAssignments,
} from '../lib/realtime'
import { PROBLEM_STATUS_LABELS, PROBLEM_STATUS_COLORS } from '../lib/constants'

const NAV_ITEMS = [
  { id: 'overview', icon: '📊', label: 'Overview' },
  { id: 'challenges', icon: '📋', label: 'Assigned Challenges' },
  { id: 'proposals', icon: '🤝', label: 'My Collaboration Proposals' },
  { id: 'partnerships', icon: '🚀', label: 'Active Partnerships' },
  { id: 'notifications', icon: '🔔', label: 'Notifications' },
  { id: 'profile', icon: '🏭', label: 'Industry Profile' },
]

export default function IndustryDashboardPage() {
  const { profile, user, signOut } = useAuth()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('overview')

  // Real Supabase data states
  const [assignedProblems, setAssignedProblems] = useState([])
  const [myRequests, setMyRequests] = useState([])
  const [activePartnerships, setActivePartnerships] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [feedback, setFeedback] = useState(null) // { type: 'success' | 'error', message }

  // Collaboration proposal modal / inline state
  const [selectedProject, setSelectedProject] = useState(null)
  const [proposalMessage, setProposalMessage] = useState('')

  const org = profile?.organization
  const companyName = org?.name || profile?.name || 'Industry Partner'
  const companyType = org?.type || 'Industry / MSME / Startup'
  const companyDomains = org?.domains?.length ? org.domains : []

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  // Load dashboard data
  const loadDashboardData = async () => {
    if (!profile) return
    try {
      setLoading(true)

      // 1. Fetch problems assigned to an institution (open for industry collaboration)
      const { data: problemsData } = await supabase
        .from('problems')
        .select(`
          *,
          assigned_org:organizations!assigned_to (id, name, type, domains),
          assignments (id, status, notes)
        `)
        .not('assigned_to', 'is', null)
        .order('assigned_at', { ascending: false })

      setAssignedProblems(problemsData || [])

      // 2. Fetch collaboration requests initiated by this industry partner
      if (org?.id) {
        const { data: reqData } = await supabase
          .from('collaboration_requests')
          .select(`
            *,
            receiving_org:organizations!receiving_org_id (id, name, type),
            assignment:assignments (id, problem:problems(id, problem_id, title, domain, district))
          `)
          .eq('requesting_org_id', org.id)
          .order('created_at', { ascending: false })

        const requests = reqData || []
        setMyRequests(requests)
        setActivePartnerships(requests.filter((r) => r.status === 'accepted'))
      }

      // 3. Fetch persistent notifications
      if (profile.id) {
        const notifs = await fetchNotifications(profile.id)
        setNotifications(notifs)
      }
    } catch (err) {
      console.error('Error loading industry dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [profile, org?.id])

  // Setup Realtime subscriptions
  useEffect(() => {
    if (!profile?.id) return

    // Realtime notifications
    const unsubNotifs = subscribeToNotifications(profile.id, (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev])
      setFeedback({ type: 'success', message: `🔔 New Notification: ${newNotif.title}` })
    })

    // Realtime collaboration updates
    const unsubCollab = subscribeToCollaborationRequests(() => {
      loadDashboardData()
    }, org?.id)

    // Realtime problems & assignments
    const unsubProblems = subscribeToProblems(() => {
      loadDashboardData()
    })
    const unsubAssignments = subscribeToAssignments(() => {
      loadDashboardData()
    })

    return () => {
      unsubNotifs()
      unsubCollab()
      unsubProblems()
      unsubAssignments()
    }
  }, [profile?.id, org?.id])

  // Action: Submit collaboration request
  const handleSubmitCollaboration = async (e) => {
    e.preventDefault()
    if (!org?.id) {
      setFeedback({ type: 'error', message: 'No organization linked to profile. Contact admin.' })
      return
    }
    if (!selectedProject) return

    const assignment = Array.isArray(selectedProject.assignments)
      ? selectedProject.assignments[0]
      : selectedProject.assignments

    if (!assignment?.id) {
      setFeedback({ type: 'error', message: 'No assignment record found for this project.' })
      return
    }

    setActionLoading(true)
    setFeedback(null)

    const res = await requestCollaboration({
      assignmentId: assignment.id,
      requestingOrgId: org.id,
      receivingOrgId: selectedProject.assigned_to,
      requestingOrgName: companyName,
      problemTitle: selectedProject.title,
      message: proposalMessage.trim() || 'We offer technology scaling, testing facilities, and CSR co-funding.',
    })

    setActionLoading(false)

    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Collaboration proposal sent to ${selectedProject.assigned_org?.name || 'Institution'}! They will be notified in realtime.`,
      })
      setSelectedProject(null)
      setProposalMessage('')
      await loadDashboardData()
      setActiveSection('proposals')
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to submit proposal' })
    }
  }

  // Action: Mark notification read
  const handleReadNotification = async (notifId) => {
    await markNotificationAsRead(notifId)
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
    )
  }

  const unreadNotifsCount = notifications.filter((n) => !n.is_read).length
  const pendingRequestsCount = myRequests.filter((r) => r.status === 'pending').length

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="dashboard-layout">

        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <div style={{ padding: '1.25rem 1.25rem 0.75rem', borderBottom: '1px solid var(--gray-200)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#eff6ff', color: '#1d4ed8', padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.4rem' }}>
              <span>🏭</span>
              <span>Industry Stakeholder</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--gray-900)', lineHeight: 1.3 }}>
              {companyName}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.2rem' }}>
              {profile?.email || user?.email}
            </div>
          </div>

          <nav className="sidebar-nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`sidebar-nav-item${activeSection === item.id ? ' active' : ''}`}
                onClick={() => {
                  setActiveSection(item.id)
                  setFeedback(null)
                }}
              >
                <span className="nav-icon">{item.icon}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                {item.id === 'notifications' && unreadNotifsCount > 0 && (
                  <span className="badge" style={{ background: '#ef4444', color: '#fff', fontSize: '0.7rem', padding: '0.1rem 0.45rem', borderRadius: 999 }}>
                    {unreadNotifsCount}
                  </span>
                )}
                {item.id === 'proposals' && pendingRequestsCount > 0 && (
                  <span className="badge" style={{ background: '#3b82f6', color: '#fff', fontSize: '0.7rem', padding: '0.1rem 0.45rem', borderRadius: 999 }}>
                    {pendingRequestsCount}
                  </span>
                )}
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

          {/* Header */}
          <div className="dashboard-header">
            <div>
              <div className="dashboard-title">
                Welcome, {companyName}
              </div>
              <div className="dashboard-subtitle">
                Industry &amp; CSR Collaboration Dashboard · Technology Scaling &amp; Deployment Engine
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className="badge" style={{ background: '#dbeafe', color: '#1e40af', fontWeight: 600 }}>
                {companyType}
              </span>
              <span className="badge" style={{ background: '#e0e7ff', color: '#3730a3', fontSize: '0.75rem', fontWeight: 600 }}>
                ⚡ Realtime Connected
              </span>
            </div>
          </div>

          {/* Feedback Alert */}
          {feedback && (
            <div
              className={`alert ${feedback.type === 'success' ? 'alert-success' : 'alert-error'}`}
              style={{ marginBottom: '1.25rem' }}
            >
              <span className="alert-icon">{feedback.type === 'success' ? '✅' : '⚠️'}</span>
              <div style={{ flex: 1 }}>{feedback.message}</div>
              <button
                onClick={() => setFeedback(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Proposal Modal / Overlay */}
          {selectedProject && (
            <div
              style={{
                background: '#fff',
                border: '2px solid #3b82f6',
                borderRadius: 'var(--radius-md)',
                padding: '1.5rem',
                marginBottom: '1.5rem',
                boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <span className="badge" style={{ background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, marginBottom: '0.3rem' }}>
                    Request Co-Innovation Collaboration
                  </span>
                  <h3 style={{ margin: '0.2rem 0', fontSize: '1.2rem' }}>{selectedProject.title}</h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                    Primary Assignee: <strong>{selectedProject.assigned_org?.name || 'Institution Partner'}</strong> ({selectedProject.assigned_org?.type})
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSelectedProject(null)}
                >
                  ✕ Cancel
                </button>
              </div>

              <form onSubmit={handleSubmitCollaboration}>
                <div className="form-group">
                  <label className="form-label" htmlFor="proposal-message">
                    Collaboration Proposal / Capabilities Offered:
                  </label>
                  <textarea
                    id="proposal-message"
                    className="form-input"
                    rows={4}
                    value={proposalMessage}
                    onChange={(e) => setProposalMessage(e.target.value)}
                    placeholder="e.g. We can provide prototype manufacturing, sensor testing at our Jamshedpur facility, and ₹5L CSR funding for district pilot deployment."
                    required
                  />
                  <div className="form-hint">
                    The lead institution and state nodal officers will be notified instantly in realtime.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setSelectedProject(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Sending Proposal…' : 'Submit Collaboration Request'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* OVERVIEW SECTION */}
          {activeSection === 'overview' && (
            <>
              <div className="stat-grid" style={{ marginBottom: '1.75rem' }}>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#eff6ff' }}>🚀</div>
                  <div className="stat-info">
                    <div className="stat-value">{activePartnerships.length}</div>
                    <div className="stat-label">Active Partnerships</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#ecfdf5' }}>📋</div>
                  <div className="stat-info">
                    <div className="stat-value">{assignedProblems.length}</div>
                    <div className="stat-label">R&amp;D Challenges Ready</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#fef3c7' }}>🤝</div>
                  <div className="stat-info">
                    <div className="stat-value">{myRequests.length}</div>
                    <div className="stat-label">Proposals Sent</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#f3e8ff' }}>🔔</div>
                  <div className="stat-info">
                    <div className="stat-value">{unreadNotifsCount}</div>
                    <div className="stat-label">Unread Notifications</div>
                  </div>
                </div>
              </div>

              {/* R&D Challenges Highlight */}
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700 }}>🔬 Active Institutional R&amp;D Projects Open for Collaboration</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setActiveSection('challenges')}>
                    View All ({assignedProblems.length}) →
                  </button>
                </div>
                <div className="card-body">
                  {assignedProblems.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">📋</div>
                      <h3>No institutional projects ready yet</h3>
                      <p>Once academic institutions adopt challenges for R&amp;D, you can request collaboration to scale and deploy them.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {assignedProblems.slice(0, 3).map((prob) => {
                        const hasRequested = myRequests.some((r) => r.assignment?.problem?.id === prob.id)
                        return (
                          <div
                            key={prob.id}
                            style={{
                              padding: '1rem',
                              border: '1px solid var(--gray-200)',
                              borderRadius: 'var(--radius-md)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '1rem',
                              background: '#fff',
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.3rem' }}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--jh-green-dark)' }}>
                                  {prob.problem_id}
                                </span>
                                <span className="badge" style={{ background: '#ecfdf5', color: '#047857' }}>
                                  🎓 {prob.assigned_org?.name || 'Institution Assignee'}
                                </span>
                                <span className="badge" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
                                  {prob.domain}
                                </span>
                              </div>
                              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{prob.title}</div>
                              <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', margin: '0.2rem 0 0', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {prob.description}
                              </p>
                            </div>
                            <div>
                              {hasRequested ? (
                                <span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>
                                  Proposal Submitted
                                </span>
                              ) : (
                                <button
                                  className="btn btn-primary btn-sm"
                                  style={{ background: '#2563eb', borderColor: '#1d4ed8' }}
                                  onClick={() => setSelectedProject(prob)}
                                >
                                  Request Collaboration
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* CHALLENGES SECTION */}
          {activeSection === 'challenges' && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700 }}>Assigned Institutional Challenges ({assignedProblems.length})</span>
                <span className="text-sm text-gray">Ready for Industry Scaling &amp; CSR</span>
              </div>
              <div className="card-body">
                {assignedProblems.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">🔬</div>
                    <h3>No institutional projects found</h3>
                    <p>When universities in Jharkhand adopt societal challenges, they appear here for industry partnership.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {assignedProblems.map((prob) => {
                      const existingReq = myRequests.find((r) => r.assignment?.problem?.id === prob.id)
                      return (
                        <div
                          key={prob.id}
                          style={{
                            padding: '1.25rem',
                            border: '1px solid var(--gray-200)',
                            borderRadius: 'var(--radius-md)',
                            background: '#fff',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                            <div>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.3rem' }}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--jh-green-dark)' }}>
                                  {prob.problem_id}
                                </span>
                                <span className="badge" style={{ background: '#d1fae5', color: '#065f46', fontWeight: 600 }}>
                                  🎓 Lead: {prob.assigned_org?.name || 'Academic Institution'}
                                </span>
                                <span className="badge" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
                                  {prob.domain}
                                </span>
                              </div>
                              <h3 style={{ fontSize: '1.1rem', margin: '0.2rem 0', color: 'var(--gray-900)' }}>
                                {prob.title}
                              </h3>
                            </div>
                            <div>
                              {existingReq ? (
                                <span
                                  className="badge"
                                  style={{
                                    background: existingReq.status === 'accepted' ? '#d1fae5' : existingReq.status === 'declined' ? '#fee2e2' : '#fef3c7',
                                    color: existingReq.status === 'accepted' ? '#065f46' : existingReq.status === 'declined' ? '#991b1b' : '#92400e',
                                    fontWeight: 700,
                                  }}
                                >
                                  {existingReq.status === 'accepted' ? '✓ PARTNER' : `PROPOSAL ${existingReq.status.toUpperCase()}`}
                                </span>
                              ) : (
                                <button
                                  className="btn btn-primary btn-sm"
                                  style={{ background: '#2563eb', borderColor: '#1d4ed8' }}
                                  onClick={() => setSelectedProject(prob)}
                                >
                                  Request Collaboration
                                </button>
                              )}
                            </div>
                          </div>

                          <p style={{ color: 'var(--gray-700)', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 0.75rem' }}>
                            {prob.description}
                          </p>

                          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                            <span>District: {prob.district || 'Jharkhand'}</span>
                            <span>Assigned On: {prob.assigned_at ? new Date(prob.assigned_at).toLocaleDateString() : 'Active'}</span>
                            <span>Status: {PROBLEM_STATUS_LABELS[prob.status] || prob.status}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MY PROPOSALS SECTION */}
          {activeSection === 'proposals' && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700 }}>My Collaboration Proposals ({myRequests.length})</span>
                <span className="text-sm text-gray">Status tracks institutional acceptance</span>
              </div>
              <div className="card-body">
                {myRequests.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">🤝</div>
                    <h3>No collaboration proposals submitted</h3>
                    <p>Go to "Assigned Challenges" to submit a co-innovation proposal to lead academic institutions.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {myRequests.map((req) => (
                      <div
                        key={req.id}
                        style={{
                          padding: '1.25rem',
                          border: '1px solid var(--gray-200)',
                          borderRadius: 'var(--radius-md)',
                          background: '#fff',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gray-900)' }}>
                              {req.assignment?.problem?.title || 'Collaborative Challenge'}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginTop: '0.2rem' }}>
                              Institution Partner: <strong>{req.receiving_org?.name || 'Lead Institution'}</strong>
                            </div>
                          </div>
                          <span
                            className="badge"
                            style={{
                              background: req.status === 'accepted' ? '#d1fae5' : req.status === 'declined' ? '#fee2e2' : '#fef3c7',
                              color: req.status === 'accepted' ? '#065f46' : req.status === 'declined' ? '#991b1b' : '#92400e',
                              fontWeight: 700,
                            }}
                          >
                            {req.status?.toUpperCase()}
                          </span>
                        </div>

                        <div style={{ padding: '0.75rem 1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', margin: '0.5rem 0' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Your Proposal:</span>
                          <p style={{ margin: '0.2rem 0 0', fontSize: '0.88rem', color: 'var(--gray-800)' }}>
                            "{req.message}"
                          </p>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--gray-500)' }}>
                          <span>Submitted: {new Date(req.created_at).toLocaleString()}</span>
                          {req.responded_at && <span>Responded: {new Date(req.responded_at).toLocaleString()}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ACTIVE PARTNERSHIPS SECTION */}
          {activeSection === 'partnerships' && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700 }}>Active Co-Innovation Partnerships ({activePartnerships.length})</span>
                <span className="badge" style={{ background: '#d1fae5', color: '#065f46' }}>Industry Partner Active</span>
              </div>
              <div className="card-body">
                {activePartnerships.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">🚀</div>
                    <h3>No active partnerships established yet</h3>
                    <p>Once an academic institution accepts your collaboration proposal, the joint project will appear here.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {activePartnerships.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          padding: '1.25rem',
                          border: '1px solid #10b981',
                          borderRadius: 'var(--radius-md)',
                          background: '#f0fdf4',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span className="badge" style={{ background: '#d1fae5', color: '#065f46', fontWeight: 700 }}>
                            ✓ Active Co-Innovation Project
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                            Established: {new Date(p.responded_at || p.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <h3 style={{ fontSize: '1.1rem', margin: '0.25rem 0', color: 'var(--gray-900)' }}>
                          {p.assignment?.problem?.title || 'Joint Project'}
                        </h3>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.85rem' }}>
                          <div>
                            <span style={{ color: 'var(--gray-500)' }}>Lead Academic Institution:</span>{' '}
                            <strong>{p.receiving_org?.name}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--gray-500)' }}>Role:</span>{' '}
                            <strong>Deployment &amp; Technology Scaling Partner</strong>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* NOTIFICATIONS SECTION */}
          {activeSection === 'notifications' && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700 }}>Realtime Persistent Notifications ({notifications.length})</span>
                {unreadNotifsCount > 0 && (
                  <span className="badge" style={{ background: '#fee2e2', color: '#991b1b', fontWeight: 600 }}>
                    {unreadNotifsCount} unread
                  </span>
                )}
              </div>
              <div className="card-body">
                {notifications.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">🔔</div>
                    <h3>No notifications yet</h3>
                    <p>Alerts for relevant challenges, R&amp;D adoptions, and partnership decisions will arrive in realtime.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        style={{
                          padding: '1rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--gray-200)',
                          background: n.is_read ? '#fff' : '#eff6ff',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: '1rem',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--gray-900)' }}>
                              {n.title}
                            </span>
                            {!n.is_read && (
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', display: 'inline-block' }} />
                            )}
                          </div>
                          <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: 'var(--gray-700)', lineHeight: 1.5 }}>
                            {n.body}
                          </p>
                          <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                            {new Date(n.created_at).toLocaleString()}
                          </span>
                        </div>
                        {!n.is_read && (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: '0.75rem' }}
                            onClick={() => handleReadNotification(n.id)}
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PROFILE SECTION */}
          {activeSection === 'profile' && (
            <div className="card">
              <div className="card-header">
                <span style={{ fontWeight: 700 }}>Industry Partner Profile</span>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gap: '1rem', maxWidth: 600 }}>
                  <div>
                    <label className="form-label">Company / Enterprise Name</label>
                    <input className="form-input" type="text" value={companyName} readOnly disabled />
                  </div>
                  <div>
                    <label className="form-label">Classification / Sector</label>
                    <input className="form-input" type="text" value={companyType} readOnly disabled />
                  </div>
                  <div>
                    <label className="form-label">Representative Business Email</label>
                    <input className="form-input" type="email" value={profile?.email || user?.email || ''} readOnly disabled />
                  </div>
                  <div>
                    <label className="form-label">State / Region</label>
                    <input className="form-input" type="text" value={org?.state || 'Jharkhand'} readOnly disabled />
                  </div>
                  <div>
                    <label className="form-label">Operational Domains</label>
                    <input className="form-input" type="text" value={companyDomains.join(', ') || 'All Domains'} readOnly disabled />
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
