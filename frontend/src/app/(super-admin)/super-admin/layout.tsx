'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui';
import SuperAdminSidebar from '@/components/layout/SuperAdminSidebar';
import Navbar from '@/components/layout/Navbar';

const pageTitles: Record<string, string> = {
  '/super-admin': 'Dashboard',
  '/super-admin/branches': 'Branch Management',
  '/super-admin/payments': 'Payments & Revenue',
  '/super-admin/courses': 'Course Management',
  '/super-admin/students': 'Student Management',
  '/super-admin/notifications': 'Notifications',
  '/super-admin/complaints': 'Complaints',
  '/super-admin/feedback': 'Feedback',
  '/super-admin/settings': 'Global Settings',
  '/super-admin/audit-logs': 'Audit Logs',
};

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/admin/login');
      } else if (user.role !== 'super_admin') {
        router.push('/unauthorized');
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

  if (!user || user.role !== 'super_admin') {
    return null;
  }

  const title = pageTitles[pathname] ?? 'Super Admin Dashboard';

  return (
    <div className="min-h-screen flex bg-gray-50">
      <SuperAdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
