import { useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { supabase } from '../lib/supabase'
import { PROBLEM_STATUS_LABELS, PROBLEM_STATUS_COLORS } from '../lib/constants'

export default function TrackProblemPage() {
  const [problemId, setProblemId] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | found | not_found
  const [problemData, setProblemData] = useState(null)

  const handleTrack = async (e) => {
    e.preventDefault()
    const cleanId = problemId.trim().toUpperCase()
    if (!cleanId) return
    setStatus('loading')
    setProblemData(null)

    try {
      const { data, error } = await supabase
        .from('problems')
        .select(`
          *,
          assigned_org:organizations!assigned_to (id, name, type, domains),
          assignments (
            id,
            status,
            notes,
            created_at,
            collaboration_requests (
              id,
              status,
              requesting_org:organizations!requesting_org_id (id, name, type)
            )
          )
        `)
        .ilike('problem_id', cleanId)
        .maybeSingle()

      if (error || !data) {
        setStatus('not_found')
      } else {
        setProblemData(data)
        setStatus('found')
      }
    } catch (err) {
      console.error('Error tracking problem:', err)
      setStatus('not_found')
    }
  }

  const handleReset = () => {
    setProblemId('')
    setProblemData(null)
    setStatus('idle')
  }

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="page-content">
        <div className="container" style={{ maxWidth: 680 }}>

          {/* Page header */}
          <div style={{ marginBottom: '1.75rem' }}>
            <Link to="/" className="btn btn-ghost btn-sm" style={{ marginBottom: '0.75rem' }}>
              ← Back to Home
            </Link>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>Track Your Problem</h1>
            <p className="text-gray text-sm">
              Enter your Problem ID to see the current status, timeline and updates.
            </p>
          </div>

          {/* Search card */}
          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>🔍 Problem Lookup</span>
            </div>
            <div className="card-body">
              <form onSubmit={handleTrack}>
                <div className="form-group">
                  <label className="form-label" htmlFor="problem-id-input">
                    Problem ID
                  </label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <input
                      id="problem-id-input"
                      className="form-input"
                      value={problemId}
                      onChange={(e) => setProblemId(e.target.value.toUpperCase())}
                      placeholder="e.g. JH-AGR-2026-000001"
                      style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}
                      disabled={status === 'loading'}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={!problemId.trim() || status === 'loading'}
                      style={{ flexShrink: 0 }}
                    >
                      {status === 'loading' ? (
                        <><span className="loading-spinner" /> Tracking…</>
                      ) : '🔍 Track'}
                    </button>
                  </div>
                  <div className="form-hint">
                    Your Problem ID was shown when you submitted your problem. Format: JH-[DOMAIN]-[YEAR]-[NUMBER]
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Result area */}
          {status === 'not_found' && (
            <div style={{ marginTop: '1.25rem' }}>
              <div className="alert alert-warning">
                <span className="alert-icon">⚠️</span>
                <div>
                  <strong>Problem not found</strong>
                  <div style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                    No problem found for ID <code style={{ fontFamily: 'monospace' }}>{problemId}</code>.
                    Please check the ID and try again, or{' '}
                    <Link to="/post-problem">post a new problem</Link>.
                  </div>
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleReset}
                style={{ marginTop: '0.75rem' }}
              >
                ← Search again
              </button>
            </div>
          )}

          {/* Problem detail area */}
          {status === 'found' && problemData && (
            <div style={{ marginTop: '1.25rem' }}>
              {/* Problem summary card */}
              <div className="card" style={{ marginBottom: '1rem' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700 }}>Problem Summary</span>
                  <span
                    className="badge"
                    style={{
                      background: PROBLEM_STATUS_COLORS[problemData.status] ? `${PROBLEM_STATUS_COLORS[problemData.status]}20` : '#d1fae5',
                      color: PROBLEM_STATUS_COLORS[problemData.status] || '#065f46',
                      fontWeight: 700,
                      border: `1px solid ${PROBLEM_STATUS_COLORS[problemData.status] || '#059669'}`
                    }}
                  >
                    {PROBLEM_STATUS_LABELS[problemData.status] || problemData.status}
                  </span>
                </div>
                <div className="card-body">
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Problem ID: <strong style={{ fontFamily: 'monospace', color: 'var(--gray-800)' }}>{problemData.problem_id}</strong>
                    </div>
                    <h3 style={{ fontSize: '1.2rem', marginTop: '0.25rem', color: 'var(--gray-900)' }}>
                      {problemData.title}
                    </h3>
                  </div>

                  <p style={{ color: 'var(--gray-700)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                    {problemData.description}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Domain</span>
                      <div style={{ fontWeight: 600 }}>{problemData.domain || 'Classified'}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>District</span>
                      <div style={{ fontWeight: 600 }}>{problemData.district || 'Jharkhand'}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Submitted On</span>
                      <div style={{ fontWeight: 600 }}>
                        {new Date(problemData.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Timeline card */}
              <div className="card">
                <div className="card-header">
                  <span style={{ fontWeight: 700 }}>📅 Status Timeline</span>
                </div>
                <div className="card-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <span style={{ color: '#059669', fontSize: '1.1rem' }}>✓</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Problem Submitted</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                          Logged in portal and classified into domain: {problemData.domain}
                        </div>
                      </div>
                    </div>
                    {problemData.status !== 'submitted' && (
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <span style={{ color: '#3b82f6', fontSize: '1.1rem' }}>✓</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Under Review / Assignment</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                            Assessed by Jharkhand nodal officials and matched with partner institutions
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <button className="btn btn-ghost btn-sm" onClick={handleReset}>
                  ← Track another problem
                </button>
              </div>
            </div>
          )}

          {/* Info box */}
          {status === 'idle' && (
            <div className="alert alert-info" style={{ marginTop: '1.25rem' }}>
              <span className="alert-icon">ℹ️</span>
              <div>
                <strong>Don't have a Problem ID?</strong>
                <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Problem IDs are generated automatically when you submit a problem.{' '}
                  <Link to="/post-problem">Post a problem now →</Link>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
      <Footer />
    </div>
  )
}
