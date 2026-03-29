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

export interface Question {
  id: string;
  questionText: string;
  type: 'mcq' | 'trueFalse' | 'shortAnswer';
  options?: string[];
  correctAnswer: string;
  marks: number;
}

export interface Answer {
  questionIndex: number;
  selected?: string;
  text?: string;
  marked?: boolean;
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
  answers: Answer[];
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
