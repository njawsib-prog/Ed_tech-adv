'use client';

import { useEffect, useState } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { Card, Spinner, Badge } from '@/components/ui';
import { apiClient } from '@/lib/apiClient';

interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  testsThisWeek: number;
  avgScore: number;
  recentActivity: any[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiClient.get('/admin/dashboard');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <PageWrapper title="Dashboard Overview">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <div className="flex items-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mr-4"
                style={{ backgroundColor: 'var(--color-primary-light)' }}
              >
                <svg className="w-6 h-6" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Students</p>
                <p className="text-xl font-bold text-gray-900">{stats?.totalStudents || 0}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mr-4"
                style={{ backgroundColor: '#D1FAE5' }}
              >
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Today</p>
                <p className="text-xl font-bold text-gray-900">{stats?.activeStudents || 0}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mr-4"
                style={{ backgroundColor: '#FEF3C7' }}
              >
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tests This Week</p>
                <p className="text-xl font-bold text-gray-900">{stats?.testsThisWeek || 0}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mr-4"
                style={{ backgroundColor: '#DBEAFE' }}
              >
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Score</p>
                <p className="text-xl font-bold text-gray-900">{stats?.avgScore || 0}%</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card title="Recent Activity">
          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {stats.recentActivity.slice(0, 10).map((activity: any, index: number) => (
                <div key={index} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{activity.action}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={activity.user_type === 'admin' ? 'info' : 'success'}>
                    {activity.user_type}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No recent activity</p>
          )}
        </Card>
      </PageWrapper>
  );
}