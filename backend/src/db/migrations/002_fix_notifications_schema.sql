-- Migration 002: Fix schema to match backend/frontend expectations
-- Adds missing columns to notifications, notification_reads, complaints, and feedback tables
--
-- Note: institute_id columns below intentionally have no REFERENCES constraint because the
-- current schema has no multi-tenant institutes table (institute_config is a single-row
-- config table). When a proper institutes table is added, FK constraints should be applied.

-- Fix notifications table: add columns expected by admin and student controllers/frontend
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS institute_id UUID,
  ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  ADD COLUMN IF NOT EXISTS target_audience VARCHAR(50) DEFAULT 'all' CHECK (target_audience IN ('all', 'students', 'admins')),
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS action_url TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;

-- Index for faster institute-scoped lookups
CREATE INDEX IF NOT EXISTS idx_notifications_institute_id ON notifications(institute_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at);

-- Fix notification_reads table: add institute_id used by student controller
ALTER TABLE notification_reads
  ADD COLUMN IF NOT EXISTS institute_id UUID;

-- Fix complaints table: add priority column used by student and admin controllers
ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));

-- Fix feedback table: add columns used by student and admin controllers
ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS institute_id UUID,
  ADD COLUMN IF NOT EXISTS type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS subject VARCHAR(255),
  ADD COLUMN IF NOT EXISTS message TEXT;
