import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  acceptProblem,
  respondToCollaboration,
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
  { id: 'available', icon: '📋', label: 'Available Problems' },
  { id: 'assigned', icon: '🔬', label: 'Assigned R&D Projects' },
  { id: 'collaboration', icon: '🤝', label: 'Collaboration Requests' },
  { id: 'notifications', icon: '🔔', label: 'Notifications' },
  { id: 'profile', icon: '🎓', label: 'Institution Profile' },
]

export default function InstitutionDashboardPage() {
  const { profile, user, signOut } = useAuth()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('overview')

  // Real Supabase data states
  const [availableProblems, setAvailableProblems] = useState([])
  const [assignedProjects, setAssignedProjects] = useState([])
  const [collaborationRequests, setCollaborationRequests] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [feedback, setFeedback] = useState(null) // { type: 'success' | 'error', message }

  const org = profile?.organization
  const institutionName = org?.name || profile?.name || 'Institution'
  const institutionType = org?.type || 'University / Research Institute'
  const institutionDomains = org?.domains?.length ? org.domains : []

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  // Initial data loading
  const loadDashboardData = async () => {
    if (!profile) return
    try {
      setLoading(true)

      // 1. Fetch available problems (open for assignment)
      const { data: openData } = await supabase
        .from('problems')
        .select('*')
        .is('assigned_to', null)
        .order('created_at', { ascending: false })

      setAvailableProblems(openData || [])

      // 2. Fetch assigned projects for this institution
      if (org?.id) {
        const { data: assignedData } = await supabase
          .from('problems')
          .select(`
            *,
            assignments (*),
            assigned_org:organizations!assigned_to (id, name, type)
          `)
          .eq('assigned_to', org.id)
          .order('assigned_at', { ascending: false })

        // Also fetch any project members for these assignments
        setAssignedProjects(assignedData || [])

        // 3. Fetch collaboration requests for this institution
        const { data: collabData } = await supabase
          .from('collaboration_requests')
          .select(`
            *,
            requesting_org:organizations!requesting_org_id (id, name, type, domains, profile_id),
            assignment:assignments (id, problem:problems(id, problem_id, title, domain))
          `)
          .eq('receiving_org_id', org.id)
          .order('created_at', { ascending: false })

        setCollaborationRequests(collabData || [])
      }

      // 4. Fetch persistent notifications
      if (profile.id) {
        const notifs = await fetchNotifications(profile.id)
        setNotifications(notifs)
      }
    } catch (err) {
      console.error('Error loading institution dashboard data:', err)
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

    // Realtime problems
    const unsubProblems = subscribeToProblems(() => {
      loadDashboardData()
    })

    // Realtime collaboration requests
    const unsubCollab = subscribeToCollaborationRequests(() => {
      loadDashboardData()
    }, org?.id)

    // Realtime assignments
    const unsubAssignments = subscribeToAssignments(() => {
      loadDashboardData()
    }, org?.id)

    return () => {
      unsubNotifs()
      unsubProblems()
      unsubCollab()
      unsubAssignments()
    }
  }, [profile?.id, org?.id])

  // Action: Accept problem
  const handleAcceptProblem = async (problem) => {
    if (!org?.id) {
      setFeedback({
        type: 'error',
        message: 'No active organization linked to your profile. Contact administrator.',
      })
      return
    }

    setActionLoading(true)
    setFeedback(null)

    const res = await acceptProblem({
      problemId: problem.id,
      orgId: org.id,
      profileId: profile.id,
      orgName: institutionName,
      problemTitle: problem.title,
      domain: problem.domain,
    })

    setActionLoading(false)

    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Successfully accepted challenge "${problem.problem_id}". You are now the primary R&D assignee!`,
      })
      await loadDashboardData()
      setActiveSection('assigned')
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to accept challenge' })
    }
  }

  // Action: Respond to collaboration
  const handleRespondCollaboration = async (req, status) => {
    setActionLoading(true)
    setFeedback(null)

    const res = await respondToCollaboration({
      requestId: req.id,
      status,
      assignmentId: req.assignment_id,
      industryOrgId: req.requesting_org_id,
      industryOrgName: req.requesting_org?.name,
      institutionOrgName: institutionName,
      problemTitle: req.assignment?.problem?.title || 'Project',
    })

    setActionLoading(false)

    if (res.success) {
      setFeedback({
        type: 'success',
        message: status === 'accepted'
          ? `Accepted partnership with ${req.requesting_org?.name || 'Industry partner'}!`
          : `Declined collaboration request.`,
      })
      await loadDashboardData()
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to update request' })
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
  const pendingCollabCount = collaborationRequests.filter((c) => c.status === 'pending').length

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="dashboard-layout">

        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <div style={{ padding: '1.25rem 1.25rem 0.75rem', borderBottom: '1px solid var(--gray-200)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#ecfdf5', color: '#047857', padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.4rem' }}>
              <span>🎓</span>
              <span>Institution Stakeholder</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--gray-900)', lineHeight: 1.3 }}>
              {institutionName}
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
                {item.id === 'collaboration' && pendingCollabCount > 0 && (
                  <span className="badge" style={{ background: '#f59e0b', color: '#fff', fontSize: '0.7rem', padding: '0.1rem 0.45rem', borderRadius: 999 }}>
                    {pendingCollabCount}
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
                Welcome, {institutionName}
              </div>
              <div className="dashboard-subtitle">
                Institution Innovation Dashboard · Realtime Societal Collaboration Engine
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className="badge" style={{ background: '#d1fae5', color: '#065f46', fontWeight: 600 }}>
                {institutionType}
              </span>
              <span className="badge" style={{ background: '#e0e7ff', color: '#3730a3', fontSize: '0.75rem', fontWeight: 600 }}>
                ⚡ Realtime Connected
              </span>
            </div>
          </div>

          {/* User Feedback Alert */}
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

          {/* OVERVIEW SECTION */}
          {activeSection === 'overview' && (
            <>
              <div className="stat-grid" style={{ marginBottom: '1.75rem' }}>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#ecfdf5' }}>🔬</div>
                  <div className="stat-info">
                    <div className="stat-value">{assignedProjects.length}</div>
                    <div className="stat-label">Assigned R&amp;D Projects</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#eff6ff' }}>📋</div>
                  <div className="stat-info">
                    <div className="stat-value">{availableProblems.length}</div>
                    <div className="stat-label">Open Challenges</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#fef3c7' }}>🤝</div>
                  <div className="stat-info">
                    <div className="stat-value">{collaborationRequests.length}</div>
                    <div className="stat-label">Industry Requests</div>
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

              {/* Quick Actions / Highlights */}
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700 }}>⚡ Open Challenges Matched for R&amp;D</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setActiveSection('available')}>
                    View All ({availableProblems.length}) →
                  </button>
                </div>
                <div className="card-body">
                  {availableProblems.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">📋</div>
                      <h3>No open challenges at this moment</h3>
                      <p>When citizens submit problems in Jharkhand, they will be matched here in realtime.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {availableProblems.slice(0, 3).map((prob) => (
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
                              <span className="badge" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
                                {prob.domain}
                              </span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                                📍 {prob.district || 'Jharkhand'}
                              </span>
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{prob.title}</div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', margin: '0.25rem 0 0', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {prob.description}
                            </p>
                          </div>
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={actionLoading}
                            onClick={() => handleAcceptProblem(prob)}
                          >
                            Accept Problem
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* AVAILABLE PROBLEMS SECTION */}
          {activeSection === 'available' && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700 }}>Available Societal Problems in Jharkhand</span>
                <span className="text-sm text-gray">{availableProblems.length} challenges available</span>
              </div>
              <div className="card-body">
                {availableProblems.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <h3>No available problems right now</h3>
                    <p>Submissions by citizens are classified via AI keywords and will appear here in realtime.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {availableProblems.map((prob) => (
                      <div
                        key={prob.id}
                        style={{
                          padding: '1.25rem',
                          border: '1px solid var(--gray-200)',
                          borderRadius: 'var(--radius-md)',
                          background: '#fff',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.5rem' }}>
                          <div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--jh-green-dark)' }}>
                                {prob.problem_id}
                              </span>
                              <span className="badge" style={{ background: '#ecfdf5', color: '#047857' }}>
                                {prob.domain}
                              </span>
                              <span className="badge" style={{ background: 'var(--gray-100)', color: 'var(--gray-700)' }}>
                                📍 {prob.district || 'Jharkhand'}
                              </span>
                            </div>
                            <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.4rem', color: 'var(--gray-900)' }}>
                              {prob.title}
                            </h3>
                          </div>
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={actionLoading}
                            onClick={() => handleAcceptProblem(prob)}
                          >
                            Accept Problem for R&amp;D
                          </button>
                        </div>

                        <p style={{ color: 'var(--gray-700)', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 0.75rem' }}>
                          {prob.description}
                        </p>

                        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                          <span>Submitted: {new Date(prob.created_at).toLocaleDateString()}</span>
                          {prob.poster_name && <span>Citizen: {prob.poster_name}</span>}
                          {prob.domain_confidence && <span>Domain Confidence: {prob.domain_confidence}%</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ASSIGNED PROJECTS SECTION */}
          {activeSection === 'assigned' && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700 }}>Assigned R&amp;D Projects ({assignedProjects.length})</span>
                <span className="badge" style={{ background: '#ecfdf5', color: '#047857' }}>Primary Assignee</span>
              </div>
              <div className="card-body">
                {assignedProjects.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">🔬</div>
                    <h3>No active R&amp;D assignments yet</h3>
                    <p>Browse the "Available Problems" tab and click "Accept Problem" to begin research.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {assignedProjects.map((project) => (
                      <div
                        key={project.id}
                        style={{
                          padding: '1.25rem',
                          border: '1px solid var(--gray-200)',
                          borderRadius: 'var(--radius-md)',
                          background: '#fff',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--jh-green-dark)' }}>
                              {project.problem_id}
                            </span>
                            <span
                              className="badge"
                              style={{
                                background: PROBLEM_STATUS_COLORS[project.status] ? `${PROBLEM_STATUS_COLORS[project.status]}20` : '#d1fae5',
                                color: PROBLEM_STATUS_COLORS[project.status] || '#065f46',
                                fontWeight: 600,
                              }}
                            >
                              {PROBLEM_STATUS_LABELS[project.status] || project.status}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                            Assigned: {project.assigned_at ? new Date(project.assigned_at).toLocaleDateString() : 'Active'}
                          </span>
                        </div>

                        <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem', color: 'var(--gray-900)' }}>
                          {project.title}
                        </h3>

                        <p style={{ color: 'var(--gray-700)', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 1rem' }}>
                          {project.description}
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Domain</span>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{project.domain}</div>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', textTransform: 'uppercase' }}>District</span>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{project.district || 'Jharkhand'}</div>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Industry Collaboration</span>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#2563eb' }}>
                              Open for Industry Requests
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* COLLABORATION REQUESTS SECTION */}
          {activeSection === 'collaboration' && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700 }}>Industry Collaboration Proposals ({collaborationRequests.length})</span>
                <span className="text-sm text-gray">Inter-stakeholder Co-Innovation</span>
              </div>
              <div className="card-body">
                {collaborationRequests.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">🤝</div>
                    <h3>No collaboration proposals yet</h3>
                    <p>When industry partners request collaboration on your active R&amp;D projects, proposals appear here in realtime.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {collaborationRequests.map((req) => {
                      const isPending = req.status === 'pending'
                      return (
                        <div
                          key={req.id}
                          style={{
                            padding: '1.25rem',
                            border: `1px solid ${isPending ? '#f59e0b' : 'var(--gray-200)'}`,
                            borderRadius: 'var(--radius-md)',
                            background: isPending ? '#fffbeb' : '#fff',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                            <div>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.3rem' }}>
                                <span className="badge" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
                                  🏭 {req.requesting_org?.type || 'Industry Partner'}
                                </span>
                                <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>
                                  {req.requesting_org?.name}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                                Project: <strong>{req.assignment?.problem?.title || 'Assigned R&D Challenge'}</strong> ({req.assignment?.problem?.problem_id})
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

                          <div style={{ padding: '0.75rem 1rem', background: '#fff', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-200)', margin: '0.75rem 0' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Partner Proposal Message:</span>
                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: 'var(--gray-800)', lineHeight: 1.5 }}>
                              "{req.message || 'We would like to collaborate with your institution on pilot deployment and technology scaling.'}"
                            </p>
                          </div>

                          {isPending && (
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                              <button
                                className="btn btn-ghost btn-sm"
                                disabled={actionLoading}
                                onClick={() => handleRespondCollaboration(req, 'declined')}
                              >
                                Decline
                              </button>
                              <button
                                className="btn btn-primary btn-sm"
                                disabled={actionLoading}
                                onClick={() => handleRespondCollaboration(req, 'accepted')}
                              >
                                Accept Collaboration
                              </button>
                            </div>
                          )}

                          {req.responded_at && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', textAlign: 'right' }}>
                              Responded on: {new Date(req.responded_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      )
                    })}
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
                    <p>Alerts for problem matches, assignments, and collaboration proposals will arrive in realtime.</p>
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
                          background: n.is_read ? '#fff' : '#f0fdf4',
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
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
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
                <span style={{ fontWeight: 700 }}>Institution Profile</span>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gap: '1rem', maxWidth: 600 }}>
                  <div>
                    <label className="form-label">Institution Legal Name</label>
                    <input className="form-input" type="text" value={institutionName} readOnly disabled />
                  </div>
                  <div>
                    <label className="form-label">Classification / Type</label>
                    <input className="form-input" type="text" value={institutionType} readOnly disabled />
                  </div>
                  <div>
                    <label className="form-label">Official Contact Email</label>
                    <input className="form-input" type="email" value={profile?.email || user?.email || ''} readOnly disabled />
                  </div>
                  <div>
                    <label className="form-label">State / Region</label>
                    <input className="form-input" type="text" value={org?.state || 'Jharkhand'} readOnly disabled />
                  </div>
                  <div>
                    <label className="form-label">Focus Research Domains</label>
                    <input className="form-input" type="text" value={institutionDomains.join(', ') || 'All Domains'} readOnly disabled />
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
