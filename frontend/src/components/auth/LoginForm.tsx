'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { useInstitute } from '@/hooks/useInstitute';

interface LoginFormProps {
  role: 'admin' | 'student';
  onSuccess?: () => void;
}

export default function LoginForm({ role, onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const config = useInstitute();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('[LoginForm] handleSubmit called');
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('[LoginForm] Calling login with', { email: email?.substring(0, 3) + '***', role });
      await login(email, password, role);
      console.log('[LoginForm] Login succeeded, redirecting...');
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(role === 'admin' ? '/admin' : '/dashboard');
      }
    } catch (err: any) {
      console.error('[LoginForm] Login error:', err);

      let errorMessage = 'Login failed. Please try again.';

      // Handle different types of errors
      if (axios.isAxiosError(err)) {
        if (err.response) {
          // Server responded with error status
          console.error('[LoginForm] Server error:', {
            status: err.response.status,
            data: err.response.data
          });
          errorMessage = err.response.data?.error || err.response.data?.message || `Server error (${err.response.status})`;
        } else if (err.request) {
          // Request was made but no response received
          console.error('[LoginForm] No response received:', err.message);
          errorMessage = 'No response from server. Please check your connection and try again.';
        } else {
          // Error in setting up the request
          console.error('[LoginForm] Request setup error:', err.message);
          errorMessage = `Request error: ${err.message}`;
        }

        // Specific error codes
        if (err.code === 'ECONNREFUSED') {
          errorMessage = 'Connection refused. Is the backend server running?';
        } else if (err.code === 'ENOTFOUND') {
          errorMessage = 'Server not found. Please check API URL configuration.';
        } else if (err.code === 'ETIMEDOUT') {
          errorMessage = 'Connection timed out. Please try again.';
        }
      } else {
        // Non-Axios error
        console.error('[LoginForm] Non-Axios error:', err);
        errorMessage = err.message || 'An unexpected error occurred.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Logo and Title */}
      <div className="text-center mb-8">
        <img
          src={config.logoUrl}
          alt={config.name}
          className="h-12 w-auto mx-auto mb-4"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
          {config.name}
        </h1>
        <p className="text-gray-600 mt-1">{config.tagline}</p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-base shadow-lg">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          {role === 'admin' ? 'Admin Login' : 'Student Login'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-base text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-8 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="mt-6">
          <Button type="submit" loading={loading} className="w-full">
            Sign In
          </Button>
        </div>

        <div className="mt-4 text-center">
          <a
            href="/forgot-password"
            className="text-sm hover:underline"
            style={{ color: 'var(--color-primary)' }}
          >
            Forgot your password?
          </a>
        </div>
      </form>
    </div>
  );
}