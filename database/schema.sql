-- ============================================================
-- JHARKHAND SOCIETAL INNOVATION COLLABORATION PORTAL
-- Database Schema — Phase 1
-- Run this in Supabase SQL Editor after connecting your project
-- ============================================================

-- Enable UUID extension (already available in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES
-- One row per authenticated user (citizen, organization, government)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('citizen', 'organization', 'government')),
  name          TEXT,
  email         TEXT,
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ============================================================
-- ORGANIZATIONS
-- Universities, research institutes, industry partners, etc.
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN (
                  'University', 'Research Institution', 'Industry',
                  'Startup', 'MSME', 'CSR Organization'
                )),
  description   TEXT,
  website       TEXT,
  address       TEXT,
  state         TEXT DEFAULT 'Jharkhand',
  domains       TEXT[] DEFAULT '{}',       -- e.g. ['Education', 'Healthcare']
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizations_profile_id ON organizations(profile_id);
CREATE INDEX IF NOT EXISTS idx_organizations_type       ON organizations(type);
CREATE INDEX IF NOT EXISTS idx_organizations_domains    ON organizations USING GIN(domains);

-- ============================================================
-- PROBLEMS
-- Citizen-submitted societal challenges
-- ============================================================
CREATE TABLE IF NOT EXISTS problems (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  problem_id        TEXT UNIQUE,           -- e.g. JH-AGR-2026-000001
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  district          TEXT,
  location_text     TEXT,
  poster_name       TEXT,
  poster_contact    TEXT,
  domain            TEXT,                  -- classified domain
  domain_confidence NUMERIC(5,2),          -- AI confidence 0-100
  status            TEXT NOT NULL DEFAULT 'submitted'
                      CHECK (status IN (
                        'submitted', 'under_review', 'assigned',
                        'in_progress', 'completed', 'rejected'
                      )),
  rejection_reason  TEXT,
  similarity_group  UUID,                  -- links near-duplicate problems
  submitted_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_to       UUID REFERENCES organizations(id) ON DELETE SET NULL,
  assigned_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_problems_problem_id   ON problems(problem_id);
CREATE INDEX IF NOT EXISTS idx_problems_status       ON problems(status);
CREATE INDEX IF NOT EXISTS idx_problems_domain       ON problems(domain);
CREATE INDEX IF NOT EXISTS idx_problems_district     ON problems(district);
CREATE INDEX IF NOT EXISTS idx_problems_submitted_by ON problems(submitted_by);
CREATE INDEX IF NOT EXISTS idx_problems_assigned_to  ON problems(assigned_to);
CREATE INDEX IF NOT EXISTS idx_problems_created_at   ON problems(created_at DESC);

-- ============================================================
-- PROBLEM MEDIA
-- Images, videos, documents attached to a problem
-- ============================================================
CREATE TABLE IF NOT EXISTS problem_media (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  problem_id   UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  file_name    TEXT NOT NULL,
  file_type    TEXT NOT NULL CHECK (file_type IN ('image', 'video', 'document')),
  storage_path TEXT NOT NULL,              -- Supabase Storage path
  size_bytes   BIGINT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_problem_media_problem_id ON problem_media(problem_id);

-- ============================================================
-- DOMAIN KEYWORDS
-- Keywords used for AI classification of problems into domains
-- ============================================================
CREATE TABLE IF NOT EXISTS domain_keywords (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain     TEXT NOT NULL,
  keyword    TEXT NOT NULL,
  weight     NUMERIC(4,2) NOT NULL DEFAULT 1.0,  -- higher = stronger signal
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (domain, keyword)
);

CREATE INDEX IF NOT EXISTS idx_domain_keywords_domain  ON domain_keywords(domain);
CREATE INDEX IF NOT EXISTS idx_domain_keywords_keyword ON domain_keywords(keyword);

-- ============================================================
-- ORGANIZATION PROBLEM MATCHES
-- Records which organizations were notified about a problem
-- ============================================================
CREATE TABLE IF NOT EXISTS organization_problem_matches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  problem_id      UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  match_score     NUMERIC(5,2),            -- relevance score
  notified_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  response        TEXT CHECK (response IN ('pending', 'interested', 'declined')),
  responded_at    TIMESTAMPTZ,
  UNIQUE (problem_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_opm_problem_id      ON organization_problem_matches(problem_id);
CREATE INDEX IF NOT EXISTS idx_opm_organization_id ON organization_problem_matches(organization_id);

-- ============================================================
-- ASSIGNMENTS
-- Formal assignment of a problem to an organization
-- ============================================================
CREATE TABLE IF NOT EXISTS assignments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  problem_id      UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assigned_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'completed', 'cancelled')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (problem_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_problem_id      ON assignments(problem_id);
CREATE INDEX IF NOT EXISTS idx_assignments_organization_id ON assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status          ON assignments(status);

-- ============================================================
-- PROJECT MEMBERS
-- Additional people involved in working on an assignment
-- ============================================================
CREATE TABLE IF NOT EXISTS project_members (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  profile_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'member',   -- e.g. lead, researcher, advisor
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_assignment_id ON project_members(assignment_id);
CREATE INDEX IF NOT EXISTS idx_project_members_profile_id    ON project_members(profile_id);

-- ============================================================
-- MILESTONES
-- Progress checkpoints for an assignment
-- ============================================================
CREATE TABLE IF NOT EXISTS milestones (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id   UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  milestone_type  TEXT CHECK (milestone_type IN (
                    'Problem Research', 'Requirement Analysis',
                    'Prototype', 'Testing', 'Deployment'
                  )),
  status          TEXT NOT NULL DEFAULT 'not_started'
                    CHECK (status IN ('not_started', 'in_progress', 'completed')),
  due_date        DATE,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_milestones_assignment_id ON milestones(assignment_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status        ON milestones(status);

-- ============================================================
-- COLLABORATION REQUESTS
-- Requests from one organization to collaborate on an assignment
-- ============================================================
CREATE TABLE IF NOT EXISTS collaboration_requests (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id       UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  requesting_org_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  receiving_org_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  message             TEXT,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'accepted', 'declined')),
  responded_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, requesting_org_id)
);

CREATE INDEX IF NOT EXISTS idx_collab_assignment_id     ON collaboration_requests(assignment_id);
CREATE INDEX IF NOT EXISTS idx_collab_requesting_org_id ON collaboration_requests(requesting_org_id);
CREATE INDEX IF NOT EXISTS idx_collab_receiving_org_id  ON collaboration_requests(receiving_org_id);
CREATE INDEX IF NOT EXISTS idx_collab_status            ON collaboration_requests(status);

-- ============================================================
-- NOTIFICATIONS
-- In-app notifications for organizations and government users
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN (
                'problem_submitted', 'problem_assigned',
                'collaboration_requested', 'collaboration_accepted',
                'milestone_updated', 'new_match'
              )),
  title       TEXT NOT NULL,
  body        TEXT,
  data        JSONB DEFAULT '{}',          -- extra payload (problem_id, org_id, etc.)
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_profile_id ON notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read    ON notifications(profile_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'profiles', 'organizations', 'problems',
    'domain_keywords', 'assignments', 'milestones',
    'collaboration_requests'
  ] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_updated_at ON %I;
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
    ', tbl, tbl);
  END LOOP;
END;
$$;
