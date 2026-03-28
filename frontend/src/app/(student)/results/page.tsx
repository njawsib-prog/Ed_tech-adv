'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/apiClient';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import PageWrapper from '@/components/layout/PageWrapper';

interface Test {
  id: string;
  title: string;
  total_marks: number;
  passing_marks: number;
  subjects: {
    id: string;
    name: string;
  };
}

interface Result {
  id: string;
  score: number;
  total_marks: number;
  percentage: number;
  status: 'passed' | 'failed';
  time_taken_seconds: number;
  submitted_at: string;
  tests: Test;
}

interface Performance {
  totalTests: number;
  passedTests: number;
  passRate: number;
  averagePercentage: number;
  totalMarksObtained: number;
  totalMarksPossible: number;
  recentAverage: number;
  improvementTrend: 'improving' | 'declining' | 'stable';
  subjectPerformance: Record<string, { total: number; passed: number; avgPercentage: number }>;
}

export default function StudentResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<Result[]>([]);
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resultsRes, performanceRes] = await Promise.all([
        apiClient.get('/student/results'),
        apiClient.get('/student/performance')
      ]);
      setResults(resultsRes.data || []);
      setPerformance(performanceRes.data);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <PageWrapper title="My Results">
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="My Results">
      <div className="space-y-6">
        {/* Performance Summary */}
        {performance && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <div className="p-4 text-center">
                <p className="text-2xl md:text-3xl font-bold text-[var(--primary-color)]">{performance.totalTests}</p>
                <p className="text-student-muted mt-1">Tests Taken</p>
              </div>
            </Card>
            <Card>
              <div className="p-4 text-center">
                <p className="text-2xl md:text-3xl font-bold text-green-600">{performance.passedTests}</p>
                <p className="text-student-muted mt-1">Passed</p>
              </div>
            </Card>
            <Card>
              <div className="p-4 text-center">
                <p className="text-2xl md:text-3xl font-bold">{performance.averagePercentage.toFixed(1)}%</p>
                <p className="text-student-muted mt-1">Avg Score</p>
              </div>
            </Card>
            <Card>
              <div className="p-4 text-center">
                <p className={`text-2xl md:text-3xl font-bold ${
                  performance.improvementTrend === 'improving' ? 'text-green-600' :
                  performance.improvementTrend === 'declining' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {performance.improvementTrend === 'improving' ? '↑' :
                   performance.improvementTrend === 'declining' ? '↓' : '→'}
                </p>
                <p className="text-student-muted mt-1 capitalize">{performance.improvementTrend}</p>
              </div>
            </Card>
          </div>
        )}

        {/* Subject Performance */}
        {performance && Object.keys(performance.subjectPerformance).length > 0 && (
          <Card>
            <div className="p-4 md:p-6">
              <h3 className="text-student-subheading mb-4">Subject-wise Performance</h3>
              <div className="space-y-3">
                {Object.entries(performance.subjectPerformance).map(([subject, data]) => (
                  <div key={subject} className="flex items-center gap-3">
                    <div className="w-28 text-sm font-medium truncate">{subject}</div>
                    <div className="flex-1">
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            data.avgPercentage >= 70 ? 'bg-green-500' :
                            data.avgPercentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${data.avgPercentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-16 text-xs text-right font-medium">
                      {data.avgPercentage.toFixed(0)}%
                    </div>
                    <div className="w-20 text-student-muted hidden sm:block">
                      {data.passed}/{data.total} passed
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Results List */}
        <Card>
          <div className="p-4 md:p-6">
            <h3 className="text-student-subheading mb-4">Test History</h3>
            {results.length === 0 ? (
              <p className="text-center text-student-muted py-8">No test results yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-3 font-medium text-gray-500">Test</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-500">Subject</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-500">Score</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-500">Percentage</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-500">Status</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-500 hidden md:table-cell">Time</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-500 hidden sm:table-cell">Date</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map(result => (
                      <tr key={result.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-3 font-medium">{result.tests?.title}</td>
                        <td className="py-3 px-3 text-gray-600">{result.tests?.subjects?.name || 'N/A'}</td>
                        <td className="py-3 px-3">
                          <span className="font-semibold">{result.score}</span>
                          <span className="text-gray-400">/{result.total_marks}</span>
                        </td>
                        <td className="py-3 px-3">{result.percentage?.toFixed(1)}%</td>
                        <td className="py-3 px-3">
                          <Badge variant={result.status === 'passed' ? 'success' : 'danger'}>
                            {result.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 hidden md:table-cell">
                          {result.time_taken_seconds ? formatTime(result.time_taken_seconds) : 'N/A'}
                        </td>
                        <td className="py-3 px-3 hidden sm:table-cell">{formatDate(result.submitted_at)}</td>
                        <td className="py-3 px-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/results/${result.id}`)}
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}