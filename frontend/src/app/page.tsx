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

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === 'super_admin') {
        router.push('/super-admin');
      } else if (user.role === 'admin' || user.role === 'branch_admin') {
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
