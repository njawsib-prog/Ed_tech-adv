-- ============================================================
-- EdTech Platform - Production Schema Migrations
-- Run these SQL statements in your Supabase SQL Editor
-- ============================================================

-- ----------------------------------------------------------------
-- MODULE 1: STUDENT STATUS FIELD
-- ----------------------------------------------------------------
-- Add status column to students table
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED'));

-- Back-fill: map existing is_active to status
UPDATE students SET status = 'INACTIVE' WHERE is_active = FALSE AND status = 'ACTIVE';

-- Index for fast status checks on every authenticated request
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_email_status ON students(email, status);

-- ----------------------------------------------------------------
-- MODULE 2: COURSE TABLE EXTENDED FIELDS
-- ----------------------------------------------------------------
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS title               VARCHAR(255),
  ADD COLUMN IF NOT EXISTS price               NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_value      INTEGER,
  ADD COLUMN IF NOT EXISTS duration_unit       VARCHAR(20) CHECK (duration_unit IN ('days','weeks','months','years')),
  ADD COLUMN IF NOT EXISTS start_date          DATE,
  ADD COLUMN IF NOT EXISTS end_date            DATE,
  ADD COLUMN IF NOT EXISTS last_enrollment_date DATE,
  ADD COLUMN IF NOT EXISTS thumbnail           TEXT,
  ADD COLUMN IF NOT EXISTS instructor          VARCHAR(255),
  ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT,
  ADD COLUMN IF NOT EXISTS status              VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','draft'));

-- Back-fill title from name where missing
UPDATE courses SET title = name WHERE title IS NULL;

CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);

-- ----------------------------------------------------------------
-- MODULE 3: ATTENDANCE TABLE (ensure correct schema)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id    UUID REFERENCES courses(id) ON DELETE SET NULL,
  branch_id    UUID REFERENCES branches(id) ON DELETE SET NULL,
  date         DATE NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'absent'
    CHECK (status IN ('present','absent','late','excused')),
  notes        TEXT,
  recorded_by  UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, course_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_student    ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_course     ON attendance(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date       ON attendance(date);

-- ----------------------------------------------------------------
-- MODULE 6: RECEIPTS TABLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS receipts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number   VARCHAR(128) UNIQUE NOT NULL,
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  course_id        UUID REFERENCES courses(id) ON DELETE SET NULL,
  payment_id       UUID REFERENCES payments(id) ON DELETE SET NULL,
  amount           NUMERIC(10,2) NOT NULL,
  payment_method   VARCHAR(100),
  issued_by        UUID REFERENCES admins(id) ON DELETE SET NULL,
  institute_id     UUID,
  signature_hash   TEXT NOT NULL,
  issued_at        TIMESTAMPTZ DEFAULT NOW(),
  notes            TEXT
);

CREATE INDEX IF NOT EXISTS idx_receipts_student  ON receipts(student_id);
CREATE INDEX IF NOT EXISTS idx_receipts_number   ON receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_receipts_issued_at ON receipts(issued_at);

-- ----------------------------------------------------------------
-- MODULE 4: TEST QUESTIONS (ensure correct schema)
-- ----------------------------------------------------------------
-- questions table should support file-uploaded questions
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS explanation TEXT,
  ADD COLUMN IF NOT EXISTS source_file VARCHAR(255);
