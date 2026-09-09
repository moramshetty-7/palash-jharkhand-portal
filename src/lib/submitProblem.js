/**
 * submitProblem.js
 * Handles domain classification and Supabase insert for citizen problem submissions.
 * Phase 2 will add: file uploads, org matching, notifications.
 */

import { supabase } from './supabase'
import { DOMAIN_CODES } from './constants'
import { matchAndNotifyOrganizations } from './workflow'

// ─────────────────────────────────────────────
// KEYWORD TABLE (mirrors database/seed.sql)
// Used for client-side domain classification
// ─────────────────────────────────────────────
const KEYWORD_WEIGHTS = {
  Education: {
    school: 1.5, student: 1.5, teacher: 1.4, literacy: 1.4, dropout: 1.6,
    classroom: 1.3, curriculum: 1.3, learning: 1.2, 'mid-day meal': 1.4,
    enrollment: 1.5, anganwadi: 1.4, 'primary education': 1.6,
    'higher education': 1.5, scholarship: 1.3, 'digital learning': 1.3,
    vocational: 1.2, coaching: 1.1, college: 1.3, university: 1.2,
    'skill development': 1.3,
  },
  Agriculture: {
    farm: 1.5, farmer: 1.6, crop: 1.5, irrigation: 1.6, drought: 1.6,
    soil: 1.4, fertilizer: 1.3, pesticide: 1.3, harvest: 1.4, kisan: 1.5,
    seed: 1.3, msp: 1.4, yield: 1.3, land: 1.2, storage: 1.2,
    'cold storage': 1.4, mandi: 1.4, 'tribal farming': 1.5,
    'forest produce': 1.4, 'jhum cultivation': 1.5,
  },
  Healthcare: {
    hospital: 1.5, health: 1.4, doctor: 1.5, medicine: 1.4, malaria: 1.6,
    tuberculosis: 1.6, maternal: 1.5, 'child mortality': 1.7, nutrition: 1.4,
    anemia: 1.5, PHC: 1.5, ASHA: 1.4, ambulance: 1.4, vaccination: 1.4,
    sanitation: 1.3, hygiene: 1.3, 'mental health': 1.5, epidemic: 1.6,
    'sickle cell': 1.6, ayushman: 1.3,
  },
  'Water Resources': {
    water: 1.5, 'drinking water': 1.7, 'bore well': 1.5, 'hand pump': 1.5,
    pipeline: 1.4, dam: 1.4, river: 1.3, flood: 1.6, waterlogging: 1.5,
    scarcity: 1.5, contamination: 1.6, groundwater: 1.5, watershed: 1.4,
    pond: 1.3, tank: 1.3, rainwater: 1.4, 'tap water': 1.5,
    'jal jeevan': 1.5, arsenic: 1.6, fluoride: 1.6,
  },
  Environment: {
    pollution: 1.6, forest: 1.5, deforestation: 1.6, wildlife: 1.4,
    mining: 1.5, 'air quality': 1.5, waste: 1.4, garbage: 1.4,
    plastic: 1.3, climate: 1.4, temperature: 1.3, biodiversity: 1.4,
    'green cover': 1.4, effluent: 1.5, 'solid waste': 1.4, 'e-waste': 1.4,
    'noise pollution': 1.3, coal: 1.4, 'illegal mining': 1.6, encroachment: 1.4,
  },
  Energy: {
    electricity: 1.6, power: 1.4, solar: 1.5, 'load shedding': 1.6,
    grid: 1.3, voltage: 1.4, transformer: 1.4, kerosene: 1.4, LPG: 1.4,
    biomass: 1.4, renewable: 1.4, 'off-grid': 1.5, streetlight: 1.4,
    outage: 1.5, meter: 1.3, electrification: 1.6, saubhagya: 1.5,
    photovoltaic: 1.4, 'energy access': 1.6, 'cooking fuel': 1.4,
  },
  'Urban Development': {
    road: 1.5, pothole: 1.5, drainage: 1.5, housing: 1.4, slum: 1.5,
    traffic: 1.4, footpath: 1.3, 'street light': 1.4, park: 1.2,
    market: 1.2, 'bus stand': 1.4, municipality: 1.3, 'smart city': 1.4,
    pavement: 1.3, encroachment: 1.4, construction: 1.2, bridge: 1.4,
    'urban planning': 1.4, building: 1.2, 'public toilet': 1.5,
  },
  Accessibility: {
    disability: 1.7, wheelchair: 1.6, ramp: 1.5, blind: 1.6, deaf: 1.6,
    divyang: 1.7, barrier: 1.5, inclusive: 1.4, accessible: 1.5,
    braille: 1.5, 'sign language': 1.5, assistive: 1.5,
    'specially abled': 1.6, mobility: 1.4, transport: 1.3, elevator: 1.4,
    'toilet facility': 1.4, UDID: 1.4, rehabilitation: 1.5, prosthetic: 1.5,
  },
  'Public Administration': {
    corruption: 1.7, bribery: 1.7, 'government scheme': 1.5, ration: 1.5,
    PDS: 1.5, certificate: 1.4, 'caste certificate': 1.5, 'land record': 1.5,
    panchayat: 1.4, 'block office': 1.4, police: 1.3, FIR: 1.4,
    pension: 1.4, welfare: 1.3, subsidy: 1.4, grievance: 1.5,
    transparency: 1.4, digitization: 1.3, 'e-governance': 1.4, delay: 1.3,
  },
  'Rural Livelihoods': {
    livelihood: 1.6, employment: 1.5, MGNREGA: 1.6, SHG: 1.5,
    'self help group': 1.5, income: 1.4, poverty: 1.5, tribal: 1.5,
    adivasi: 1.5, migration: 1.6, crafts: 1.4, handloom: 1.4,
    'micro enterprise': 1.4, 'market access': 1.4, 'value chain': 1.3,
    tendu: 1.4, 'minor forest': 1.4, 'van dhan': 1.5, cooperative: 1.4,
    JSLPS: 1.5,
  },
}

/**
 * Classify a problem into one of the 10 domains using keyword matching.
 * Returns { domain, confidence } where confidence is 0–100.
 */
export function classifyDomain(title, description) {
  const text = `${title} ${description}`.toLowerCase()
  const scores = {}

  for (const [domain, keywords] of Object.entries(KEYWORD_WEIGHTS)) {
    let score = 0
    for (const [kw, weight] of Object.entries(keywords)) {
      // Count occurrences of the keyword in the combined text
      const regex = new RegExp(`\\b${kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g')
      const matches = text.match(regex)
      if (matches) {
        score += matches.length * weight
      }
    }
    scores[domain] = score
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const topDomain = sorted[0][0]
  const topScore = sorted[0][1]
  const totalScore = sorted.reduce((sum, [, s]) => sum + s, 0)

  const confidence = totalScore > 0
    ? Math.min(Math.round((topScore / totalScore) * 100), 99)
    : 0

  return {
    domain: topScore > 0 ? topDomain : null,
    confidence,
  }
}

/**
 * Generate a sequential Problem ID string.
 * Format: JH-{DOMAIN_CODE}-{YEAR}-{6-digit-sequence}
 * The sequence is derived from the count of existing problems in that domain.
 */
async function generateProblemId(domain) {
  const year = new Date().getFullYear()
  const code = DOMAIN_CODES[domain] || 'GEN'
  const prefix = `JH-${code}-${year}-`

  // Count existing problems in this domain this year to get next sequence
  const { count, error } = await supabase
    .from('problems')
    .select('id', { count: 'exact', head: true })
    .like('problem_id', `${prefix}%`)

  if (error) {
    console.warn('Could not count problems for ID generation:', error.message)
  }

  const seq = String((count || 0) + 1).padStart(6, '0')
  return `${prefix}${seq}`
}

/**
 * Submit a problem to Supabase.
 * @param {object} form  - { title, description, district, location_text, poster_name, poster_contact }
 * @returns {Promise<{ data, error }>}
 */
export async function submitProblem(form) {
  // 1. Classify domain
  const { domain, confidence } = classifyDomain(form.title, form.description)

  // 2. Generate Problem ID
  const problemId = await generateProblemId(domain)

  // 3. Build the row
  const row = {
    problem_id:        problemId,
    title:             form.title.trim(),
    description:       form.description.trim(),
    district:          form.district || null,
    location_text:     form.location_text?.trim() || null,
    poster_name:       form.poster_name?.trim() || null,
    poster_contact:    form.poster_contact?.trim() || null,
    domain:            domain,
    domain_confidence: confidence,
    status:            'submitted',
  }

  // 4. Insert into Supabase
  const { data, error } = await supabase
    .from('problems')
    .insert(row)
    .select('*')
    .single()

  if (error) {
    return { data: null, error }
  }

  // 5. Asynchronously match organizations and insert persistent notifications
  try {
    await matchAndNotifyOrganizations(data)
  } catch (matchErr) {
    console.warn('Matching notice:', matchErr)
  }

  return {
    data: {
      id:         data.id,
      problem_id: data.problem_id,
      domain:     data.domain,
      confidence: data.domain_confidence,
    },
    error: null,
  }
}
