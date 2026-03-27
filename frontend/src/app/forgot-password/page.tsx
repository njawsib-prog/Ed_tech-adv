'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/apiClient';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useInstitute } from '@/hooks/useInstitute';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const config = useInstitute();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiClient.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (error) {
      // Still show success for security reasons
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
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
          <h1 className="text-heading text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
            {config.name}
          </h1>
        </div>

        <div className="bg-white p-8 rounded-base shadow-lg">
          {submitted ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Check Your Email</h2>
              <p className="text-gray-600 text-sm">
                If this email exists, a reset link has been sent.
              </p>
              <Link
                href="/"
                className="inline-block mt-6 text-sm hover:underline"
                style={{ color: 'var(--color-primary)' }}
              >
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Reset Password</h2>
              <p className="text-gray-600 text-sm mb-6">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit}>
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />

                <div className="mt-6">
                  <Button type="submit" loading={loading} className="w-full">
                    Send Reset Link
                  </Button>
                </div>
              </form>

              <div className="mt-4 text-center">
                <Link
                  href="/"
                  className="text-sm hover:underline"
                  style={{ color: 'var(--color-primary)' }}
                >
                  Back to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}