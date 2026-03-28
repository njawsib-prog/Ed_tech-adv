import { Request } from 'express';

export type UserRole = 'student' | 'admin' | 'super_admin' | 'branch_admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
  branch_id?: string;
}

export interface AdminUser extends User {
  role: 'admin' | 'super_admin' | 'branch_admin';
}

export interface StudentUser extends User {
  role: 'student';
  course_id?: string;
  current_streak?: number;
  max_streak?: number;
  last_activity_date?: string;
}

export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
  instituteId?: string;
  branch_id?: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
  cookies: {
    token?: string;
    [key: string]: any;
  };
}

// Additional Interfaces for New Features

export interface Branch {
  id: string;
  name: string;
  location?: string;
  contact_number?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Payment {
  id: string;
  student_id: string;
  branch_id?: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method?: string;
  transaction_id?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Attendance {
  id: string;
  student_id: string;
  branch_id?: string;
  course_id?: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  recorded_by?: string;
  created_at?: string;
}

export interface LeaderboardEntry {
  student_id: string;
  student_name: string;
  branch_id?: string;
  branch_name?: string;
  total_score: number;
  rank?: number;
}
