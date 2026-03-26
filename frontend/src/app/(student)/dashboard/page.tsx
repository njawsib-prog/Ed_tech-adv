'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StudentLayout from '@/components/layout/StudentLayout';
import PageWrapper from '@/components/layout/PageWrapper';
import { Card, Button, Badge, Spinner } from '@/components/ui';
import { apiClient } from '@/lib/apiClient';

interface DashboardData {
  todayTests: any[];
  upcomingTests: any[];
  recentResults: any[];
  stats: {
    totalTests: number;
    avgScore: number;
    bestScore: number;
    streak: number;
  };
}

export default function StudentDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await apiClient.get('/student/dashboard');
        setData(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <StudentLayout title="Dashboard">
        <div className="flex items-center justify-center min-h-[400px]">
          <Spinner size="lg" />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title="Dashboard">
      <PageWrapper title={`${getGreeting()}!`}>
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Tests</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
                {data?.stats.totalTests || 0}
              </p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-sm text-gray-500">Avg Score</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
                {data?.stats.avgScore || 0}%
              </p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-sm text-gray-500">Best Score</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
                {data?.stats.bestScore || 0}%
              </p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-sm text-gray-500">Streak</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
                {data?.stats.streak || 0} 🔥
              </p>
            </div>
          </Card>
        </div>

        {/* Today's Tests */}
        {data?.todayTests && data.todayTests.length > 0 && (
          <Card title="Today's Tests" className="mb-6">
            <div className="space-y-3">
              {data.todayTests.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-base"
                >
                  <div>
                    <p className="font-medium text-gray-900">{item.tests?.title}</p>
                    <p className="text-sm text-gray-500">{item.tests?.courses?.name}</p>
                  </div>
                  <Button size="sm" onClick={() => router.push(`/tests/${item.tests?.id}`)}>
                    Start
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Upcoming Tests */}
          <Card title="Upcoming Tests">
            {data?.upcomingTests && data.upcomingTests.length > 0 ? (
              <div className="space-y-3">
                {data.upcomingTests.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-base"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{item.tests?.title}</p>
                      <p className="text-sm text-gray-500">
                        {item.tests?.scheduled_at
                          ? new Date(item.tests.scheduled_at).toLocaleDateString()
                          : 'TBD'}
                      </p>
                    </div>
                    <Badge variant="info">Scheduled</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No upcoming tests</p>
            )}
          </Card>

          {/* Recent Results */}
          <Card title="Recent Results">
            {data?.recentResults && data.recentResults.length > 0 ? (
              <div className="space-y-3">
                {data.recentResults.map((result: any) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-base"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{result.tests?.title}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(result.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold" style={{ color: 'var(--color-primary)' }}>
                        {result.score}/{result.total}
                      </p>
                      <p className="text-sm text-gray-500">{Math.round(result.accuracy)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No results yet</p>
            )}
          </Card>
        </div>
      </PageWrapper>
    </StudentLayout>
  );
}