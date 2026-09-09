-- ============================================================
-- JHARKHAND SOCIETAL INNOVATION COLLABORATION PORTAL
-- Migration: Enable Realtime Publications & Flexible Notification Types
-- Run this in your Supabase Project SQL Editor
-- ============================================================

-- 1. Enable Supabase Realtime for all core workflow tables
DO $$
BEGIN
  -- problems table
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'problems'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE problems;
  END IF;

  -- assignments table
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'assignments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE assignments;
  END IF;

  -- collaboration_requests table
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'collaboration_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE collaboration_requests;
  END IF;

  -- notifications table
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;

  -- organization_problem_matches table
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'organization_problem_matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE organization_problem_matches;
  END IF;

  -- project_members table
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'project_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE project_members;
  END IF;
END;
$$;

-- 2. Ensure Realtime receives full row data on UPDATE and DELETE
ALTER TABLE problems REPLICA IDENTITY FULL;
ALTER TABLE assignments REPLICA IDENTITY FULL;
ALTER TABLE collaboration_requests REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER TABLE organization_problem_matches REPLICA IDENTITY FULL;
ALTER TABLE project_members REPLICA IDENTITY FULL;

-- 3. Broaden notifications check constraint to accept both legacy and new workflow event types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
  type IN (
    'problem_submitted',
    'problem_assigned',
    'collaboration_requested',
    'collaboration_accepted',
    'collaboration_declined',
    'milestone_updated',
    'new_match',
    'new_problem_match',
    'collaboration_request',
    'problem_status_update'
  )
);
