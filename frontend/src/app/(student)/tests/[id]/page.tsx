'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageWrapper from '@/components/layout/PageWrapper';
import { Card, Button, Badge, Spinner, Modal } from '@/components/ui';
import { apiClient } from '@/lib/apiClient';

interface TestDetails {
  id: string;
  title: string;
  description: string;
  time_limit_mins: number;
  question_count: number;
  course_name: string;
  has_submitted: boolean;
  assignment_status: string;
  is_active: boolean;
}

export default function TestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [test, setTest] = useState<TestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const response = await apiClient.get(`/student/tests/${params.id}`);
        setTest(response.data);
      } catch (error) {
        console.error('Failed to fetch test:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTest();
  }, [params.id]);

  const handleStartTest = async () => {
    setShowConfirm(false);
    router.push(`/tests/${params.id}/take`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!test) {
    return (
      <PageWrapper title="Test Not Found">
        <Card>
          <p className="text-center text-gray-500 py-8">This test could not be found.</p>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title={test.title}>
        <Card className="max-w-2xl mx-auto">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{test.title}</h2>
            <Badge variant="info">{test.course_name}</Badge>
          </div>

          {test.description && (
            <div className="mb-4 p-4 bg-gray-50 rounded-base">
              <p className="text-gray-700">{test.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-4 bg-gray-50 rounded-base">
              <p className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>
                {test.question_count}
              </p>
              <p className="text-sm text-gray-500">Questions</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-base">
              <p className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>
                {test.time_limit_mins}
              </p>
              <p className="text-sm text-gray-500">Minutes</p>
            </div>
          </div>

          {test.has_submitted ? (
            <div className="text-center">
              <div className="p-4 bg-green-50 rounded-base mb-4">
                <p className="text-green-700 font-medium">You have already completed this test</p>
              </div>
              <Button onClick={() => router.push(`/tests/${test.id}/result`)}>
                View Result
              </Button>
            </div>
          ) : !test.is_active ? (
            <div className="text-center p-4 bg-yellow-50 rounded-base">
              <p className="text-yellow-700">This test is not yet active</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 rounded-base">
                <p className="text-yellow-700 text-sm">
                  ⚠️ Important: Once you start the test, the timer will begin. You cannot pause or restart.
                  Make sure you have a stable internet connection.
                </p>
              </div>

              <Button className="w-full" onClick={() => setShowConfirm(true)}>
                Start Test
              </Button>
            </div>
          )}
        </Card>

        {/* Confirmation Modal */}
        <Modal
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          title="Start Test?"
          size="sm"
        >
          <p className="text-gray-600 mb-4">
            Are you ready to start <strong>{test.title}</strong>? The timer will begin immediately.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleStartTest}>
              Start Now
            </Button>
          </div>
        </Modal>
      </PageWrapper>
  );
}