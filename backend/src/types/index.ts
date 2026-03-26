export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'student';
  avatar_url?: string;
}

export interface AdminUser extends User {
  role: 'admin' | 'super_admin';
}

export interface StudentUser extends User {
  role: 'student';
  course_id?: string;
}

export interface JWTPayload {
  id: string;
  email: string;
  role: 'admin' | 'student';
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Express.Request {
  user?: JWTPayload;
}