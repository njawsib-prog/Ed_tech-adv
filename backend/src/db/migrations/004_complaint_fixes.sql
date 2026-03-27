-- Migration 004: Fix complaints and complaint_replies tables
-- to match application code expectations.

-- 1. Add missing priority column to complaints
ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high'));

-- 2. Expand the category CHECK constraint to include all frontend-used values.
--    The original constraint only allowed 'test_issue', 'technical', 'content', 'other'
--    but the frontend submits 'academic' and 'administrative' as well.
ALTER TABLE complaints
  DROP CONSTRAINT IF EXISTS complaints_category_check;
ALTER TABLE complaints
  ADD CONSTRAINT complaints_category_check
  CHECK (category IN ('academic', 'technical', 'administrative', 'other', 'test_issue', 'content'));

-- 3. Expand the status CHECK constraint to include 'closed'
--    (the admin UI and frontend display 'closed' as a valid status).
ALTER TABLE complaints
  DROP CONSTRAINT IF EXISTS complaints_status_check;
ALTER TABLE complaints
  ADD CONSTRAINT complaints_status_check
  CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'));
