'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui';

const LoginForm = dynamic(() => import('@/components/auth/LoginForm'), { ssr: false });

function HomeContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const adminRoles = ['admin', 'super_admin', 'branch_admin'];

  useEffect(() => {
    if (!isLoading && user) {
      if (adminRoles.includes(user.role)) {
        router.push('/admin');
      } else {
        router.push('/dashboard');
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

  if (user) {
    return null;
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <LoginForm role="student" />
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
