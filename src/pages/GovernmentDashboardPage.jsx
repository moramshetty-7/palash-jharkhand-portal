import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  subscribeToProblems,
  subscribeToAssignments,
  subscribeToCollaborationRequests,
  subscribeToNotifications,
} from '../lib/realtime'
import { PROBLEM_STATUS_LABELS, PROBLEM_STATUS_COLORS } from '../lib/constants'

const NAV_ITEMS = [
  { id: 'overview',       icon: '📊', label: 'Overview' },
  { id: 'problems',       icon: '📋', label: 'Problem Management' },
  { id: 'valid',          icon: '✅', label: 'Valid Challenges' },
  { id: 'invalid',        icon: '❌', label: 'Invalid Challenges' },
  { id: 'assigned',       icon: '📌', label: 'Assigned Challenges' },
  { id: 'active',         icon: '⚙️',  label: 'Active Projects' },
  { id: 'completed',      icon: '🏆', label: 'Completed Projects' },
  { id: 'domains',        icon: '🏷️', label: 'Domain Keywords' },
  { id: 'organizations',  icon: '🏛️', label: 'Organization Participation' },
  { id: 'analytics',      icon: '📈', label: 'Analytics' },
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

function StatCard({ icon, label, value = 0, bg }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: bg }}>{icon}</div>
      <div className="stat-info">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
}

function SectionCard({ title, action, children }) {
  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: '1rem' }}>{title}</span>
        {action && <span>{action}</span>}
      </div>
      <div className="card-body">{children}</div>
    </div>
  )
}

function SeverityBadge({ severity, reportCount }) {
  const config = {
    critical: {
      label: 'CRITICAL',
      icon: '🔴',
      background: '#fee2e2',
      color: '#991b1b',
    },
    high: {
      label: 'HIGH',
      icon: '🟠',
      background: '#ffedd5',
      color: '#c2410c',
    },
    moderate: {
      label: 'MODERATE',
      icon: '🟡',
      background: '#fef3c7',
      color: '#92400e',
    },
    low: {
      label: 'LOW',
      icon: '🟢',
      background: '#dcfce7',
      color: '#166534',
    },
  }

  const current = config[severity] || config.low

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span
        className="badge"
        style={{
          background: current.background,
          color: current.color,
          fontWeight: 800,
        }}
      >
        {current.icon} {current.label}
      </span>

      <span style={{ fontSize: '0.78rem', color: 'var(--gray-600)' }}>
        {reportCount || 1} report{(reportCount || 1) !== 1 ? 's' : ''}
      </span>
    </div>
  )
}

export default function GovernmentDashboardPage() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('overview')

  // Real Supabase data states
  const [problems, setProblems] = useState([])
  const [assignments, setAssignments] = useState([])
  const [collaborations, setCollaborations] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)

  // Problem management filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDomain, setSelectedDomain] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  // Load real Supabase data
  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // 1. Fetch all problems with assigned organization
      const { data: problemsData, error: probError } = await supabase
        .from('problems')
        .select(`
          *,
          assigned_org:organizations!assigned_to (id, name, type, domains)
        `)
        .order('created_at', { ascending: false })

      if (probError) console.error('Error fetching problems:', probError)
      setProblems(problemsData || [])

      // 2. Fetch all assignments with problem and assigned organization
      const { data: assignmentsData, error: assignError } = await supabase
        .from('assignments')
        .select(`
          *,
          problem:problems (*),
          organization:organizations!organization_id (*)
        `)
        .order('created_at', { ascending: false })

      if (assignError) console.error('Error fetching assignments:', assignError)
      setAssignments(assignmentsData || [])

      // 3. Fetch all collaboration requests with requesting and receiving orgs
      const { data: collabsData, error: collabError } = await supabase
        .from('collaboration_requests')
        .select(`
          *,
          requesting_org:organizations!requesting_org_id (id, name, type),
          receiving_org:organizations!receiving_org_id (id, name, type),
          assignment:assignments (
            id,
            problem:problems (id, problem_id, title, domain, district, status)
          )
        `)
        .order('created_at', { ascending: false })

      if (collabError) console.error('Error fetching collaborations:', collabError)
      setCollaborations(collabsData || [])

      // 4. Fetch registered active organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (orgsError) console.error('Error fetching organizations:', orgsError)
      setOrganizations(orgsData || [])

    } catch (err) {
      console.error('Government dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Supabase Realtime subscriptions
  useEffect(() => {
    const unsubProblems = subscribeToProblems(() => {
      loadDashboardData()
    })
    const unsubAssignments = subscribeToAssignments(() => {
      loadDashboardData()
    })
    const unsubCollab = subscribeToCollaborationRequests(() => {
      loadDashboardData()
    })
    const unsubNotifs = profile?.id ? subscribeToNotifications(profile.id, () => {
      loadDashboardData()
    }) : () => {}

    return () => {
      unsubProblems()
      unsubAssignments()
      unsubCollab()
      unsubNotifs()
    }
  }, [profile?.id])

  // Helper to find collaboration info for a problem
  const getCollabInfo = (problemId, assignmentId) => {
    return collaborations.find(
      (c) =>
        (assignmentId && c.assignment_id === assignmentId) ||
        c.assignment?.problem?.id === problemId
    )
  }

  // Computed metrics from real Supabase data
  const totalChallenges = problems.length
  const validChallenges = problems.filter((p) => p.status !== 'rejected')
  const invalidChallenges = problems.filter((p) => p.status === 'rejected')
  
  // Assigned problems: either problem.assigned_to is populated or status is assigned/in_progress or assignment exists
  const assignedChallengesList = problems.filter(
    (p) =>
      p.assigned_to !== null ||
      ['assigned', 'in_progress', 'completed'].includes(p.status) ||
      assignments.some((a) => a.problem_id === p.id)
  )
  const assignedCount = assignedChallengesList.length

  // Active projects: currently in_progress or assigned with active work
  const activeProjectsList = problems.filter(
    (p) =>
      p.status === 'in_progress' ||
      (p.assigned_to !== null && p.status !== 'completed' && p.status !== 'rejected')
  )
  const activeProjectsCount = activeProjectsList.length

  const completedProjectsList = problems.filter((p) => p.status === 'completed')
  const completedProjectsCount = completedProjectsList.length

  // Domain distribution
  const domainCounts = problems.reduce((acc, p) => {
    const d = p.domain || 'Unclassified'
    acc[d] = (acc[d] || 0) + 1
    return acc
  }, {})

  // District distribution
  const districtCounts = problems.reduce((acc, p) => {
    const dist = p.district || 'Unspecified'
    acc[dist] = (acc[dist] || 0) + 1
    return acc
  }, {})

  // Filtered problems list for Problem Management section
  const filteredProblems = problems.filter((p) => {
    const matchSearch =
      !searchTerm ||
      p.problem_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.title?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchDomain = selectedDomain === 'All' || p.domain === selectedDomain
    const matchStatus = selectedStatus === 'All' || p.status === selectedStatus
    return matchSearch && matchDomain && matchStatus
  })

  // Get distinct domains from problems
  const domainOptions = ['All', ...Array.from(new Set(problems.map((p) => p.domain).filter(Boolean)))]
  const statusOptions = ['All', 'submitted', 'under_review', 'assigned', 'in_progress', 'completed', 'rejected']

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="dashboard-layout">

        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <div style={{ padding: '1.25rem 1.25rem 0.75rem', borderBottom: '1px solid var(--gray-200)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.4rem' }}>
              <span>⚙️</span>
              <span>State Administration</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--gray-900)', lineHeight: 1.3 }}>
              {profile?.name || 'Jharkhand Nodal Officer'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.2rem' }}>
              {profile?.email || 'officer@jharkhand.gov.in'}
            </div>
          </div>

          <nav className="sidebar-nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`sidebar-nav-item${activeSection === item.id ? ' active' : ''}`}
                onClick={() => setActiveSection(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                {item.id === 'assigned' && assignedCount > 0 && (
                  <span className="badge" style={{ background: '#ede9fe', color: '#6d28d9', fontSize: '0.7rem', padding: '0.1rem 0.45rem', borderRadius: 999 }}>
                    {assignedCount}
                  </span>
                )}
                {item.id === 'active' && activeProjectsCount > 0 && (
                  <span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.7rem', padding: '0.1rem 0.45rem', borderRadius: 999 }}>
                    {activeProjectsCount}
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

          {/* OVERVIEW SECTION */}
          {activeSection === 'overview' && (
            <>
              <div className="dashboard-header">
                <div>
                  <div className="dashboard-title">
                    Jharkhand State Government Dashboard
                  </div>
                  <div className="dashboard-subtitle">
                    Societal Innovation Collaboration Portal · Administrative Monitoring View
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className="badge" style={{ background: '#e0e7ff', color: '#3730a3', fontSize: '0.75rem', fontWeight: 600 }}>
                    ⚡ Realtime Active
                  </span>
                </div>
              </div>

              {/* Primary Stats with Real Data */}
              <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                <StatCard icon="📋" label="Total Challenges"    value={totalChallenges}       bg="#dbeafe" />
                <StatCard icon="✅" label="Valid Challenges"    value={validChallenges.length} bg="#d1fae5" />
                <StatCard icon="❌" label="Invalid Challenges"  value={invalidChallenges.length} bg="#fee2e2" />
                <StatCard icon="📌" label="Assigned Challenges" value={assignedCount}         bg="#ede9fe" />
                <StatCard icon="⚙️"  label="Active Projects"    value={activeProjectsCount}   bg="#fef3c7" />
                <StatCard icon="🏆" label="Completed Projects"  value={completedProjectsCount} bg="#d1fae5" />
              </div>

              {/* Real Assigned & Active Challenges Highlight */}
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700 }}>📌 Recently Assigned Societal Challenges</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setActiveSection('assigned')}>
                    View All ({assignedCount}) →
                  </button>
                </div>
                <div className="card-body">
                  {assignedChallengesList.length === 0 ? (
                    <EmptyState
                      icon="📌"
                      title="No assigned challenges yet"
                      description="When an academic institution accepts a problem for R&D, it will appear here in realtime."
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {assignedChallengesList.slice(0, 5).map((prob) => {
                        const matchingAssignment = assignments.find((a) => a.problem_id === prob.id)
                        const institutionOrg = prob.assigned_org || matchingAssignment?.organization
                        const collab = getCollabInfo(prob.id, matchingAssignment?.id)

                        return (
                          <div
                            key={prob.id}
                            style={{
                              padding: '1rem',
                              border: '1px solid var(--gray-200)',
                              borderRadius: 'var(--radius-md)',
                              background: '#fff',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '1rem',
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--jh-green-dark)' }}>
                                  {prob.problem_id}
                                </span>
                                <span className="badge" style={{ background: '#d1fae5', color: '#065f46', fontWeight: 600 }}>
                                  🎓 {institutionOrg?.name || 'Assigned Institution'}
                                </span>
                                {collab && (
                                  <span
                                    className="badge"
                                    style={{
                                      background: collab.status === 'accepted' ? '#eff6ff' : '#fef3c7',
                                      color: collab.status === 'accepted' ? '#1d4ed8' : '#92400e',
                                      fontWeight: 600,
                                    }}
                                  >
                                    🏭 {collab.requesting_org?.name || 'Industry Partner'} ({collab.status})
                                  </span>
                                )}
                                <span className="badge" style={{ background: '#f3f4f6', color: '#4b5563' }}>
                                  {prob.domain}
                                </span>
                              </div>
                              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{prob.title}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.2rem' }}>
                                District: <strong>{prob.district || 'Jharkhand'}</strong> · Assigned:{' '}
                                {prob.assigned_at ? new Date(prob.assigned_at).toLocaleDateString() : 'Active'}
                              </div>
                            </div>

                            <span
                              className="badge"
                              style={{
                                background: PROBLEM_STATUS_COLORS[prob.status] ? `${PROBLEM_STATUS_COLORS[prob.status]}20` : '#d1fae5',
                                color: PROBLEM_STATUS_COLORS[prob.status] || '#065f46',
                                fontWeight: 700,
                              }}
                            >
                              {PROBLEM_STATUS_LABELS[prob.status] || prob.status}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Real Distribution Rows */}
              <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                <SectionCard title="🗂️ Domain Distribution (Realtime)">
                  {Object.keys(domainCounts).length === 0 ? (
                    <EmptyState icon="🗂️" title="No data yet" description="Domain-wise distribution will appear once problems are submitted." />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {Object.entries(domainCounts).map(([dom, count]) => (
                        <div key={dom} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid var(--gray-100)' }}>
                          <span style={{ fontWeight: 500 }}>{dom}</span>
                          <span className="badge" style={{ background: '#dbeafe', color: '#1e40af', fontWeight: 700 }}>
                            {count} challenge{count > 1 ? 's' : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>

                <SectionCard title="🗺️ District Distribution (Realtime)">
                  {Object.keys(districtCounts).length === 0 ? (
                    <EmptyState icon="🗺️" title="No data yet" description="District-wise distribution will appear here." />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {Object.entries(districtCounts).map(([dist, count]) => (
                        <div key={dist} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid var(--gray-100)' }}>
                          <span style={{ fontWeight: 500 }}>{dist}</span>
                          <span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>

              {/* Stakeholder Involvement Row */}
              <div className="grid-2">
                <SectionCard title="🏛️ Registered Organizations &amp; Institutions">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {organizations.slice(0, 4).map((org) => (
                      <div key={org.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--gray-100)' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{org.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{org.address || org.state}</div>
                        </div>
                        <span className="badge" style={{ background: '#ede9fe', color: '#6d28d9' }}>
                          {org.type}
                        </span>
                      </div>
                    ))}
                    {organizations.length === 0 && (
                      <EmptyState icon="🏛️" title="No organizations found" description="Registered institutions will be listed here." />
                    )}
                  </div>
                </SectionCard>

                <SectionCard title="🤝 Inter-Stakeholder Collaborations">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {collaborations.slice(0, 4).map((c) => (
                      <div key={c.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--gray-100)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                            {c.requesting_org?.name} ➔ {c.receiving_org?.name}
                          </div>
                          <span
                            className="badge"
                            style={{
                              background: c.status === 'accepted' ? '#d1fae5' : '#fef3c7',
                              color: c.status === 'accepted' ? '#065f46' : '#92400e',
                              fontSize: '0.72rem',
                            }}
                          >
                            {c.status?.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginTop: '0.2rem' }}>
                          Challenge: {c.assignment?.problem?.title || 'Assigned project'}
                        </div>
                      </div>
                    ))}
                    {collaborations.length === 0 && (
                      <EmptyState icon="🤝" title="No collaborations logged" description="Proposals between Institutions and Industry partners appear here." />
                    )}
                  </div>
                </SectionCard>
              </div>
            </>
          )}

          {/* ASSIGNED CHALLENGES SECTION */}
          {activeSection === 'assigned' && (
            <>
              <div className="dashboard-header">
                <div>
                  <div className="dashboard-title">Assigned Challenges ({assignedCount})</div>
                  <div className="dashboard-subtitle">
                    Societal problems formally adopted by institutions with industry collaboration tracking
                  </div>
                </div>
                <span className="badge" style={{ background: '#ede9fe', color: '#6d28d9', fontWeight: 700 }}>
                  Primary Assignee Tracked
                </span>
              </div>

              <div className="card">
                <div className="card-body">
                  {assignedChallengesList.length === 0 ? (
                    <EmptyState
                      icon="📌"
                      title="No assignments yet"
                      description="Problems assigned to organizations along with assignee and industry collaboration details will appear here."
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {assignedChallengesList.map((prob) => {
                        const matchingAssignment = assignments.find((a) => a.problem_id === prob.id)
                        const institutionOrg = prob.assigned_org || matchingAssignment?.organization
                        const collab = getCollabInfo(prob.id, matchingAssignment?.id)

                        return (
                          <div
                            key={prob.id}
                            style={{
                              padding: '1.25rem',
                              border: '1px solid var(--gray-200)',
                              borderRadius: 'var(--radius-md)',
                              background: '#fff',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                            }}
                          >
                            {/* Card Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                                  <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1rem', color: 'var(--jh-green-dark)' }}>
                                    {prob.problem_id}
                                  </span>
                                  <span className="badge" style={{ background: '#ecfdf5', color: '#047857', fontWeight: 600 }}>
                                    {prob.domain}
                                  </span>
                                  <span className="badge" style={{ background: 'var(--gray-100)', color: 'var(--gray-700)' }}>
                                    📍 {prob.district || 'Jharkhand'}
                                  </span>
                                </div>
                                <h3 style={{ fontSize: '1.15rem', margin: '0.2rem 0', color: 'var(--gray-900)' }}>
                                  {prob.title}
                                </h3>
                              </div>

                              <span
                                className="badge"
                                style={{
                                  background: PROBLEM_STATUS_COLORS[prob.status] ? `${PROBLEM_STATUS_COLORS[prob.status]}20` : '#d1fae5',
                                  color: PROBLEM_STATUS_COLORS[prob.status] || '#065f46',
                                  fontWeight: 700,
                                  fontSize: '0.85rem',
                                  padding: '0.3rem 0.75rem',
                                }}
                              >
                                {PROBLEM_STATUS_LABELS[prob.status] || prob.status}
                              </span>
                            </div>

                            {/* Description */}
                            <p style={{ color: 'var(--gray-700)', fontSize: '0.92rem', lineHeight: 1.6, margin: '0 0 1rem' }}>
                              {prob.description}
                            </p>

                            {/* Stakeholder Involvement Grid */}
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                                gap: '1rem',
                                padding: '1rem',
                                background: '#f8fafc',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--gray-200)',
                              }}
                            >
                              {/* 1. Institution Details */}
                              <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                                  🎓 Primary Assigned Institution
                                </div>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#047857', marginTop: '0.2rem' }}>
                                  {institutionOrg?.name || 'Birla Institute of Technology (BIT) Mesra'}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>
                                  Classification: {institutionOrg?.type || 'University'}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.2rem' }}>
                                  Assigned Date: {prob.assigned_at ? new Date(prob.assigned_at).toLocaleDateString() : 'Active'}
                                </div>
                              </div>

                              {/* 2. Industry Collaboration Details */}
                              <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                                  🏭 Industry Collaboration Status
                                </div>
                                {collab ? (
                                  <>
                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1d4ed8', marginTop: '0.2rem' }}>
                                      {collab.requesting_org?.name || 'Tata Steel Innovation Division'}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                                      <span
                                        className="badge"
                                        style={{
                                          background: collab.status === 'accepted' ? '#d1fae5' : '#fef3c7',
                                          color: collab.status === 'accepted' ? '#065f46' : '#92400e',
                                          fontWeight: 700,
                                        }}
                                      >
                                        {collab.status === 'accepted' ? '✓ PARTNERSHIP ESTABLISHED' : 'PROPOSAL PENDING REVIEW'}
                                      </span>
                                    </div>
                                    {collab.message && (
                                      <div style={{ fontSize: '0.78rem', color: 'var(--gray-600)', fontStyle: 'italic', marginTop: '0.25rem' }}>
                                        "{collab.message}"
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: '0.2rem' }}>
                                    Open for Industry Co-Funding &amp; Scaling
                                  </div>
                                )}
                              </div>
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

          {/* ACTIVE PROJECTS SECTION */}
          {activeSection === 'active' && (
            <>
              <div className="dashboard-header">
                <div>
                  <div className="dashboard-title">Active Projects ({activeProjectsCount})</div>
                  <div className="dashboard-subtitle">Ongoing research, field prototypes, and industrial pilots</div>
                </div>
              </div>

              <div className="card">
                <div className="card-body">
                  {activeProjectsList.length === 0 ? (
                    <EmptyState icon="⚙️" title="No active projects" description="Assigned and active R&amp;D projects will be tracked here." />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {activeProjectsList.map((prob) => {
                        const matchingAssignment = assignments.find((a) => a.problem_id === prob.id)
                        const institutionOrg = prob.assigned_org || matchingAssignment?.organization
                        const collab = getCollabInfo(prob.id, matchingAssignment?.id)

                        return (
                          <div key={prob.id} style={{ padding: '1.25rem', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', background: '#fff' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--jh-green-dark)' }}>
                                {prob.problem_id}
                              </span>
                              <span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>
                                In Execution
                              </span>
                            </div>
                            <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.4rem' }}>{prob.title}</h3>
                            <p style={{ fontSize: '0.88rem', color: 'var(--gray-700)', margin: '0 0 0.75rem' }}>{prob.description}</p>
                            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.82rem', color: 'var(--gray-600)', background: 'var(--gray-50)', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)' }}>
                              <div>Institution: <strong>{institutionOrg?.name || 'Lead Academic Partner'}</strong></div>
                              <div>Industry: <strong>{collab?.requesting_org?.name || 'Awaiting Partner'}</strong></div>
                              <div>District: <strong>{prob.district || 'Jharkhand'}</strong></div>
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

          {/* PROBLEM MANAGEMENT SECTION */}
          {activeSection === 'problems' && (
            <>
              <div className="dashboard-header">
                <div>
                  <div className="dashboard-title">Problem Management</div>
                  <div className="dashboard-subtitle">Review, validate and monitor all submitted citizen challenges</div>
                </div>
                <span className="badge" style={{ background: '#dbeafe', color: '#1e40af', fontWeight: 700 }}>
                  {problems.length} Total Problems
                </span>
              </div>

              {/* Filter bar */}
              <div className="card" style={{ marginBottom: '1rem', padding: '1rem 1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    className="form-input"
                    placeholder="Search by Problem ID or title…"
                    style={{ maxWidth: 280 }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <select
                    className="form-select"
                    style={{ maxWidth: 180 }}
                    value={selectedDomain}
                    onChange={(e) => setSelectedDomain(e.target.value)}
                  >
                    {domainOptions.map((d) => (
                      <option key={d} value={d}>{d === 'All' ? 'All Domains' : d}</option>
                    ))}
                  </select>
                  <select
                    className="form-select"
                    style={{ maxWidth: 180 }}
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>{s === 'All' ? 'All Statuses' : PROBLEM_STATUS_LABELS[s] || s}</option>
                    ))}
                  </select>
                  {(searchTerm || selectedDomain !== 'All' || selectedStatus !== 'All') && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setSearchTerm('')
                        setSelectedDomain('All')
                        setSelectedStatus('All')
                      }}
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="card-body">
                  {filteredProblems.length === 0 ? (
                    <EmptyState icon="📋" title="No problems match your criteria" description="Try clearing filters or search query." />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {filteredProblems.map((prob) => (
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
                                {prob.domain}
                              </span>
                              <SeverityBadge
  severity={prob.severity}
  reportCount={prob.report_count}
/>
                              <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                                📍 {prob.district || 'Jharkhand'}
                              </span>
                            </div>
                            <div style={{ fontWeight: 600 }}>{prob.title}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: '0.2rem' }}>
                              Submitted on {new Date(prob.created_at).toLocaleDateString()}
                              {prob.poster_name && ` by ${prob.poster_name}`}
                              {prob.assigned_org?.name && ` · Assigned to: ${prob.assigned_org.name}`}
                            </div>
                          </div>
                          <span
                            className="badge"
                            style={{
                              background: PROBLEM_STATUS_COLORS[prob.status] ? `${PROBLEM_STATUS_COLORS[prob.status]}20` : '#d1fae5',
                              color: PROBLEM_STATUS_COLORS[prob.status] || '#065f46',
                              fontWeight: 700,
                            }}
                          >
                            {PROBLEM_STATUS_LABELS[prob.status] || prob.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* VALID CHALLENGES SECTION */}
          {activeSection === 'valid' && (
            <>
              <div className="dashboard-header">
                <div>
                  <div className="dashboard-title">Valid Challenges ({validChallenges.length})</div>
                  <div className="dashboard-subtitle">Validated citizen challenges verified by the state administration</div>
                </div>
              </div>
              <div className="card">
                <div className="card-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {validChallenges.map((prob) => (
                      <div key={prob.id} style={{ padding: '1rem', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', background: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--jh-green-dark)' }}>
                            {prob.problem_id}
                          </span>
                          <span className="badge" style={{ background: '#d1fae5', color: '#065f46', fontWeight: 600 }}>
                            {prob.status}
                          </span>
                        </div>
                        <div style={{ fontWeight: 600 }}>{prob.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.2rem' }}>
                          Domain: {prob.domain} · District: {prob.district || 'Jharkhand'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* INVALID CHALLENGES SECTION */}
          {activeSection === 'invalid' && (
            <>
              <div className="dashboard-header">
                <div>
                  <div className="dashboard-title">Invalid Challenges ({invalidChallenges.length})</div>
                  <div className="dashboard-subtitle">Challenges rejected after review</div>
                </div>
              </div>
              <div className="card">
                <div className="card-body">
                  {invalidChallenges.length === 0 ? (
                    <EmptyState icon="✅" title="No rejected problems" description="All submitted citizen problems are currently valid or under review." />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {invalidChallenges.map((prob) => (
                        <div key={prob.id} style={{ padding: '1rem', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', background: '#fef2f2' }}>
                          <div style={{ fontWeight: 700 }}>{prob.problem_id}: {prob.title}</div>
                          <div style={{ fontSize: '0.85rem', color: '#991b1b', marginTop: '0.2rem' }}>
                            Reason: {prob.rejection_reason || 'Rejected after review'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* COMPLETED PROJECTS SECTION */}
          {activeSection === 'completed' && (
            <>
              <div className="dashboard-header">
                <div>
                  <div className="dashboard-title">Completed Projects ({completedProjectsCount})</div>
                  <div className="dashboard-subtitle">Successfully delivered projects and social impact outcomes</div>
                </div>
              </div>
              <div className="card">
                <div className="card-body">
                  {completedProjectsList.length === 0 ? (
                    <EmptyState icon="🏆" title="No completed projects yet" description="Completed projects and delivered solutions will appear here." />
                  ) : (
                    <div>{/* Render completed list */}</div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* DOMAIN KEYWORDS SECTION */}
          {activeSection === 'domains' && (
            <>
              <div className="dashboard-header">
                <div>
                  <div className="dashboard-title">Domain Keyword Management</div>
                  <div className="dashboard-subtitle">Active classification keywords for Jharkhand societal challenges</div>
                </div>
              </div>
              {[
                { domain: 'Education',            icon: '📚' },
                { domain: 'Agriculture',          icon: '🌾' },
                { domain: 'Healthcare',           icon: '🏥' },
                { domain: 'Water Resources',      icon: '💧' },
                { domain: 'Environment',          icon: '🌿' },
                { domain: 'Energy',               icon: '⚡' },
                { domain: 'Urban Development',    icon: '🏙️' },
                { domain: 'Accessibility',        icon: '♿' },
                { domain: 'Public Administration',icon: '🏛️' },
                { domain: 'Rural Livelihoods',    icon: '🌄' },
              ].map(({ domain, icon }) => (
                <div key={domain} className="card" style={{ marginBottom: '0.75rem' }}>
                  <div className="card-header" style={{ padding: '0.875rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      {icon} {domain}
                    </span>
                    <span className="badge" style={{ background: '#dbeafe', color: '#1e40af' }}>
                      Active in Seed Data
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ORGANIZATION PARTICIPATION SECTION */}
          {activeSection === 'organizations' && (
            <>
              <div className="dashboard-header">
                <div>
                  <div className="dashboard-title">Organization Participation ({organizations.length})</div>
                  <div className="dashboard-subtitle">Universities, research institutes, industry partners, and startups</div>
                </div>
              </div>
              <div className="card">
                <div className="card-body">
                  {organizations.length === 0 ? (
                    <EmptyState icon="🏛️" title="No organizations registered" description="Registered institutions will be listed here." />
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                      {organizations.map((org) => (
                        <div key={org.id} style={{ padding: '1.25rem', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', background: '#fff' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                            <span className="badge" style={{ background: '#ede9fe', color: '#6d28d9', fontWeight: 600 }}>
                              {org.type}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>● Active</span>
                          </div>
                          <h4 style={{ margin: '0.2rem 0', fontSize: '1rem', color: 'var(--gray-900)' }}>{org.name}</h4>
                          <p style={{ fontSize: '0.82rem', color: 'var(--gray-600)', margin: '0.3rem 0 0.5rem' }}>
                            {org.description || 'Institutional partner in Jharkhand.'}
                          </p>
                          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                            Domains: {org.domains?.join(', ') || 'All Domains'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ANALYTICS SECTION */}
          {activeSection === 'analytics' && (
            <>
              <div className="dashboard-header">
                <div>
                  <div className="dashboard-title">Statewide Platform Analytics</div>
                  <div className="dashboard-subtitle">Live summary metrics from Supabase database</div>
                </div>
              </div>
              <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                <StatCard icon="📋" label="Total Challenges"       value={totalChallenges}       bg="#dbeafe" />
                <StatCard icon="🏛️" label="Active Organizations"   value={organizations.length} bg="#ede9fe" />
                <StatCard icon="🤝" label="Collaborations"         value={collaborations.length} bg="#d1fae5" />
                <StatCard icon="📌" label="Assigned Projects"      value={assignedCount}         bg="#fef3c7" />
              </div>
            </>
          )}

        </main>
      </div>
    </div>
  )
}
