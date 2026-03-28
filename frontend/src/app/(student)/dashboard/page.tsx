'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
        // Handle both old format (direct object) and new format ({ success, data })
        setData(response.data.success ? response.data.data : response.data);
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
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <PageWrapper title={`${getGreeting()}!`}>
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <div className="text-center p-4">
              <p className="text-student-muted mb-1">Total Tests</p>
              <p className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
                {data?.stats.totalTests || 0}
              </p>
            </div>
          </Card>
          <Card>
            <div className="text-center p-4">
              <p className="text-student-muted mb-1">Avg Score</p>
              <p className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
                {data?.stats.avgScore || 0}%
              </p>
            </div>
          </Card>
          <Card>
            <div className="text-center p-4">
              <p className="text-student-muted mb-1">Best Score</p>
              <p className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
                {data?.stats.bestScore || 0}%
              </p>
            </div>
          </Card>
          <Card>
            <div className="text-center p-4">
              <p className="text-student-muted mb-1">Streak</p>
              <p className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
                {data?.stats.streak || 0} 🔥
              </p>
            </div>
          </Card>
        </div>

        {/* Today's Tests */}
        {data?.todayTests && data.todayTests.length > 0 && (
          <Card title="Today's Tests" className="mb-5">
            <div className="space-y-3">
              {data.todayTests.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <div>
                    <p className="text-student-body font-medium text-gray-900">{item.tests?.title}</p>
                    <p className="text-student-muted">{item.tests?.courses?.name}</p>
                  </div>
                  <Button size="sm" onClick={() => router.push(`/tests/${item.tests?.id}`)}>
                    Start
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Upcoming Tests */}
          <Card title="Upcoming Tests">
            {data?.upcomingTests && data.upcomingTests.length > 0 ? (
              <div className="space-y-3">
                {data.upcomingTests.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                  >
                    <div>
                      <p className="text-student-body font-medium text-gray-900">{item.tests?.title}</p>
                      <p className="text-student-muted">
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
              <p className="text-student-muted text-center py-8">No upcoming tests</p>
            )}
          </Card>

          {/* Recent Results */}
          <Card title="Recent Results">
            {data?.recentResults && data.recentResults.length > 0 ? (
              <div className="space-y-3">
                {data.recentResults.map((result: any) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                  >
                    <div>
                      <p className="text-student-body font-medium text-gray-900">{result.tests?.title}</p>
                      <p className="text-student-muted">
                        {new Date(result.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm" style={{ color: 'var(--color-primary)' }}>
                        {result.score}/{result.total_marks}
                      </p>
                      <p className="text-student-muted">{Math.round(result.percentage)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-student-muted text-center py-8">No results yet</p>
            )}
          </Card>
        </div>
      </PageWrapper>
  );
}