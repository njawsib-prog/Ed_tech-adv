'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui';

export default function AdminLoginPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const adminRoles = ['admin', 'super_admin', 'branch_admin'];

  useEffect(() => {
    if (!isLoading && user && adminRoles.includes(user.role)) {
      if (user.role === 'super_admin') {
        router.push('/super-admin');
      } else {
        router.push('/admin');
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (user && adminRoles.includes(user.role)) {
    return null;
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <LoginForm role="admin" />
    </main>
  );
}