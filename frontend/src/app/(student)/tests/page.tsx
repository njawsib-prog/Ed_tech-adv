'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageWrapper from '@/components/layout/PageWrapper';
import { Card, Button, Badge, Spinner } from '@/components/ui';
import { apiClient } from '@/lib/apiClient';

interface TestData {
  pending: any[];
  scheduled: any[];
  completed: any[];
}

export default function StudentTestsPage() {
  const [tests, setTests] = useState<TestData>({ pending: [], scheduled: [], completed: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'scheduled' | 'completed'>('pending');
  const router = useRouter();

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const response = await apiClient.get('/student/tests');
        setTests(response.data);
      } catch (error) {
        console.error('Failed to fetch tests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  const tabs = [
    { key: 'pending', label: 'Assigned', count: tests.pending.length },
    { key: 'scheduled', label: 'Scheduled', count: tests.scheduled.length },
    { key: 'completed', label: 'Completed', count: tests.completed.length },
  ];

  const currentTests = tests[activeTab];

  return (
    <PageWrapper title="My Tests">
        {/* Tabs */}
        <div className="flex gap-4 md:gap-6 mb-6 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3 pb-2.5 font-medium text-sm md:text-base border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-current'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              style={activeTab === tab.key ? { color: 'var(--color-primary)' } : {}}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Tests Grid */}
        {currentTests.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-student-muted">No {activeTab} tests</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentTests.map((test: any) => (
              <Card key={test.id}>
                <div className="mb-3">
                  <h3 className="text-student-subheading text-gray-900">{test.title}</h3>
                  <p className="text-student-muted mt-0.5">{test.course_name}</p>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <Badge variant={test.type === 'practice' ? 'warning' : 'info'}>
                    {test.type}
                  </Badge>
                  <span className="text-student-muted">{test.time_limit_mins} mins</span>
                </div>

                {activeTab === 'completed' && test.result && (
                  <div className="p-3 bg-gray-50 rounded-xl mb-4">
                    <div className="flex justify-between">
                      <span className="text-student-body text-gray-600">Score:</span>
                      <span className="font-bold text-sm" style={{ color: 'var(--color-primary)' }}>
                        {test.result.score}/{test.result.total}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-student-body text-gray-600">Accuracy:</span>
                      <span className="text-sm">{Math.round(test.result.accuracy)}%</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {activeTab === 'pending' && (
                    <Button className="flex-1" onClick={() => router.push(`/tests/${test.id}`)}>
                      Start Test
                    </Button>
                  )}
                  {activeTab === 'completed' && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => router.push(`/tests/${test.id}/result`)}
                    >
                      View Result
                    </Button>
                  )}
                  {activeTab === 'scheduled' && (
                    <div className="flex-1 text-center p-2 bg-gray-100 rounded-xl">
                      <p className="text-student-muted">
                        {test.scheduled_at
                          ? `Starts ${new Date(test.scheduled_at).toLocaleString()}`
                          : 'Coming Soon'}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </PageWrapper>
  );
}