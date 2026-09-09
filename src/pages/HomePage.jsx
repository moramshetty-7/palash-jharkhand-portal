import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import './HomePage.css'

const STAKEHOLDER_CARDS = [
  {
    type: 'citizen',
    icon: '📝',
    iconBg: '#ecfdf5',
    badge: 'Citizen · Zero Barrier',
    badgeBg: '#d1fae5',
    badgeColor: '#065f46',
    title: 'Post a Societal Problem',
    desc: 'Voice community challenges in education, water, healthcare, or agriculture. No account or password required.',
    to: '/post-problem',
    actionText: 'Post a Problem →',
    actionColor: '#059669',
  },
  {
    type: 'citizen',
    icon: '🔍',
    iconBg: '#eff6ff',
    badge: 'Citizen · Live Tracking',
    badgeBg: '#dbeafe',
    badgeColor: '#1e40af',
    title: 'Track Problem Status',
    desc: 'Enter your unique Problem ID to track AI classification, institutional assignment, and field resolution in real time.',
    to: '/track-problem',
    actionText: 'Track Status →',
    actionColor: '#2563eb',
  },
  {
    type: 'institution',
    icon: '🎓',
    iconBg: '#ecfdf5',
    badge: 'Academic & R&D',
    badgeBg: '#d1fae5',
    badgeColor: '#047857',
    title: 'Institution Innovation Portal',
    desc: 'Universities, colleges, and research institutes across Jharkhand adopt citizen problems as primary R&D assignees.',
    to: '/institution/login',
    actionText: 'Institution Login →',
    actionColor: '#047857',
  },
  {
    type: 'industry',
    icon: '🏭',
    iconBg: '#eff6ff',
    badge: 'Industry & Startups',
    badgeBg: '#dbeafe',
    badgeColor: '#1d4ed8',
    title: 'Industry & CSR Portal',
    desc: 'Enterprises, MSMEs, and startups request co-innovation to scale prototypes, deploy tech, and co-fund via CSR.',
    to: '/industry/login',
    actionText: 'Industry Login →',
    actionColor: '#1d4ed8',
  },
  {
    type: 'government',
    icon: '⚙️',
    iconBg: '#fffbeb',
    badge: 'State Administration',
    badgeBg: '#fef3c7',
    badgeColor: '#92400e',
    title: 'Government Administration',
    desc: 'Jharkhand nodal officers validate challenges, assign projects, monitor milestones, and measure grassroots outcomes.',
    to: '/government/login',
    actionText: 'Government Login →',
    actionColor: '#d97706',
  },
]

const DOMAINS = [
  { icon: '📚', label: 'Education' },
  { icon: '🌾', label: 'Agriculture' },
  { icon: '🏥', label: 'Healthcare' },
  { icon: '💧', label: 'Water Resources' },
  { icon: '🌿', label: 'Environment' },
  { icon: '⚡', label: 'Energy' },
  { icon: '🏙️', label: 'Urban Development' },
  { icon: '♿', label: 'Accessibility' },
  { icon: '🏛️', label: 'Public Administration' },
  { icon: '🌄', label: 'Rural Livelihoods' },
]

export default function HomePage() {
  return (
    <div className="palash-page">
      <Navbar />

      {/* HERO SECTION */}
      <section className="palash-hero">
        <div className="palash-hero-glow" />
        <div className="palash-hero-pattern" />

        <div className="palash-hero-content">
          {/* Heading */}
          <h1 className="palash-hero-title">
            From <span className="palash-gradient-text">Challenges</span> to <span className="palash-gradient-text">Change</span>
          </h1>

          <div className="palash-hero-tagline">
            Jharkhand Societal Innovation Collaboration Portal
          </div>

          <p className="palash-hero-desc">
            Named after the sacred <strong>Palash</strong> flower — the Flame of the Forest and State Flower of Jharkhand.
            Connecting citizens, premier academic institutions, industry leaders, and state government to turn grassroots
            challenges into collaborative, scalable solutions.
          </p>

          {/* Action CTAs */}
          <div className="palash-hero-actions">
            <Link to="/post-problem" className="btn-palash-primary">
              <span>📝</span>
              <span>Post a Problem</span>
            </Link>
            <Link to="/track-problem" className="btn-palash-secondary">
              <span>🔍</span>
              <span>Track Problem Status</span>
            </Link>
          </div>

          {/* Stats Ribbon */}
          <div className="palash-stats-ribbon">
            <div className="palash-stat-item">
              <div className="palash-stat-num">24</div>
              <div className="palash-stat-label">Districts of Jharkhand</div>
            </div>
            <div className="palash-stat-item">
              <div className="palash-stat-num">10<span>+</span></div>
              <div className="palash-stat-label">Problem Domains</div>
            </div>
            <div className="palash-stat-item">
              <div className="palash-stat-num">4</div>
              <div className="palash-stat-label">Connected Stakeholders</div>
            </div>
            <div className="palash-stat-item">
              <div className="palash-stat-num">Live<span>●</span></div>
              <div className="palash-stat-label">Realtime Collaboration</div>
            </div>
          </div>
        </div>
      </section>

      {/* FOUR STAKEHOLDERS PARTICIPATION SECTION */}
      <section className="palash-section">
        <div className="palash-section-header">
          <span className="palash-section-kicker">Unified Collaboration Ecosystem</span>
          <h2 className="palash-section-title">How Would You Like to Participate?</h2>
          <p className="palash-section-desc">
            PALASH unites all four key pillars of societal change under a single transparent, realtime collaborative platform.
          </p>
        </div>

        <div className="palash-stakeholders-grid">
          {STAKEHOLDER_CARDS.map((card) => (
            <Link
              key={card.title}
              to={card.to}
              className={`palash-stakeholder-card ${card.type}`}
            >
              <div className="palash-card-top">
                <div className="palash-card-icon" style={{ background: card.iconBg }}>
                  {card.icon}
                </div>
                <span
                  className="palash-card-badge"
                  style={{ background: card.badgeBg, color: card.badgeColor }}
                >
                  {card.badge}
                </span>
              </div>

              <div className="palash-card-title">{card.title}</div>
              <div className="palash-card-desc">{card.desc}</div>

              <div className="palash-card-action" style={{ color: card.actionColor }}>
                <span>{card.actionText}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* HOW PALASH WORKS */}
      <section className="palash-workflow-section">
        <div className="palash-section-header">
          <span className="palash-section-kicker">The Innovation Lifecycle</span>
          <h2 className="palash-section-title">How PALASH Drives Change</h2>
          <p className="palash-section-desc">
            A continuous, transparent pipeline from citizen issue to state-monitored field deployment.
          </p>
        </div>

        <div className="palash-steps-grid">
          <div className="palash-step-card">
            <span className="palash-step-num">STEP 01</span>
            <div className="palash-step-title">Citizen Posts Challenge</div>
            <div className="palash-step-desc">
              Citizens describe civic or rural challenges without needing an account. The system auto-classifies the domain using AI keywords and generates a Problem ID.
            </div>
          </div>

          <div className="palash-step-card">
            <span className="palash-step-num">STEP 02</span>
            <div className="palash-step-title">Realtime Stakeholder Matching</div>
            <div className="palash-step-desc">
              Eligible universities, research institutes, and industry partners in Jharkhand matching the domain receive persistent realtime notifications.
            </div>
          </div>

          <div className="palash-step-card">
            <span className="palash-step-num">STEP 03</span>
            <div className="palash-step-title">Institution R&amp;D Adoption</div>
            <div className="palash-step-desc">
              A university or research lab accepts the problem as primary assignee, initiating formal R&amp;D, faculty assignments, and lab prototypes.
            </div>
          </div>

          <div className="palash-step-card">
            <span className="palash-step-num">STEP 04</span>
            <div className="palash-step-title">Industry Co-Innovation</div>
            <div className="palash-step-desc">
              Industry partners propose collaboration for pilot testing, manufacturing scaling, and CSR co-funding, forming a joint project team.
            </div>
          </div>

          <div className="palash-step-card">
            <span className="palash-step-num">STEP 05</span>
            <div className="palash-step-title">Government Governance &amp; Impact</div>
            <div className="palash-step-desc">
              Jharkhand state administration monitors progress across all 24 districts in realtime, evaluating measurable societal outcomes.
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM DOMAINS */}
      <section className="palash-section">
        <div className="palash-section-header">
          <span className="palash-section-kicker">Key Societal Focus Areas</span>
          <h2 className="palash-section-title">10 Categorized Problem Domains</h2>
          <p className="palash-section-desc">
            Automated keyword matching ensures challenges are directed to the right specialized experts.
          </p>
        </div>

        <div className="palash-domains-grid">
          {DOMAINS.map((d) => (
            <div key={d.label} className="palash-domain-card">
              <div className="palash-domain-icon">{d.icon}</div>
              <div className="palash-domain-name">{d.label}</div>
            </div>
          ))}
        </div>

        {/* Mission Statement Banner */}
        <div className="palash-mission-banner">
          <div className="palash-mission-glow" />
          <div className="palash-mission-content">
            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.95)', padding: '6px 16px', borderRadius: '12px', marginBottom: '1.25rem' }}>
              <img
                src="/assets/palash-logo-exact.png"
                alt="PALASH"
                style={{ height: '36px', width: 'auto', display: 'block', objectFit: 'contain' }}
              />
            </div>
            <h3 className="palash-mission-title">Empowering Jharkhand's Future Through Collaborative Innovation</h3>
            <p className="palash-mission-text">
              PALASH is designed to bridge the gap between community needs and technological capabilities,
              fostering a culture of collective problem-solving across all 24 districts of Jharkhand.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/post-problem" className="btn-palash-primary">
                Post a Problem Now
              </Link>
              <Link to="/track-problem" className="btn-palash-secondary">
                Track Existing Problem
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
