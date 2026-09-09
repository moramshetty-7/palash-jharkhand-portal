// Domain configuration - matches Supabase domain_keywords table
export const DOMAINS = [
  'Education',
  'Agriculture',
  'Healthcare',
  'Water Resources',
  'Environment',
  'Energy',
  'Urban Development',
  'Accessibility',
  'Public Administration',
  'Rural Livelihoods',
]

// Domain codes for Problem ID generation
export const DOMAIN_CODES = {
  'Education': 'EDU',
  'Agriculture': 'AGR',
  'Healthcare': 'HLT',
  'Water Resources': 'WTR',
  'Environment': 'ENV',
  'Energy': 'ENR',
  'Urban Development': 'URB',
  'Accessibility': 'ACC',
  'Public Administration': 'ADM',
  'Rural Livelihoods': 'RRL',
}

// Problem status flow
export const PROBLEM_STATUS = {
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
}

export const PROBLEM_STATUS_LABELS = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  rejected: 'Rejected',
}

export const PROBLEM_STATUS_COLORS = {
  submitted: '#f59e0b',
  under_review: '#3b82f6',
  assigned: '#8b5cf6',
  in_progress: '#10b981',
  completed: '#059669',
  rejected: '#ef4444',
}

// Organization types
export const ORG_TYPES = [
  'University',
  'Research Institution',
  'Industry',
  'Startup',
  'MSME',
  'CSR Organization',
]

// Milestone types
export const MILESTONE_TYPES = [
  'Problem Research',
  'Requirement Analysis',
  'Prototype',
  'Testing',
  'Deployment',
]

// Milestone status
export const MILESTONE_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
}

// User roles
export const USER_ROLES = {
  CITIZEN: 'citizen',
  INSTITUTION: 'institution',
  INDUSTRY: 'industry',
  GOVERNMENT: 'government',
  ORGANIZATION: 'organization', // backward compatibility
}

// Stakeholder metadata and configuration
export const STAKEHOLDERS = {
  CITIZEN: {
    id: 'citizen',
    name: 'Citizen',
    badge: 'Citizen',
    description: 'Post and track societal challenges across Jharkhand without an account',
    authRequired: false,
  },
  INSTITUTION: {
    id: 'institution',
    name: 'Institution',
    badge: 'Academic & R&D',
    description: 'Universities, colleges, and research institutes solving R&D challenges',
    loginPath: '/institution/login',
    dashboardPath: '/institution/dashboard',
    authRequired: true,
  },
  INDUSTRY: {
    id: 'industry',
    name: 'Industry',
    badge: 'Industry & Startups',
    description: 'Industry partners, MSMEs, startups, and CSR organizations deploying solutions',
    loginPath: '/industry/login',
    dashboardPath: '/industry/dashboard',
    authRequired: true,
  },
  GOVERNMENT: {
    id: 'government',
    name: 'Government',
    badge: 'State Administration',
    description: 'Jharkhand state administration and nodal officers monitoring outcomes',
    loginPath: '/government/login',
    dashboardPath: '/government/dashboard',
    authRequired: true,
  },
}

/**
 * Robustly determines the stakeholder role from profiles and organizations schema
 * Handles 'government', 'institution', 'industry', and 'citizen'
 */
export function determineStakeholderRole(profile, user) {
  if (!profile && !user) return null

  // 1. Direct role check
  const directRole = (profile?.role || user?.user_metadata?.role || '').toLowerCase()
  if (directRole === 'government') return 'government'
  if (directRole === 'institution') return 'institution'
  if (directRole === 'industry') return 'industry'
  if (directRole === 'citizen') return 'citizen'

  // 2. User metadata check
  const metaStakeholder = (user?.user_metadata?.stakeholder || user?.user_metadata?.stakeholderRole || '').toLowerCase()
  if (metaStakeholder === 'institution') return 'institution'
  if (metaStakeholder === 'industry') return 'industry'
  if (metaStakeholder === 'government') return 'government'
  if (metaStakeholder === 'citizen') return 'citizen'

  // 3. Organization table check (University / Research Institution vs Industry / Startup / MSME / CSR)
  const org = Array.isArray(profile?.organizations)
    ? profile.organizations[0]
    : (profile?.organizations || profile?.organization || null)

  if (org?.type) {
    const institutionTypes = ['university', 'research institution', 'institution', 'college', 'academic']
    const industryTypes = ['industry', 'startup', 'msme', 'csr organization', 'corporate']

    const normalizedType = org.type.toLowerCase()
    if (institutionTypes.some((t) => normalizedType.includes(t))) {
      return 'institution'
    }
    if (industryTypes.some((t) => normalizedType.includes(t))) {
      return 'industry'
    }
  }

  // 4. Default for organization
  if (directRole === 'organization') {
    return 'organization'
  }

  return directRole || 'citizen'
}

// Jharkhand districts
export const JHARKHAND_DISTRICTS = [
  'Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka',
  'East Singhbhum', 'Garhwa', 'Giridih', 'Godda', 'Gumla',
  'Hazaribagh', 'Jamtara', 'Khunti', 'Koderma', 'Latehar',
  'Lohardaga', 'Pakur', 'Palamu', 'Ramgarh', 'Ranchi',
  'Sahibganj', 'Seraikela Kharsawan', 'Simdega', 'West Singhbhum',
]

// Notification types
export const NOTIFICATION_TYPES = {
  PROBLEM_SUBMITTED: 'problem_submitted',
  PROBLEM_ASSIGNED: 'problem_assigned',
  COLLABORATION_REQUESTED: 'collaboration_requested',
  COLLABORATION_ACCEPTED: 'collaboration_accepted',
  MILESTONE_UPDATED: 'milestone_updated',
  NEW_MATCH: 'new_match',
}
