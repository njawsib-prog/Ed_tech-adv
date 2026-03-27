'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui';

const STATIC_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/tests': 'My Tests',
  '/courses': 'Courses',
  '/materials': 'Study Materials',
  '/notifications': 'Notifications',
  '/complaints': 'Complaints',
  '/feedback': 'Feedback',
  '/profile': 'My Profile',
  '/results': 'My Results',
};

function getPageTitle(pathname: string): string {
  if (STATIC_TITLES[pathname]) return STATIC_TITLES[pathname];
  if (pathname.match(/^\/tests\/[^/]+\/take$/)) return 'Take Test';
  if (pathname.match(/^\/tests\/[^/]+$/)) return 'Test Details';
  if (pathname.match(/^\/results\/[^/]+$/)) return 'Result Details';
  return 'Student Dashboard';
}

export default function StudentRootLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/');
      } else if (user.role !== 'student') {
        router.push('/admin');
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user || user.role !== 'student') {
    return null;
  }

  const title = getPageTitle(pathname);

  return (
    <div className="overflow-x-auto">
      <div className="min-h-screen flex bg-gray-50 min-w-[1024px]">
        <Sidebar role="student" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar title={title} onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}