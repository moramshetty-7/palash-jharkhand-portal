/**
 * workflow.js
 * Core database workflow logic connecting Citizen -> Institution -> Industry -> Government.
 * Uses real Supabase queries and persistent notifications.
 */

import { supabase } from './supabase'

/**
 * Identify matching Institution and Industry organizations for a submitted problem
 * and persist matches and notifications into Supabase.
 */
export async function matchAndNotifyOrganizations(problem) {
  try {
    if (!problem || !problem.id) return

    // 1. Fetch active organizations
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, profile_id, name, type, domains')
      .eq('is_active', true)

    if (orgsError || !orgs || orgs.length === 0) {
      console.warn('No active organizations found for matching')
      return
    }

    // 2. Filter organizations by domain relevance
    const matchedOrgs = orgs.filter((org) => {
      if (!problem.domain) return true
      if (!org.domains || org.domains.length === 0) return true
      return org.domains.some(
        (d) => d.toLowerCase() === problem.domain.toLowerCase()
      )
    })

    const targetOrgs = matchedOrgs.length > 0 ? matchedOrgs : orgs

    // 3. Insert matches into organization_problem_matches
    const matchRows = targetOrgs.map((org) => ({
      problem_id: problem.id,
      organization_id: org.id,
      match_score: problem.domain_confidence || 80,
      response: 'pending',
    }))

    // Upsert match rows (safe on conflict)
    await supabase
      .from('organization_problem_matches')
      .upsert(matchRows, { onConflict: 'problem_id,organization_id' })

    // 4. Send persistent notifications to matching organizations' profiles
    const notificationsToInsert = targetOrgs
      .filter((org) => org.profile_id)
      .map((org) => ({
        profile_id: org.profile_id,
        type: 'new_match',
        title: `New Challenge in ${problem.domain || 'Jharkhand'}`,
        body: `A new societal problem "${problem.title}" was submitted in ${problem.district || 'Jharkhand'}. Matched with your domain expertise.`,
        data: {
          problem_id: problem.id,
          custom_problem_id: problem.problem_id,
          domain: problem.domain,
          district: problem.district,
        },
      }))

    // 5. Also notify Government profiles
    const { data: govProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'government')

    if (govProfiles && govProfiles.length > 0) {
      govProfiles.forEach((gov) => {
        notificationsToInsert.push({
          profile_id: gov.id,
          type: 'problem_submitted',
          title: `New Problem: ${problem.problem_id || 'Submitted'}`,
          body: `Citizen submitted "${problem.title}" in ${problem.district || 'Jharkhand'} (${problem.domain}).`,
          data: {
            problem_id: problem.id,
            custom_problem_id: problem.problem_id,
            domain: problem.domain,
          },
        })
      })
    }

    if (notificationsToInsert.length > 0) {
      await supabase.from('notifications').insert(notificationsToInsert)
    }
  } catch (err) {
    console.error('Error matching organizations:', err)
  }
}

/**
 * Institution accepts a problem:
 * - Ensures only one Institution becomes primary assignee
 * - Updates problems table
 * - Creates assignments record
 * - Notifies Government and relevant Industry stakeholders
 */
export async function acceptProblem({ problemId, orgId, profileId, orgName, problemTitle, domain }) {
  try {
    // 1. Verify problem is not already assigned
    const { data: currentProblem, error: checkError } = await supabase
      .from('problems')
      .select('id, problem_id, assigned_to, title, domain')
      .eq('id', problemId)
      .single()

    if (checkError) throw checkError

    if (currentProblem.assigned_to) {
      return {
        success: false,
        error: 'This challenge has already been adopted by another institution.',
      }
    }

    const now = new Date().toISOString()

    // 2. Update problem status and assigned_to
    const { error: updateError } = await supabase
      .from('problems')
      .update({
        assigned_to: orgId,
        assigned_at: now,
        status: 'assigned',
      })
      .eq('id', problemId)

    if (updateError) throw updateError

    // 3. Create assignment record
    const { data: assignment, error: assignError } = await supabase
      .from('assignments')
      .insert({
        problem_id: problemId,
        organization_id: orgId,
        assigned_by: profileId,
        status: 'active',
        notes: `R&D adopted by ${orgName || 'Institution'}`,
      })
      .select()
      .single()

    if (assignError) throw assignError

    // 4. Notify Government officials
    const { data: govProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'government')

    const notifications = []

    if (govProfiles) {
      govProfiles.forEach((gov) => {
        notifications.push({
          profile_id: gov.id,
          type: 'problem_assigned',
          title: `Problem Assigned: ${currentProblem.problem_id}`,
          body: `${orgName || 'Institution'} has officially adopted challenge "${problemTitle}" for R&D.`,
          data: { problem_id: problemId, organization_id: orgId, assignment_id: assignment.id },
        })
      })
    }

    // 5. Notify Industry organizations in the domain about R&D adoption
    const { data: industryOrgs } = await supabase
      .from('organizations')
      .select('profile_id, name, domains, type')
      .in('type', ['Industry', 'Startup', 'MSME', 'CSR Organization'])
      .eq('is_active', true)

    if (industryOrgs) {
      industryOrgs.forEach((ind) => {
        if (ind.profile_id) {
          notifications.push({
            profile_id: ind.profile_id,
            type: 'problem_assigned',
            title: `R&D Underway: ${currentProblem.problem_id}`,
            body: `${orgName || 'An institution'} started R&D on "${problemTitle}". You can now request collaboration for scaling & deployment.`,
            data: { problem_id: problemId, assignment_id: assignment.id, institution_org_id: orgId },
          })
        }
      })
    }

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications)
    }

    return { success: true, assignment }
  } catch (err) {
    console.error('Error accepting problem:', err)
    return { success: false, error: err.message || 'Failed to accept challenge' }
  }
}

/**
 * Industry partner requests collaboration on an assigned problem
 */
export async function requestCollaboration({
  assignmentId,
  requestingOrgId,
  receivingOrgId,
  requestingOrgName,
  problemTitle,
  message,
}) {
  try {
    // 1. Insert into collaboration_requests
    const { data: request, error: reqError } = await supabase
      .from('collaboration_requests')
      .insert({
        assignment_id: assignmentId,
        requesting_org_id: requestingOrgId,
        receiving_org_id: receivingOrgId,
        message: message?.trim() || 'Interested in partnering for deployment and scaling.',
        status: 'pending',
      })
      .select()
      .single()

    if (reqError) {
      if (reqError.code === '23505') {
        return { success: false, error: 'A collaboration request has already been submitted for this project.' }
      }
      throw reqError
    }

    // 2. Fetch receiving institution's profile to notify them
    const { data: receivingOrg } = await supabase
      .from('organizations')
      .select('profile_id, name')
      .eq('id', receivingOrgId)
      .single()

    const notifications = []

    if (receivingOrg?.profile_id) {
      notifications.push({
        profile_id: receivingOrg.profile_id,
        type: 'collaboration_requested',
        title: `Collaboration Request: ${requestingOrgName}`,
        body: `${requestingOrgName} has requested to collaborate on your project "${problemTitle}".`,
        data: {
          assignment_id: assignmentId,
          request_id: request.id,
          requesting_org_id: requestingOrgId,
        },
      })
    }

    // 3. Notify Government
    const { data: govProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'government')

    if (govProfiles) {
      govProfiles.forEach((gov) => {
        notifications.push({
          profile_id: gov.id,
          type: 'collaboration_requested',
          title: `Collaboration Proposed`,
          body: `${requestingOrgName} proposed collaboration with ${receivingOrg?.name || 'Institution'} on "${problemTitle}".`,
          data: { assignment_id: assignmentId, request_id: request.id },
        })
      })
    }

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications)
    }

    return { success: true, request }
  } catch (err) {
    console.error('Error requesting collaboration:', err)
    return { success: false, error: err.message || 'Failed to request collaboration' }
  }
}

/**
 * Institution responds to a collaboration request (accept or decline)
 */
export async function respondToCollaboration({
  requestId,
  status, // 'accepted' | 'declined'
  assignmentId,
  industryOrgId,
  industryOrgName,
  institutionOrgName,
  problemTitle,
}) {
  try {
    const now = new Date().toISOString()

    // 1. Update collaboration_requests
    const { data: updatedReq, error: updateError } = await supabase
      .from('collaboration_requests')
      .update({
        status,
        responded_at: now,
      })
      .eq('id', requestId)
      .select('*, requesting_org:organizations!requesting_org_id(id, profile_id, name)')
      .single()

    if (updateError) throw updateError

    const industryProfileId = updatedReq?.requesting_org?.profile_id

    // 2. If accepted, add to project_members table
    if (status === 'accepted' && industryProfileId && assignmentId) {
      await supabase
        .from('project_members')
        .upsert({
          assignment_id: assignmentId,
          profile_id: industryProfileId,
          role: 'industry_partner',
        }, { onConflict: 'assignment_id,profile_id' })

      // Update problem status to in_progress if currently assigned
      await supabase
        .from('problems')
        .update({ status: 'in_progress' })
        .eq('id', updatedReq.assignment_id || assignmentId)
    }

    // 3. Notify Industry partner
    const notifications = []

    if (industryProfileId) {
      notifications.push({
        profile_id: industryProfileId,
        type: status === 'accepted' ? 'collaboration_accepted' : 'collaboration_declined',
        title: status === 'accepted' ? 'Collaboration Accepted! 🎉' : 'Collaboration Request Update',
        body: status === 'accepted'
          ? `${institutionOrgName || 'The institution'} accepted your collaboration proposal on "${problemTitle}". You are now an active project partner!`
          : `${institutionOrgName || 'The institution'} declined the collaboration proposal at this time.`,
        data: { request_id: requestId, assignment_id: assignmentId, status },
      })
    }

    // 4. Notify Government
    const { data: govProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'government')

    if (govProfiles) {
      govProfiles.forEach((gov) => {
        notifications.push({
          profile_id: gov.id,
          type: status === 'accepted' ? 'collaboration_accepted' : 'collaboration_declined',
          title: status === 'accepted' ? 'Partnership Established' : 'Collaboration Declined',
          body: status === 'accepted'
            ? `${industryOrgName || 'Industry'} partnered with ${institutionOrgName || 'Institution'} on challenge "${problemTitle}".`
            : `${institutionOrgName} declined partnership with ${industryOrgName}.`,
          data: { request_id: requestId, assignment_id: assignmentId },
        })
      })
    }

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications)
    }

    return { success: true, request: updatedReq }
  } catch (err) {
    console.error('Error responding to collaboration:', err)
    return { success: false, error: err.message || 'Failed to update collaboration' }
  }
}

/**
 * Fetch persistent notifications for a profile
 */
export async function fetchNotifications(profileId) {
  if (!profileId) return []
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching notifications:', error)
    return []
  }
  return data || []
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId) {
  if (!notificationId) return
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
}
