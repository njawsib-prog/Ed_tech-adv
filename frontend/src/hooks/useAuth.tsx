'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { apiClient } from '@/lib/apiClient';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'student' | 'super_admin' | 'branch_admin';
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

  console.log('[AuthProvider] STEP A: Initializing AuthProvider');

  const refreshUser = useCallback(async () => {
    console.log('[AuthProvider] STEP B: refreshUser called');
    try {
      const response = await apiClient.get('/auth/me');
      console.log('[AuthProvider] STEP C: User authenticated', { user: response.data.data?.user });
      setUser(response.data.data?.user ?? null);
    } catch (error) {
      console.log('[AuthProvider] STEP D: No authenticated user found', error);
      setUser(null);
    } finally {
      console.log('[AuthProvider] STEP E: refreshUser complete, setting isLoading=false');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('[AuthProvider] STEP F: Mounting effect - checking authentication status');
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string, role: 'admin' | 'student') => {
    console.log('[useAuth] STEP 1: Login function entered', { 
      email: email?.substring(0, 3) + '***', 
      role,
      hasApiClient: typeof apiClient !== 'undefined'
    });
    try {
      const endpoint = role === 'admin' ? '/auth/admin/login' : '/auth/student/login';
      console.log('[useAuth] STEP 2: Endpoint determined:', endpoint);
      console.log('[useAuth] STEP 3: About to call apiClient.post', { 
        fullUrl: `${apiClient.defaults.baseURL}${endpoint}`,
        baseURL: apiClient.defaults.baseURL
      });
      
      // CRITICAL: Add immediate logging after the call
      const response = await apiClient.post(endpoint, { email, password });
      console.log('[useAuth] STEP 4: apiClient.post() returned', { 
        status: response.status,
        hasData: !!response.data,
        user: response.data?.data?.user 
      });
      console.log('[useAuth] STEP 5: Login successful, setting user state');
      setUser(response.data.data?.user ?? null);
      console.log('[useAuth] STEP 6: Login function complete');
    } catch (error: any) {
      console.error('[useAuth] STEP 7: Login failed with error:', error);
      console.error('[useAuth] STEP 7b: Error type:', typeof error);
      console.error('[useAuth] STEP 7c: Is axios error:', error?.constructor?.name);
      console.error('[useAuth] STEP 7d: Error message:', error?.message);
      console.error('[useAuth] STEP 7e: Error response:', error?.response?.data);
      throw error;
    }
  };

  const logout = async () => {
    console.log('[useAuth] STEP X: logout called');
    await apiClient.post('/auth/logout');
    setUser(null);
    console.log('[useAuth] STEP Y: logout completed');
  };

  console.log('[AuthProvider] STEP Z: Rendering with state:', { user: !!user, isLoading });

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