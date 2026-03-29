/**
 * Shared frontend types that mirror the backend database schema.
 *
 * Field names here must exactly match the column names returned by the
 * Supabase/PostgreSQL queries in the backend controllers so that TypeScript
 * catches any mismatch at compile time rather than at runtime.
 *
 * Key mapping rule:
 *   DB column          → type field
 *   time_limit_mins    → time_limit_mins   (NOT "duration_minutes")
 */

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

export interface Test {
  id: string;
  title: string;
  description: string;
  type: 'graded' | 'practice';
  course_id: string;
  courses?: { name: string };
  /** Time allowed for the test in minutes – maps to DB column `time_limit_mins` */
  time_limit_mins: number;
  is_active: boolean;
  scheduled_at?: string;
  question_count: number;
  submission_count: number;
  created_at: string;
}

export interface TestDetails {
  id: string;
  title: string;
  description: string;
  time_limit_mins: number;
  question_count: number;
  course_name: string;
  has_submitted: boolean;
  assignment_status: string;
  is_active: boolean;
}

// ---------------------------------------------------------------------------
// Questions & Answers
// ---------------------------------------------------------------------------

/** DB schema for a question row (questions table). Field names match DB exactly. */
export interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  /** One of 'a' | 'b' | 'c' | 'd' */
  correct_option: string;
  order_index: number;
}

/** One entry in the `results.answers` JSONB array, written by test.controller submitTest. */
export interface ResultAnswer {
  question_id: string;
  /** The option letter the student chose: 'a' | 'b' | 'c' | 'd', or null if unanswered */
  selected_option: string | null;
  /** Correct option letter stored at submission time */
  correct_option: string;
  is_correct: boolean;
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export interface TestSummaryInResult {
  id: string;
  title: string;
  total_marks: number;
  passing_marks: number;
  /** Time allowed for the test in minutes – maps to DB column `time_limit_mins` */
  time_limit_mins: number;
  questions: Question[];
}

export interface Result {
  id: string;
  score: number;
  total_marks: number;
  percentage: number;
  status: 'passed' | 'failed' | 'pending';
  time_taken_seconds: number;
  submitted_at: string;
  started_at: string;
  /** JSONB array of per-question answers stored at submission time */
  answers: ResultAnswer[];
  tests: TestSummaryInResult;
}

export interface AdminResult extends Result {
  students: {
    id: string;
    name: string;
    email: string;
    roll_number: string;
  };
}
