import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { JHARKHAND_DISTRICTS } from '../lib/constants'
import { classifyDomain, submitProblem } from '../lib/submitProblem'
import { supabase } from '../lib/supabase'

export default function PostProblemPage() {
  const [form, setForm] = useState({
    title: '',
    description: '',
    district: '',
    location_text: '',
    poster_name: '',
    poster_contact: '',
  })
  const [files, setFiles] = useState([])
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [result, setResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')


const [language, setLanguage] = useState('en-IN')
const [isListening, setIsListening] = useState(false)
const [speechSupported, setSpeechSupported] = useState(true)
const [speechError, setSpeechError] = useState('')
const [analysis, setAnalysis] = useState(null)
const recognitionRef = useRef(null)

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleAnalyze = () => {
  const { domain, confidence } = classifyDomain(
    form.title,
    form.description
  )

  setAnalysis({
    domain,
    confidence,
  })
}
const translateToEnglish = async (text) => {
  if (!text.trim() || language === 'en-IN') {
    return text.trim()
  }

  const { data, error } = await supabase.functions.invoke(
    'translate-to-english',
    {
      body: {
        text: text.trim(),
        language,
      },
    }
  )

  if (error) {
    throw new Error('Translation failed. Please try again.')
  }

  if (!data?.translatedText) {
    throw new Error('Could not translate the speech.')
  }

  return data.translatedText
}

  useEffect(() => {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition

  if (!SpeechRecognition) {
    setSpeechSupported(false)
    return
  }

  const recognition = new SpeechRecognition()

  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = language

  recognition.onresult = async (event) => {
  let transcript = ''

  for (let i = 0; i < event.results.length; i++) {
    transcript += event.results[i][0].transcript
  }

  transcript = transcript.trim()

  if (!transcript) return

  try {
    const englishText = await translateToEnglish(transcript)

    setForm((prev) => ({
      ...prev,
      description: englishText,
    }))
  } catch (error) {
    setSpeechError(error.message)
  }
}

  recognition.onerror = (event) => {
    setSpeechError(
      event.error === 'not-allowed'
        ? 'Microphone permission was denied.'
        : `Speech recognition error: ${event.error}`
    )
    setIsListening(false)
  }

  recognition.onend = () => {
    setIsListening(false)
  }

  recognitionRef.current = recognition

  return () => {
    try {
      recognition.abort()
    } catch {}
    recognitionRef.current = null
  }
}, [language])
  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files)
    setFiles(selected)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.description.trim()) {
      setErrorMsg('Title and description are required.')
      return
    }
    setErrorMsg('')
    setStatus('loading')

    const { data, error } = await submitProblem(form, files)

    if (error) {
      setErrorMsg(error.message || 'Submission failed. Please try again.')
      setStatus('error')
      return
    }

    setResult(data)
    setStatus('success')
    // Reset form fields after success
    setForm({ title: '', description: '', district: '', location_text: '', poster_name: '', poster_contact: '' })
    setFiles([])
  }

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="page-content">
        <div className="container" style={{ maxWidth: 720 }}>

          {/* Page header */}
          <div style={{ marginBottom: '1.75rem' }}>
            <Link to="/" className="btn btn-ghost btn-sm" style={{ marginBottom: '0.75rem' }}>
              ← Back to Home
            </Link>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>Post a Problem</h1>
            <p className="text-gray text-sm">
              Describe the challenge your community faces. Our AI will categorize it and notify relevant organizations.
            </p>
          </div>

          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>📝 Problem Details</span>
              <span className="badge badge-green">Auto-classified by AI</span>
            </div>

            <form onSubmit={handleSubmit} className="card-body">
              {/* Title */}
              <div className="form-group">
                <label className="form-label">
                  Problem Title <span className="required">*</span>
                </label>
                <input
                  className="form-input"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. Lack of clean drinking water in Gumla villages"
                  maxLength={200}
                  required
                />
                <div className="form-hint">{form.title.length}/200 characters</div>
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label">
                  Detailed Description <span className="required">*</span>
                </label>
                <div style={{
  display: 'flex',
  gap: '0.6rem',
  alignItems: 'center',
  flexWrap: 'wrap',
  marginBottom: '0.6rem'
}}>
  <select
    className="form-select"
    value={language}
    onChange={(e) => setLanguage(e.target.value)}
    style={{ maxWidth: '220px' }}
  >
    <option value="en-IN">🇮🇳 English</option>
    <option value="hi-IN">🇮🇳 हिंदी</option>
    <option value="bn-IN">🇮🇳 বাংলা</option>
  </select>

  {!isListening ? (
    <button
      type="button"
      className="btn btn-primary"
      onClick={() => {
        setSpeechError('')
        recognitionRef.current?.start()
        setIsListening(true)
      }}
      disabled={!speechSupported}
    >
      🎙️ Speak Problem
    </button>
  ) : (
    <button
      type="button"
      className="btn btn-primary"
      onClick={() => {
        recognitionRef.current?.stop()
        setIsListening(false)
      }}
    >
      ⏹ Stop Listening
    </button>
  )}
</div>
                <textarea
                  className="form-textarea"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe the problem in detail — who is affected, where, since when, what impact it has…"
                  rows={5}
                  required
                />
                <div className="form-hint">
                  More detail helps the AI classify accurately and find the right organizations.
                </div>
                <button
  type="button"
  className="btn btn-primary"
  onClick={handleAnalyze}
  disabled={!form.description.trim()}
  style={{ marginTop: '0.6rem' }}
>
  🤖 Analyze Problem
</button>

{analysis && (
  <div
    className="alert alert-info"
    style={{ marginTop: '0.6rem' }}
  >
    <span className="alert-icon">🤖</span>
    <div>
      <strong>PALASH Analysis</strong>
      <div>
        Detected Domain: <strong>{analysis.domain}</strong>
        {' · '}
        Confidence: <strong>{analysis.confidence}%</strong>
      </div>
    </div>
  </div>
)}
              </div>

              {/* Location */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">District</label>
                  <select
                    className="form-select"
                    name="district"
                    value={form.district}
                    onChange={handleChange}
                  >
                    <option value="">Select district…</option>
                    {JHARKHAND_DISTRICTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Location / Village / Area</label>
                  <input
                    className="form-input"
                    name="location_text"
                    value={form.location_text}
                    onChange={handleChange}
                    placeholder="e.g. Bero Block, Ranchi"
                  />
                </div>
              </div>

              {/* Contact */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Your Name</label>
                  <input
                    className="form-input"
                    name="poster_name"
                    value={form.poster_name}
                    onChange={handleChange}
                    placeholder="Full name (optional)"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact (Phone / Email)</label>
                  <input
                    className="form-input"
                    name="poster_contact"
                    value={form.poster_contact}
                    onChange={handleChange}
                    placeholder="For status updates (optional)"
                  />
                </div>
              </div>

              {/* Media upload */}
              <div className="form-group">
                <label className="form-label">Upload Media (Optional)</label>
                <div style={{
                  border: '2px dashed var(--gray-300)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.5rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'var(--gray-50)',
                }}>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    id="media-upload"
                  />
                  <label htmlFor="media-upload" style={{ cursor: 'pointer' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>📎</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)' }}>
                      Click to upload images, videos or documents
                    </div>
                    <div className="form-hint" style={{ marginTop: '0.25rem' }}>
                      JPG, PNG, MP4, PDF, DOC — max 10MB per file
                    </div>
                  </label>
                </div>
                {files.length > 0 && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {files.map((f, i) => (
                      <span key={i} className="badge badge-blue">{f.name}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Error */}
              {errorMsg && (
                <div className="alert alert-error">
                  <span className="alert-icon">⚠️</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Success */}
              {status === 'success' && result && (
                <div className="alert alert-success">
                  <span className="alert-icon">✅</span>
                  <div>
                    <strong>Problem submitted!</strong>
                    <div>Your Problem ID: <strong style={{ fontFamily: 'monospace' }}>{result.problem_id}</strong></div>
                    <div style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
                      Domain: {result.domain} · Confidence: {result.confidence}%
                    </div>
                  </div>
                </div>
              )}

              {/* Submit */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <Link to="/" className="btn btn-ghost">Cancel</Link>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={status === 'loading'}
                >
                  {status === 'loading' ? (
                    <><span className="loading-spinner"></span> Submitting…</>
                  ) : '📤 Submit Problem'}
                </button>
              </div>
            </form>
          </div>

          {/* Info box */}
          <div className="alert alert-info" style={{ marginTop: '1.25rem' }}>
            <span className="alert-icon">ℹ️</span>
            <div>
              <strong>What happens next?</strong>
              <ul style={{ marginTop: '0.4rem', paddingLeft: '1rem', fontSize: '0.85rem' }}>
                <li>Your problem is auto-classified into one of 10 domains</li>
                <li>A unique Problem ID (e.g. JH-AGR-2026-000001) is generated</li>
                <li>Similar existing problems are detected</li>
                <li>Eligible organizations are notified in real time</li>
                <li>Track progress anytime using your Problem ID</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
