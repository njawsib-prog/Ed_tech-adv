'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { apiClient } from '@/lib/apiClient';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'student' | 'super_admin';
  course_id?: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, role: 'admin' | 'student') => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  console.log('[AuthProvider] Initializing AuthProvider');

  const refreshUser = useCallback(async () => {
    console.log('[AuthProvider] refreshUser called');
    try {
      const response = await apiClient.get('/auth/me');
      console.log('[AuthProvider] User authenticated', { user: response.data.user });
      setUser(response.data.user);
    } catch (error) {
      console.log('[AuthProvider] No authenticated user found', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('[AuthProvider] Mounting - checking authentication status');
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string, role: 'admin' | 'student') => {
    console.log('[useAuth] Login attempt started', { email: email?.substring(0, 3) + '***', role });
    try {
      const endpoint = role === 'admin' ? '/auth/admin/login' : '/auth/student/login';
      console.log('[useAuth] Calling API endpoint:', endpoint);
      const response = await apiClient.post(endpoint, { email, password });
      console.log('[useAuth] Login successful', { user: response.data.user });
      setUser(response.data.user);
    } catch (error) {
      console.error('[useAuth] Login failed', error);
      throw error;
    }
  };

  const logout = async () => {
    console.log('[useAuth] logout called');
    await apiClient.post('/auth/logout');
    setUser(null);
    console.log('[useAuth] logout completed');
  };

  console.log('[AuthProvider] Rendering with state:', { user, isLoading });

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;