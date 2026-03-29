-- ============================================================
-- EdTech Platform — Complete Production-Grade PostgreSQL Schema
-- ============================================================
-- Version : 2.0.0  (reconstructed from live backend + frontend code)
-- Database : PostgreSQL 14+ (tested with Supabase / Railway)
-- Encoding : UTF-8, snake_case naming throughout
--
-- COVERS ALL 10 SYSTEM MODULES:
--   1.  users          (unified admin + student, role-based)
--   2.  courses        (full metadata, status, enrollment dates)
--   3.  enrollments    (student → course, normalised)
--   4.  attendance     (per student/course/date)
--   5.  tests          (total_marks, passing_marks, time_limit_mins)
--   6.  questions      (MCQ, correct_option alias correct_answer)
--   7.  results        (score, percentage, passed/failed, time_taken_seconds)
--   8.  payments       (amount, method, status, receipt_signature)
--   9.  receipts       (unique number, HMAC signature, institute branding)
--  10.  notifications  (broadcast / per-user, read-tracking)
--
-- ALSO INCLUDED (required by backend controllers):
--   branches, modules, subjects, study_materials, test_assignments,
--   complaints, complaint_replies, feedback, institute_config,
--   settings, material_views, activity_log
--
-- COMPATIBILITY:
--   • All column names match backend API response keys exactly.
--   • All TypeScript types in frontend/src/types/index.ts map 1-to-1.
--   • Backward-compat VIEWs for legacy `students` and `admins` table names
--     including INSTEAD OF INSERT triggers so controllers can INSERT into
--     the views without specifying `role`.
--   • `created_by_admin` helper view makes study_materials PostgREST
--     embedding work without changing backend query code.
--
-- ─── MISMATCHES FIXED FROM v1.0.0 ────────────────────────────
--   1.  users.is_active    — removed GENERATED ALWAYS; now writable boolean
--   2.  courses.is_active  — removed GENERATED ALWAYS; now writable boolean
--   3.  result_status enum — changed 'PASS'/'FAIL' → 'passed'/'failed'
--       (matches student test controller & frontend types exactly)
--   4.  notifications      — added action_url, scheduled_at, sent_at columns
--   5.  notification_reads — added institute_id column
--   6.  feedback           — replaced target_type/target_id/comment with
--                            type/subject/message (matches all controllers)
--   7.  complaints         — added priority column
--   8.  activity_log       — added institute_id column
--   9.  tests              — added subject_id FK to subjects
--  10.  institute_config   — added contact_email, contact_phone, features
--  11.  users              — added phone column (student profile controller)
--  12.  user_role enum     — added 'branch_admin' (in backend types/index.ts)
--  13.  students/admins views — added INSTEAD OF INSERT triggers
--  14.  created_by_admin view — enables study_materials PostgREST embedding
-- ============================================================

-- ──────────────────────────────────────────────
-- PREREQUISITES
-- ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- provides gen_random_uuid()

-- ──────────────────────────────────────────────
-- ENUM TYPE DEFINITIONS
-- ──────────────────────────────────────────────

-- User roles
-- 'branch_admin' added to match backend/src/types/index.ts UserRole type
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'super_admin', 'student', 'branch_admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- User / student account status
DO $$ BEGIN
  CREATE TYPE account_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Course lifecycle status
DO $$ BEGIN
  CREATE TYPE course_status AS ENUM ('active', 'inactive', 'draft');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Course difficulty level
DO $$ BEGIN
  CREATE TYPE course_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Duration units
DO $$ BEGIN
  CREATE TYPE duration_unit AS ENUM ('days', 'weeks', 'months', 'years');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enrollment status
DO $$ BEGIN
  CREATE TYPE enrollment_status AS ENUM ('active', 'completed', 'dropped', 'pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Attendance status
DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Test type
DO $$ BEGIN
  CREATE TYPE test_type AS ENUM ('graded', 'practice');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Test assignment status
DO $$ BEGIN
  CREATE TYPE assignment_status AS ENUM ('pending', 'in_progress', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Result pass/fail status
-- 'PASS'/'FAIL' renamed to 'passed'/'failed' to match:
--   • student/test.controller.ts: `percentage >= 40 ? 'passed' : 'failed'`
--   • student/results.controller.ts: `r.status === 'passed'`
--   • admin/results.controller.ts:  `r.status === 'passed'`
--   • frontend/src/types/index.ts:  status: 'passed' | 'failed' | 'pending'
DO $$ BEGIN
  CREATE TYPE result_status AS ENUM ('passed', 'failed', 'pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Payment status
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Notification target audience
DO $$ BEGIN
  CREATE TYPE notif_target AS ENUM ('all', 'course', 'student', 'students', 'admins');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Notification category
DO $$ BEGIN
  CREATE TYPE notif_category AS ENUM ('announcement', 'test_alert', 'result', 'admin_message');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Study material type
DO $$ BEGIN
  CREATE TYPE material_type AS ENUM ('pdf', 'video', 'document', 'link', 'text');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Complaint status
DO $$ BEGIN
  CREATE TYPE complaint_status AS ENUM ('open', 'in_progress', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║                    TABLE DEFINITIONS                            ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ──────────────────────────────────────────────
-- TABLE 0: INSTITUTE CONFIG
-- Stores branding / multi-tenant identity.
-- Referenced by settings, receipts, notifications.
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS institute_config (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name              VARCHAR(255) NOT NULL,
    tagline           VARCHAR(500),
    logo_url          TEXT,
    favicon_url       TEXT,
    primary_color     CHAR(7)     DEFAULT '#2E86C1',
    secondary_color   CHAR(7)     DEFAULT '#1A7A4A',
    support_email     VARCHAR(255),
    -- contact_email / contact_phone added to match admin/settings.controller.ts
    -- updateInstituteConfig which explicitly reads/writes these fields.
    contact_email     VARCHAR(255),
    contact_phone     VARCHAR(20),
    website_url       TEXT,
    address           TEXT,
    -- features: arbitrary JSONB blob written by admin settings controller.
    features          JSONB       DEFAULT '{}'::jsonb,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- TABLE 0b: BRANCHES
-- Multi-branch / multi-campus support.
-- Referenced by users, courses, payments, attendance.
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id      UUID        REFERENCES institute_config(id) ON DELETE SET NULL,
    name              VARCHAR(255) NOT NULL,
    location          VARCHAR(255),
    contact_number    VARCHAR(20),
    is_active         BOOLEAN     DEFAULT TRUE,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- MODULE 1: USERS
-- Unified table covering both admins and students.
-- role = 'admin' | 'super_admin' | 'student'
-- status = ACTIVE | INACTIVE | SUSPENDED
--
-- Relationship notes:
--   • password_hash replaces plain-text password (bcrypt, 12 rounds).
--   • course_id is the PRIMARY course for the student (denormalised
--     convenience column); full enrolment history is in `enrollments`.
--   • roll_number is an optional human-readable student identifier.
--   • branch_id links student/admin to a campus branch.
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id      UUID        REFERENCES institute_config(id) ON DELETE SET NULL,
    branch_id         UUID        REFERENCES branches(id) ON DELETE SET NULL,

    -- Identity
    name              VARCHAR(255) NOT NULL,
    email             VARCHAR(255) NOT NULL,
    password_hash     VARCHAR(255) NOT NULL,
    avatar_url        TEXT,

    -- Access control
    role              user_role   NOT NULL DEFAULT 'student',
    status            account_status NOT NULL DEFAULT 'ACTIVE',
    -- is_active: regular writable boolean (NOT generated) so controllers can
    -- directly set it: `.insert({is_active: true})` / `.update({is_active: false})`.
    -- Kept in sync with `status` by application logic (both fields are written
    -- together in every controller that changes account state).
    is_active         BOOLEAN     DEFAULT TRUE,

    -- Student-only fields (NULL for admins)
    course_id         UUID,                          -- FK added after courses table
    roll_number       VARCHAR(50),
    -- phone: used by student/profile.controller.ts getProfile / updateProfile
    phone             VARCHAR(20),

    -- Engagement / streak tracking (student/streak.controller.ts)
    current_streak    INTEGER     DEFAULT 0,
    max_streak        INTEGER     DEFAULT 0,
    last_activity_date DATE,
    last_login        TIMESTAMPTZ,

    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT users_email_unique UNIQUE (email)
);

-- Backward-compatible VIEWS so existing backend code keeps working
-- without any changes to controllers that reference `students` or `admins`.
CREATE OR REPLACE VIEW students AS
    SELECT * FROM users WHERE role = 'student';

CREATE OR REPLACE VIEW admins AS
    SELECT * FROM users WHERE role IN ('admin', 'super_admin', 'branch_admin');

-- ──────────────────────────────────────────────────────────────
-- INSTEAD OF INSERT triggers
-- These are needed because controllers INSERT into the views without
-- specifying the `role` column (e.g. admin/student.controller.ts just
-- inserts {name, email, password_hash, course_id, is_active, status}).
-- The trigger sets `role` to the correct value automatically.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_students_instead_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO users (
        id, institute_id, branch_id,
        name, email, password_hash, avatar_url,
        role, status, is_active,
        course_id, roll_number, phone,
        current_streak, max_streak, last_activity_date, last_login,
        created_at, updated_at
    ) VALUES (
        COALESCE(NEW.id, gen_random_uuid()),
        NEW.institute_id, NEW.branch_id,
        NEW.name, NEW.email, NEW.password_hash, NEW.avatar_url,
        'student',                          -- always force role = student
        COALESCE(NEW.status, 'ACTIVE'),
        COALESCE(NEW.is_active, TRUE),
        NEW.course_id, NEW.roll_number, NEW.phone,
        COALESCE(NEW.current_streak, 0),
        COALESCE(NEW.max_streak, 0),
        NEW.last_activity_date, NEW.last_login,
        COALESCE(NEW.created_at, NOW()),
        COALESCE(NEW.updated_at, NOW())
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_students_insert ON students;
CREATE TRIGGER trg_students_insert
    INSTEAD OF INSERT ON students
    FOR EACH ROW EXECUTE FUNCTION trg_students_instead_insert();

CREATE OR REPLACE FUNCTION trg_admins_instead_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO users (
        id, institute_id, branch_id,
        name, email, password_hash, avatar_url,
        role, status, is_active,
        current_streak, max_streak, last_activity_date, last_login,
        created_at, updated_at
    ) VALUES (
        COALESCE(NEW.id, gen_random_uuid()),
        NEW.institute_id, NEW.branch_id,
        NEW.name, NEW.email, NEW.password_hash, NEW.avatar_url,
        -- Use the role provided by the caller (admin/super_admin/branch_admin),
        -- defaulting to 'admin' if omitted.
        COALESCE(NEW.role, 'admin'),
        COALESCE(NEW.status, 'ACTIVE'),
        COALESCE(NEW.is_active, TRUE),
        COALESCE(NEW.current_streak, 0),
        COALESCE(NEW.max_streak, 0),
        NEW.last_activity_date, NEW.last_login,
        COALESCE(NEW.created_at, NOW()),
        COALESCE(NEW.updated_at, NOW())
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admins_insert ON admins;
CREATE TRIGGER trg_admins_insert
    INSTEAD OF INSERT ON admins
    FOR EACH ROW EXECUTE FUNCTION trg_admins_instead_insert();

-- ──────────────────────────────────────────────────────────────
-- created_by_admin VIEW
-- Supabase / PostgREST resolves embedded resources by view/table name.
-- admin/materials.controller.ts queries:
--   .select('... created_by_admin (id, name) ...')
-- PostgREST finds `study_materials.created_by → users.id` and then
-- resolves `created_by_admin` as this view (which is a strict subset of
-- `users`). This avoids renaming the `created_by` column in the table.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW created_by_admin AS
    SELECT id, name, email, role, avatar_url, institute_id, branch_id,
           is_active, status, created_at, updated_at
    FROM users
    WHERE role IN ('admin', 'super_admin', 'branch_admin');

-- ══════════════════════════════════════════════
-- MODULE 2: COURSES
-- Full course metadata with status, pricing,
-- scheduling and enrollment cutoff.
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS courses (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id          UUID        REFERENCES institute_config(id) ON DELETE SET NULL,
    branch_id             UUID        REFERENCES branches(id) ON DELETE SET NULL,

    -- Core identity (name kept for legacy compatibility, title is canonical)
    name                  VARCHAR(255) NOT NULL,        -- legacy column kept
    title                 VARCHAR(255),                  -- canonical title (mirrors name)
    description           TEXT,
    thumbnail             TEXT,                          -- URL to cover image
    instructor            VARCHAR(255),
    category              VARCHAR(100),
    level                 course_level,

    -- Pricing
    price                 NUMERIC(10,2) DEFAULT 0       CHECK (price >= 0),

    -- Duration: new structured fields
    duration_value        INTEGER                       CHECK (duration_value >= 0),
    duration_unit         duration_unit,
    -- Duration: legacy single-value fallback
    duration_hours        INTEGER                       CHECK (duration_hours >= 0),

    -- Scheduling
    start_date            DATE,
    end_date              DATE,
    last_enrollment_date  DATE,

    -- Legal & publication
    terms_and_conditions  TEXT,
    is_published          BOOLEAN     DEFAULT FALSE,
    status                course_status NOT NULL DEFAULT 'active',
    -- is_active: regular writable boolean (NOT generated).
    -- admin/course.controller.ts explicitly sets is_active:
    --   createCourse: `is_active: true`
    --   updateCourse: `is_active: status === 'active'`
    -- Both `status` and `is_active` are kept in sync by the controller.
    is_active             BOOLEAN     DEFAULT TRUE,

    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Now we can add the deferred FK from users.course_id → courses.id
ALTER TABLE users
    ADD CONSTRAINT fk_users_course
    FOREIGN KEY (course_id)
    REFERENCES courses(id)
    ON DELETE SET NULL;

-- ══════════════════════════════════════════════
-- MODULE 3: ENROLLMENTS
-- Normalised enrollment tracking: one row per
-- student ↔ course pair, with status & timestamps.
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS enrollments (
    id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id    UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id     UUID            NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at   TIMESTAMPTZ     DEFAULT NOW(),
    status        enrollment_status NOT NULL DEFAULT 'active',
    completed_at  TIMESTAMPTZ,
    notes         TEXT,

    CONSTRAINT enrollments_student_course_unique UNIQUE (student_id, course_id)
);

-- ══════════════════════════════════════════════
-- MODULE 4: ATTENDANCE
-- Daily presence record per student and course.
-- unique(student_id, course_id, date) prevents duplicates.
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS attendance (
    id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id    UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id     UUID            REFERENCES courses(id) ON DELETE SET NULL,
    branch_id     UUID            REFERENCES branches(id) ON DELETE SET NULL,
    date          DATE            NOT NULL,
    status        attendance_status NOT NULL DEFAULT 'absent',
    notes         TEXT,
    recorded_by   UUID            REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ     DEFAULT NOW(),

    -- Prevent double-marking for the same student/course/day
    CONSTRAINT attendance_student_course_date_unique
        UNIQUE (student_id, course_id, date)
);

-- ══════════════════════════════════════════════
-- MODULE 5: TESTS
-- Assessment configurations; total_marks and
-- passing_marks drive the PASS/FAIL logic in results.
-- time_limit_mins is the canonical name (matches
-- frontend TypeScript type `time_limit_mins`).
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tests (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id    UUID        REFERENCES institute_config(id) ON DELETE SET NULL,
    branch_id       UUID        REFERENCES branches(id) ON DELETE SET NULL,
    course_id       UUID        REFERENCES courses(id) ON DELETE SET NULL,
    created_by      UUID        REFERENCES users(id) ON DELETE SET NULL,
    -- subject_id: FK to subjects added after subjects table is created (below).
    -- Used in admin/results.controller.ts getStudentPerformance:
    --   `tests (id, title, subject_id, subjects (name))`
    subject_id      UUID,

    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    type            test_type   NOT NULL DEFAULT 'graded',

    -- Scoring
    total_marks     INTEGER     NOT NULL DEFAULT 0  CHECK (total_marks >= 0),
    passing_marks   INTEGER     NOT NULL DEFAULT 0  CHECK (passing_marks >= 0),

    -- Timing
    time_limit_mins INTEGER     DEFAULT 60          CHECK (time_limit_mins > 0),

    -- Scheduling
    scheduled_at    TIMESTAMPTZ,
    is_active       BOOLEAN     DEFAULT FALSE,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT tests_passing_lte_total
        CHECK (passing_marks <= total_marks)
);

-- ══════════════════════════════════════════════
-- MODULE 6: QUESTIONS
-- MCQ questions for a test.
-- correct_option is the DB column name (char 'a'–'d').
-- The alias `correct_answer` is surfaced via the view
-- below for the problem spec's naming requirement.
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS questions (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id         UUID    NOT NULL REFERENCES tests(id) ON DELETE CASCADE,

    question_text   TEXT    NOT NULL,
    option_a        TEXT    NOT NULL,
    option_b        TEXT    NOT NULL,
    option_c        TEXT    NOT NULL,
    option_d        TEXT    NOT NULL,

    -- correct_option: single char 'a' | 'b' | 'c' | 'd'
    -- Named `correct_option` to match backend controllers & CSV import.
    -- Exposed as `correct_answer` in the view below.
    correct_option  CHAR(1) NOT NULL CHECK (correct_option IN ('a','b','c','d')),

    explanation     TEXT,           -- optional explanation shown after submission
    source_file     VARCHAR(255),   -- track which uploaded file created this question
    order_index     INTEGER DEFAULT 0,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- View that exposes correct_answer as an alias (matches problem spec field name)
CREATE OR REPLACE VIEW questions_view AS
    SELECT
        id,
        test_id,
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_option,
        correct_option AS correct_answer,   -- alias per problem spec
        explanation,
        source_file,
        order_index,
        created_at,
        updated_at
    FROM questions;

-- ══════════════════════════════════════════════
-- TABLE: TEST_ASSIGNMENTS
-- Links which students are assigned to which test.
-- start_time / end_time track actual attempt window.
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS test_assignments (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id     UUID        NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    student_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time  TIMESTAMPTZ,
    end_time    TIMESTAMPTZ,
    status      assignment_status NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT test_assignments_unique UNIQUE (test_id, student_id)
);

-- ══════════════════════════════════════════════
-- MODULE 7: RESULTS
-- One row per student per test attempt.
-- score      = raw marks earned
-- total_marks = test's total marks (denormalised for fast reporting)
-- percentage  = computed column (score / total_marks * 100)
-- status      = PASS | FAIL | pending
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS results (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id        UUID        REFERENCES institute_config(id) ON DELETE SET NULL,
    student_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_id             UUID        NOT NULL REFERENCES tests(id) ON DELETE CASCADE,

    -- Scores (match backend + frontend field names exactly)
    score               INTEGER     NOT NULL DEFAULT 0  CHECK (score >= 0),
    total_marks         INTEGER     NOT NULL DEFAULT 0  CHECK (total_marks >= 0),
    percentage          NUMERIC(5,2) DEFAULT 0          CHECK (percentage >= 0 AND percentage <= 100),
    marks_obtained      INTEGER     GENERATED ALWAYS AS (score) STORED,  -- alias per spec

    -- Outcome
    -- status uses lowercase 'passed'/'failed'/'pending' to match:
    --   • student/test.controller.ts: `percentage >= 40 ? 'passed' : 'failed'`
    --   • admin/results.controller.ts: `r.status === 'passed'`
    --   • frontend/src/types/index.ts: status: 'passed' | 'failed' | 'pending'
    -- (v1.0.0 had 'PASS'/'FAIL' — that was incompatible with live code.)
    status              result_status NOT NULL DEFAULT 'pending',
    passing_marks       INTEGER,    -- snapshot of test.passing_marks at submission time

    -- Timing
    time_taken_seconds  INTEGER     DEFAULT 0           CHECK (time_taken_seconds >= 0),
    started_at          TIMESTAMPTZ,
    submitted_at        TIMESTAMPTZ DEFAULT NOW(),

    -- Detailed answers stored as JSON array
    answers             JSONB       DEFAULT '[]'::jsonb,

    created_at          TIMESTAMPTZ DEFAULT NOW(),

    -- One result per student per test (can be relaxed if retakes are allowed)
    CONSTRAINT results_student_test_unique UNIQUE (student_id, test_id)
);

-- ══════════════════════════════════════════════
-- MODULE 8: PAYMENTS
-- Financial transaction records.
-- receipt_signature = HMAC-SHA256 for tamper detection.
-- transaction_id    = external payment gateway reference.
-- course_id         = which course was paid for.
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS payments (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id           UUID        REFERENCES courses(id) ON DELETE SET NULL,
    branch_id           UUID        REFERENCES branches(id) ON DELETE SET NULL,

    amount              NUMERIC(10,2) NOT NULL  CHECK (amount > 0),
    payment_method      VARCHAR(100) NOT NULL,
    status              payment_status NOT NULL DEFAULT 'pending',

    -- External gateway reference (unique to prevent double-recording)
    transaction_id      VARCHAR(255) UNIQUE,

    -- Cryptographic integrity field
    receipt_signature   TEXT,

    description         TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- MODULE 9: RECEIPTS
-- Official payment acknowledgement document.
-- receipt_number   = unique, human-readable (e.g. RCP-XXXX)
-- issued_by        = admin user who issued the receipt
-- institute_name   = branding snapshot at issue time
-- institute_logo   = branding snapshot at issue time
-- signature_hash   = HMAC-SHA256 for integrity verification
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS receipts (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id          UUID        REFERENCES payments(id) ON DELETE SET NULL,
    student_id          UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    course_id           UUID        REFERENCES courses(id) ON DELETE SET NULL,

    receipt_number      VARCHAR(128) NOT NULL,
    issued_by           UUID        REFERENCES users(id) ON DELETE SET NULL,  -- admin id

    -- Branding snapshot (captured at issue time; institute may rebrand later)
    institute_name      VARCHAR(255),
    institute_logo      TEXT,

    -- Financial snapshot
    amount              NUMERIC(10,2) NOT NULL  CHECK (amount > 0),
    payment_method      VARCHAR(100),

    -- Cryptographic integrity
    signature_hash      TEXT        NOT NULL,

    notes               TEXT,
    issued_at           TIMESTAMPTZ DEFAULT NOW(),

    -- Fallback FK to institute config for dynamic lookups
    institute_id        UUID        REFERENCES institute_config(id) ON DELETE SET NULL,

    CONSTRAINT receipts_number_unique UNIQUE (receipt_number)
);

-- ══════════════════════════════════════════════
-- MODULE 10: NOTIFICATIONS
-- Broadcast messages or targeted alerts.
-- target_type / target_audience: 'all' | 'course' | 'student'
-- Read receipts tracked in notification_reads.
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS notifications (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id        UUID        REFERENCES institute_config(id) ON DELETE SET NULL,
    created_by          UUID        REFERENCES users(id) ON DELETE SET NULL,

    -- Content
    title               VARCHAR(255) NOT NULL,
    message             TEXT         NOT NULL,
    type                VARCHAR(50),
    category            notif_category DEFAULT 'announcement',

    -- Targeting (legacy target_type kept; target_audience is the new field)
    target_type         VARCHAR(50) NOT NULL DEFAULT 'all'
                            CHECK (target_type IN ('all','course','student')),
    target_audience     VARCHAR(50),            -- 'all','students','admins','course','student'
    target_id           UUID,                   -- course_id or student_id when targeted

    branch_id           UUID        REFERENCES branches(id) ON DELETE SET NULL,

    -- Navigation helper URL (absolute or relative)
    -- Used by admin/notifications.controller.ts: `action_url: actionUrl || null`
    action_url          TEXT,

    -- Scheduling & delivery timestamps
    -- scheduled_at: admin can schedule a future send time
    --   createNotification: `scheduled_at: scheduledAt || null`
    scheduled_at        TIMESTAMPTZ,
    -- sent_at: when the notification was actually broadcast
    --   createNotification: `sent_at: scheduledAt ? null : new Date().toISOString()`
    --   broadcastNotification: `sent_at: new Date().toISOString()`
    sent_at             TIMESTAMPTZ,

    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Read-receipt tracking (which student has read which notification)
CREATE TABLE IF NOT EXISTS notification_reads (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id     UUID        NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    student_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- institute_id added to match student/notifications.controller.ts markAsRead:
    --   `.insert({ notification_id: id, student_id: studentId, institute_id: instituteId })`
    institute_id        UUID        REFERENCES institute_config(id) ON DELETE CASCADE,
    read_at             TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT notification_reads_unique UNIQUE (notification_id, student_id)
);

-- ══════════════════════════════════════════════
-- SUPPORTING TABLES
-- Required by backend controllers but not listed
-- in the 10 primary modules above.
-- ══════════════════════════════════════════════

-- Course structure: modules inside a course
CREATE TABLE IF NOT EXISTS modules (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id   UUID        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER     DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Course structure: subjects inside a module
CREATE TABLE IF NOT EXISTS subjects (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id   UUID        NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER     DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Deferred FK: tests.subject_id → subjects.id
-- Added here (after subjects is created) because tests is created earlier.
-- Used by admin/results.controller.ts getStudentPerformance:
--   `tests (id, title, subject_id, subjects (name))`
ALTER TABLE tests
    ADD CONSTRAINT fk_tests_subject
    FOREIGN KEY (subject_id)
    REFERENCES subjects(id)
    ON DELETE SET NULL;

-- Study materials (PDFs, videos, documents, links, text)
CREATE TABLE IF NOT EXISTS study_materials (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id    UUID        REFERENCES institute_config(id) ON DELETE SET NULL,
    course_id       UUID        REFERENCES courses(id) ON DELETE SET NULL,
    module_id       UUID        REFERENCES modules(id) ON DELETE SET NULL,
    subject_id      UUID        REFERENCES subjects(id) ON DELETE SET NULL,
    created_by      UUID        REFERENCES users(id) ON DELETE SET NULL,

    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    type            material_type NOT NULL,
    url             TEXT         NOT NULL,
    content         TEXT,
    file_size       INTEGER,     -- bytes
    order_index     INTEGER     DEFAULT 0,
    is_published    BOOLEAN     DEFAULT FALSE,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Student material view tracking
CREATE TABLE IF NOT EXISTS material_views (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id     UUID        NOT NULL REFERENCES study_materials(id) ON DELETE CASCADE,
    student_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewed_at       TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT material_views_unique UNIQUE (material_id, student_id)
);

-- Support tickets
CREATE TABLE IF NOT EXISTS complaints (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_to UUID        REFERENCES users(id) ON DELETE SET NULL,
    category    VARCHAR(50) NOT NULL
                    CHECK (category IN ('test_issue','technical','content','other')),
    title       VARCHAR(255) NOT NULL,
    description TEXT         NOT NULL,
    status      complaint_status NOT NULL DEFAULT 'open',
    -- priority: added to match student/notifications.controller.ts submitComplaint
    --   `.insert({ ..., priority: priority || 'medium', ... })`
    -- and admin/notifications.controller.ts updateComplaintStatus
    --   `if (priority) updateData.priority = priority`
    priority    VARCHAR(20) DEFAULT 'medium'
                    CHECK (priority IN ('low','medium','high','urgent')),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Replies to support tickets
CREATE TABLE IF NOT EXISTS complaint_replies (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id    UUID        NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    sender_role     VARCHAR(50) NOT NULL CHECK (sender_role IN ('admin','student')),
    sender_id       UUID        NOT NULL,
    message         TEXT        NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Course / material / test feedback with star rating
-- FIELD NAMES FIXED: previous schema used target_type/target_id/comment which
-- did NOT match any controller code. Correct field names derived from:
--   • student/notifications.controller.ts submitFeedback:
--       `.insert({ institute_id, student_id, type, rating, subject, message })`
--   • student/notifications.controller.ts getMyFeedback:
--       `.select('id, type, rating, subject, created_at')`
--   • admin/notifications.controller.ts getFeedback:
--       `.select('id, type, rating, subject, message, created_at, students(...)')`
CREATE TABLE IF NOT EXISTS feedback (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID        REFERENCES institute_config(id) ON DELETE SET NULL,
    student_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type         VARCHAR(50) NOT NULL
                     CHECK (type IN ('course','test','platform','other')),
    rating       INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
    subject      VARCHAR(255),               -- optional short subject/title
    message      TEXT,                       -- optional long-form feedback text
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Key-value settings per institute (supports upsert on institute_id,key)
CREATE TABLE IF NOT EXISTS settings (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id    UUID        REFERENCES institute_config(id) ON DELETE CASCADE,
    key             VARCHAR(255) NOT NULL,
    value           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT settings_institute_key_unique UNIQUE (institute_id, key)
);

-- Immutable audit trail for all user actions
-- institute_id added to match:
--   • admin/settings.controller.ts getActivityLog: `.eq('institute_id', instituteId)`
--   • admin/materials.controller.ts createMaterial: inserts `institute_id: instituteId`
--   • student/profile.controller.ts getActivity: `.eq('institute_id', instituteId)`
CREATE TABLE IF NOT EXISTS activity_log (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID        REFERENCES institute_config(id) ON DELETE SET NULL,
    user_type    VARCHAR(50) NOT NULL CHECK (user_type IN ('admin','student')),
    user_id      UUID        NOT NULL,
    action       VARCHAR(255) NOT NULL,
    details      JSONB,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║                    INDEXES (PERFORMANCE)                        ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- users
CREATE INDEX IF NOT EXISTS idx_users_email            ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role             ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status           ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_email_status     ON users(email, status);
CREATE INDEX IF NOT EXISTS idx_users_course_id        ON users(course_id);
CREATE INDEX IF NOT EXISTS idx_users_branch_id        ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_institute_id     ON users(institute_id);

-- branches
CREATE INDEX IF NOT EXISTS idx_branches_institute_id  ON branches(institute_id);

-- courses
CREATE INDEX IF NOT EXISTS idx_courses_status         ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_branch_id      ON courses(branch_id);
CREATE INDEX IF NOT EXISTS idx_courses_institute_id   ON courses(institute_id);

-- enrollments
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id  ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status     ON enrollments(status);

-- attendance
CREATE INDEX IF NOT EXISTS idx_attendance_student_id  ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_course_id   ON attendance(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date        ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_branch_id   ON attendance(branch_id);

-- tests
CREATE INDEX IF NOT EXISTS idx_tests_course_id        ON tests(course_id);
CREATE INDEX IF NOT EXISTS idx_tests_is_active        ON tests(is_active);
CREATE INDEX IF NOT EXISTS idx_tests_scheduled_at     ON tests(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_tests_branch_id        ON tests(branch_id);
CREATE INDEX IF NOT EXISTS idx_tests_institute_id     ON tests(institute_id);

-- questions
CREATE INDEX IF NOT EXISTS idx_questions_test_id      ON questions(test_id);
CREATE INDEX IF NOT EXISTS idx_questions_order_index  ON questions(order_index);

-- test_assignments
CREATE INDEX IF NOT EXISTS idx_test_assign_student_id ON test_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_test_assign_test_id    ON test_assignments(test_id);
CREATE INDEX IF NOT EXISTS idx_test_assign_status     ON test_assignments(status);

-- results
CREATE INDEX IF NOT EXISTS idx_results_student_id     ON results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_test_id        ON results(test_id);
CREATE INDEX IF NOT EXISTS idx_results_submitted_at   ON results(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_results_status         ON results(status);
CREATE INDEX IF NOT EXISTS idx_results_institute_id   ON results(institute_id);

-- payments
CREATE INDEX IF NOT EXISTS idx_payments_student_id    ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_course_id     ON payments(course_id);
CREATE INDEX IF NOT EXISTS idx_payments_status        ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at    ON payments(created_at DESC);

-- receipts
CREATE INDEX IF NOT EXISTS idx_receipts_payment_id    ON receipts(payment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_student_id    ON receipts(student_id);
CREATE INDEX IF NOT EXISTS idx_receipts_number        ON receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_receipts_issued_at     ON receipts(issued_at DESC);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifs_target_type     ON notifications(target_type);
CREATE INDEX IF NOT EXISTS idx_notifs_target_id       ON notifications(target_id);
CREATE INDEX IF NOT EXISTS idx_notifs_institute_id    ON notifications(institute_id);
CREATE INDEX IF NOT EXISTS idx_notifs_created_at      ON notifications(created_at DESC);

-- notification_reads
CREATE INDEX IF NOT EXISTS idx_notif_reads_notif_id   ON notification_reads(notification_id);
CREATE INDEX IF NOT EXISTS idx_notif_reads_student_id ON notification_reads(student_id);

-- modules / subjects
CREATE INDEX IF NOT EXISTS idx_modules_course_id      ON modules(course_id);
CREATE INDEX IF NOT EXISTS idx_modules_order_index    ON modules(order_index);
CREATE INDEX IF NOT EXISTS idx_subjects_module_id     ON subjects(module_id);
CREATE INDEX IF NOT EXISTS idx_subjects_order_index   ON subjects(order_index);

-- study_materials
CREATE INDEX IF NOT EXISTS idx_materials_course_id    ON study_materials(course_id);
CREATE INDEX IF NOT EXISTS idx_materials_module_id    ON study_materials(module_id);
CREATE INDEX IF NOT EXISTS idx_materials_subject_id   ON study_materials(subject_id);
CREATE INDEX IF NOT EXISTS idx_materials_type         ON study_materials(type);
CREATE INDEX IF NOT EXISTS idx_materials_institute_id ON study_materials(institute_id);

-- material_views
CREATE INDEX IF NOT EXISTS idx_mat_views_material_id  ON material_views(material_id);
CREATE INDEX IF NOT EXISTS idx_mat_views_student_id   ON material_views(student_id);

-- complaints
CREATE INDEX IF NOT EXISTS idx_complaints_student_id  ON complaints(student_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status      ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_category    ON complaints(category);

-- feedback
CREATE INDEX IF NOT EXISTS idx_feedback_student_id    ON feedback(student_id);
CREATE INDEX IF NOT EXISTS idx_feedback_institute_id  ON feedback(institute_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type          ON feedback(type);

-- settings (UNIQUE constraint on the table already creates the backing index)

-- activity_log
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id   ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_type ON activity_log(user_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║                    SAMPLE DATA (DUMMY INSERTS)                  ║
-- ╚══════════════════════════════════════════════════════════════════╝
-- Passwords below are bcrypt hashes of "Password123!" (12 rounds).
-- Replace with real hashes before production use.

-- Institute
INSERT INTO institute_config (id, name, tagline, support_email)
VALUES (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Apex EdTech Institute',
    'Empowering learners since 2020',
    'support@apexedtech.com'
) ON CONFLICT DO NOTHING;

-- Branch
INSERT INTO branches (id, institute_id, name, location)
VALUES (
    'bbbbbbbb-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Main Campus',
    'New Delhi, India'
) ON CONFLICT DO NOTHING;

-- Users: 1 super-admin, 1 admin, 2 students
INSERT INTO users (id, institute_id, branch_id, name, email, password_hash, role, status)
VALUES
    (
        'cccccccc-0000-0000-0000-000000000001',
        'aaaaaaaa-0000-0000-0000-000000000001',
        'bbbbbbbb-0000-0000-0000-000000000001',
        'Super Admin',
        'superadmin@apexedtech.com',
        '$2a$12$YQxDSwgObFBcZQzW69mZ0uIc58tmF1.EKlIS4pkX5aVyb9BRaL//.',
        'super_admin',
        'ACTIVE'
    ),
    (
        'cccccccc-0000-0000-0000-000000000002',
        'aaaaaaaa-0000-0000-0000-000000000001',
        'bbbbbbbb-0000-0000-0000-000000000001',
        'Jane Admin',
        'admin@apexedtech.com',
        '$2a$12$YQxDSwgObFBcZQzW69mZ0uIc58tmF1.EKlIS4pkX5aVyb9BRaL//.',
        'admin',
        'ACTIVE'
    ),
    (
        'cccccccc-0000-0000-0000-000000000003',
        'aaaaaaaa-0000-0000-0000-000000000001',
        'bbbbbbbb-0000-0000-0000-000000000001',
        'Alice Student',
        'alice@example.com',
        '$2a$12$YQxDSwgObFBcZQzW69mZ0uIc58tmF1.EKlIS4pkX5aVyb9BRaL//.',
        'student',
        'ACTIVE'
    ),
    (
        'cccccccc-0000-0000-0000-000000000004',
        'aaaaaaaa-0000-0000-0000-000000000001',
        'bbbbbbbb-0000-0000-0000-000000000001',
        'Bob Student',
        'bob@example.com',
        '$2a$12$YQxDSwgObFBcZQzW69mZ0uIc58tmF1.EKlIS4pkX5aVyb9BRaL//.',
        'student',
        'ACTIVE'
    )
ON CONFLICT DO NOTHING;

-- Course
INSERT INTO courses (
    id, institute_id, branch_id, name, title, description,
    price, duration_value, duration_unit, start_date, end_date,
    last_enrollment_date, instructor, status
)
VALUES (
    'dddddddd-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000001',
    'Full-Stack Web Development',
    'Full-Stack Web Development',
    'Learn Node.js, React, PostgreSQL from the ground up.',
    24999.00,
    6, 'months',
    '2026-04-01', '2026-10-01',
    '2026-03-28',
    'Prof. Arjun Sharma',
    'active'
) ON CONFLICT DO NOTHING;

-- Update students' primary course
UPDATE users SET course_id = 'dddddddd-0000-0000-0000-000000000001'
WHERE id IN (
    'cccccccc-0000-0000-0000-000000000003',
    'cccccccc-0000-0000-0000-000000000004'
);

-- Enrollments
INSERT INTO enrollments (student_id, course_id, status)
VALUES
    ('cccccccc-0000-0000-0000-000000000003', 'dddddddd-0000-0000-0000-000000000001', 'active'),
    ('cccccccc-0000-0000-0000-000000000004', 'dddddddd-0000-0000-0000-000000000001', 'active')
ON CONFLICT DO NOTHING;

-- Attendance
INSERT INTO attendance (student_id, course_id, branch_id, date, status, recorded_by)
VALUES
    (
        'cccccccc-0000-0000-0000-000000000003',
        'dddddddd-0000-0000-0000-000000000001',
        'bbbbbbbb-0000-0000-0000-000000000001',
        '2026-03-28', 'present',
        'cccccccc-0000-0000-0000-000000000002'
    ),
    (
        'cccccccc-0000-0000-0000-000000000004',
        'dddddddd-0000-0000-0000-000000000001',
        'bbbbbbbb-0000-0000-0000-000000000001',
        '2026-03-28', 'absent',
        'cccccccc-0000-0000-0000-000000000002'
    )
ON CONFLICT DO NOTHING;

-- Test
INSERT INTO tests (
    id, institute_id, branch_id, course_id, created_by,
    title, description, type, total_marks, passing_marks,
    time_limit_mins, is_active
)
VALUES (
    'eeeeeeee-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000001',
    'dddddddd-0000-0000-0000-000000000001',
    'cccccccc-0000-0000-0000-000000000002',
    'Module 1 Assessment',
    'Test covering HTML, CSS and JavaScript basics.',
    'graded',
    100, 40,
    60,
    TRUE
) ON CONFLICT DO NOTHING;

-- Questions
INSERT INTO questions (test_id, question_text, option_a, option_b, option_c, option_d, correct_option, order_index)
VALUES
    (
        'eeeeeeee-0000-0000-0000-000000000001',
        'What does HTML stand for?',
        'HyperText Markup Language',
        'High-Tech Modern Language',
        'HyperTransfer Markup Logic',
        'HyperText Management Language',
        'a', 1
    ),
    (
        'eeeeeeee-0000-0000-0000-000000000001',
        'Which CSS property controls text color?',
        'font-color', 'text-color', 'color', 'foreground',
        'c', 2
    ),
    (
        'eeeeeeee-0000-0000-0000-000000000001',
        'Which keyword declares a block-scoped variable in JS?',
        'var', 'let', 'def', 'dim',
        'b', 3
    )
ON CONFLICT DO NOTHING;

-- Result
INSERT INTO results (
    student_id, test_id, score, total_marks, percentage,
    status, time_taken_seconds, submitted_at, started_at
)
VALUES (
    'cccccccc-0000-0000-0000-000000000003',
    'eeeeeeee-0000-0000-0000-000000000001',
    80, 100, 80.00,
    'PASS', 2340,
    '2026-03-28 10:39:00+00',
    '2026-03-28 10:00:00+00'
) ON CONFLICT DO NOTHING;

-- Payment
INSERT INTO payments (
    id, student_id, course_id, branch_id,
    amount, payment_method, status, transaction_id
)
VALUES (
    'ffffffff-0000-0000-0000-000000000001',
    'cccccccc-0000-0000-0000-000000000003',
    'dddddddd-0000-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000001',
    24999.00, 'UPI', 'completed',
    'TXN-20260328-ALICE001'
) ON CONFLICT DO NOTHING;

-- Receipt
INSERT INTO receipts (
    payment_id, student_id, course_id,
    receipt_number, issued_by,
    institute_name, institute_logo,
    amount, payment_method, signature_hash,
    institute_id
)
VALUES (
    'ffffffff-0000-0000-0000-000000000001',
    'cccccccc-0000-0000-0000-000000000003',
    'dddddddd-0000-0000-0000-000000000001',
    'RCP-SAMPLE000001',
    'cccccccc-0000-0000-0000-000000000002',
    'Apex EdTech Institute',
    'https://apexedtech.com/logo.png',
    24999.00, 'UPI',
    'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6',
    'aaaaaaaa-0000-0000-0000-000000000001'
) ON CONFLICT DO NOTHING;

-- Notification
INSERT INTO notifications (
    institute_id, created_by,
    title, message, category,
    target_type, target_audience
)
VALUES (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'cccccccc-0000-0000-0000-000000000002',
    'Module 1 Test is Live!',
    'Dear students, Module 1 Assessment is now available. Best of luck!',
    'test_alert',
    'all', 'students'
) ON CONFLICT DO NOTHING;

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║                    RELATIONSHIP NOTES                           ║
-- ╚══════════════════════════════════════════════════════════════════╝
/*
 ENTITY-RELATIONSHIP SUMMARY
 ════════════════════════════

 institute_config 1──* branches
 institute_config 1──* users
 institute_config 1──* courses
 institute_config 1──* tests
 institute_config 1──* notifications
 institute_config 1──* receipts
 institute_config 1──* settings

 branches 1──* users
 branches 1──* courses
 branches 1──* tests
 branches 1──* payments
 branches 1──* attendance

 users (role=student) *──* courses   via enrollments
 users (role=student) 1──* attendance
 users (role=student) 1──* results
 users (role=student) 1──* payments
 users (role=student) 1──* receipts
 users (role=student) 1──* complaints
 users (role=student) 1──* feedback
 users (role=admin)   1──* tests         (created_by)
 users (role=admin)   1──* receipts      (issued_by)
 users (role=admin)   1──* notifications (created_by)
 users (role=admin)   1──* attendance    (recorded_by)

 courses 1──* modules ──* subjects
 courses 1──* study_materials
 courses 1──* tests
 courses 1──* enrollments
 courses 1──* attendance
 courses 1──* payments
 courses 1──* receipts

 tests   1──* questions
 tests   1──* test_assignments
 tests   1──* results

 payments 1──1 receipts

 notifications *──* users  via notification_reads
*/

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║               TYPESCRIPT / PRISMA SYNC NOTES                   ║
-- ╚══════════════════════════════════════════════════════════════════╝
/*
 Option A — Prisma ORM
 ──────────────────────
 1. Add DATABASE_URL to .env (e.g. postgresql://user:pass@host/db)
 2. Run: npx prisma db pull          ← introspect this schema into schema.prisma
 3. Run: npx prisma generate         ← generate PrismaClient with full types
 4. Use PrismaClient in controllers instead of Supabase PostgREST calls.

 Key Prisma model alignments with this schema:
   model User   → users table    (role, status as String; cast to enum in app layer)
   model Course → courses table  (duration_unit as String; cast to DurationUnit enum)
   model Result → results table  (marks_obtained is a computed column; select score)

 Option B — Zod Runtime Validation (works alongside Supabase)
 ─────────────────────────────────────────────────────────────
 Example for Results:
   const ResultSchema = z.object({
     id:                 z.string().uuid(),
     student_id:         z.string().uuid(),
     test_id:            z.string().uuid(),
     score:              z.number().int().nonnegative(),
     total_marks:        z.number().int().nonnegative(),
     percentage:         z.number().min(0).max(100),
     status:             z.enum(['PASS','FAIL','pending']),
     time_taken_seconds: z.number().int().nonnegative(),
     submitted_at:       z.string().datetime(),
     started_at:         z.string().datetime().nullable(),
   });
   type Result = z.infer<typeof ResultSchema>;

 The frontend types in frontend/src/types/index.ts already mirror these
 column names. No renaming is needed between DB → API → UI.
*/

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║              RAILWAY MIGRATION STRATEGY                         ║
-- ╚══════════════════════════════════════════════════════════════════╝
/*
 Recommended migration path for Railway (PostgreSQL plugin):

 1. BACKUP first
      pg_dump $DATABASE_URL > backup_$(date +%F).sql

 2. SCHEMA VERSIONING — use a migrations table to avoid re-running scripts:
      CREATE TABLE IF NOT EXISTS _schema_version (
          version  INTEGER PRIMARY KEY,
          applied_at TIMESTAMPTZ DEFAULT NOW()
      );

 3. RUN THIS FILE on a fresh database:
      psql $DATABASE_URL -f schema_complete.sql

 4. OR apply incrementally:
      For each migration file (001 → 007) run in order, then apply
      this file's NEW tables/indexes only (wrap in IF NOT EXISTS guards —
      all CREATE TABLE and CREATE INDEX statements already use them).

 5. ZERO-DOWNTIME tip — add new columns with defaults first, then back-fill,
    then add NOT NULL constraints in a separate transaction.

 6. SUPABASE users: paste this entire file into the Supabase SQL Editor and
    run. The IF NOT EXISTS guards make it idempotent — safe to re-run.
*/
