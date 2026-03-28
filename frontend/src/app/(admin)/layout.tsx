'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui';

const pageTitles: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/students': 'Student Management',
  '/admin/courses': 'Course Management',
  '/admin/tests': 'Tests & Exams',
  '/admin/results': 'Results & Analytics',
  '/admin/materials': 'Study Materials',
  '/admin/notifications': 'Notifications',
  '/admin/complaints': 'Complaints',
  '/admin/feedback': 'Feedback',
  '/admin/settings': 'Settings',
  '/admin/payments': 'Payments & Revenue',
  '/admin/branches': 'Branch Management',
  '/admin/attendance': 'Attendance Management',
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === '/admin/login';
  const adminRoles = ['admin', 'super_admin', 'branch_admin'];

  useEffect(() => {
    if (!isLoginPage && !isLoading) {
      if (!user) {
        router.push('/admin/login');
      } else if (!adminRoles.includes(user.role)) {
        router.push('/');
      }
    }
  }, [user, isLoading, router, pathname, isLoginPage]);

  // Login page renders without the admin shell
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user || !adminRoles.includes(user.role)) {
    return null;
  }

  const title =
    pageTitles[pathname] ??
    (pathname.startsWith('/admin/results/') ? 'Result Details' : 'Admin Dashboard');

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar role="admin" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}