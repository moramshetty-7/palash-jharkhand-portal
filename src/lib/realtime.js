/**
 * realtime.js
 * Supabase Realtime helpers for persistent subscriptions across all 4 stakeholders.
 * Subscribes to Postgres CDC events over WebSockets without manual polling or timeouts.
 */

import { supabase } from './supabase'

/**
 * Subscribe to realtime notifications for a specific user profile
 * @param {string} profileId - UUID of the authenticated profile
 * @param {function} onInsert - Callback when a new notification is inserted
 * @returns {function} Cleanup unsubscribe function
 */
export function subscribeToNotifications(profileId, onInsert) {
  if (!profileId) return () => {}

  const channelName = `realtime-notifications-${profileId}-${Date.now()}`
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `profile_id=eq.${profileId}`,
      },
      (payload) => {
        if (onInsert) onInsert(payload.new)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Subscribe to realtime changes in the problems table (all changes or filtered by problem_id)
 * @param {function} onChange - Callback receiving (payload)
 * @param {string} [specificProblemId] - Optional problem UUID to filter
 * @returns {function} Cleanup unsubscribe function
 */
export function subscribeToProblems(onChange, specificProblemId = null) {
  const channelName = `realtime-problems-${specificProblemId || 'all'}-${Date.now()}`
  const filter = specificProblemId ? `id=eq.${specificProblemId}` : undefined

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'problems',
        filter,
      },
      (payload) => {
        if (onChange) onChange(payload)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Subscribe to realtime changes in assignments table
 * @param {function} onChange - Callback receiving (payload)
 * @param {string} [orgId] - Optional organization UUID to filter
 * @returns {function} Cleanup unsubscribe function
 */
export function subscribeToAssignments(onChange, orgId = null) {
  const channelName = `realtime-assignments-${orgId || 'all'}-${Date.now()}`
  const filter = orgId ? `organization_id=eq.${orgId}` : undefined

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'assignments',
        filter,
      },
      (payload) => {
        if (onChange) onChange(payload)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Subscribe to realtime changes in collaboration_requests table
 * @param {function} onChange - Callback receiving (payload)
 * @param {string} [orgId] - Optional organization UUID to watch incoming or outgoing
 * @returns {function} Cleanup unsubscribe function
 */
export function subscribeToCollaborationRequests(onChange, orgId = null) {
  const channelName = `realtime-collab-${orgId || 'all'}-${Date.now()}`

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'collaboration_requests',
      },
      (payload) => {
        if (!orgId) {
          if (onChange) onChange(payload)
          return
        }
        // Match either receiving or requesting
        const row = payload.new || payload.old
        if (row && (row.receiving_org_id === orgId || row.requesting_org_id === orgId)) {
          if (onChange) onChange(payload)
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
