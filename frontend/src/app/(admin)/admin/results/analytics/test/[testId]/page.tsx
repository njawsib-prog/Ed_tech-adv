'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import apiClient from '@/lib/apiClient';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import PageWrapper from '@/components/layout/PageWrapper';

interface TestAnalytics {
  test: {
    id: string;
    title: string;
    totalMarks: number;
    passingMarks: number;
  };
  summary: {
    totalAttempts: number;
    passedAttempts: number;
    passRate: number;
    averageScore: number;
    averagePercentage: number;
    averageTimeSeconds: number;
  };
  questionStats: QuestionStat[];
  scoreDistribution: ScoreRange[];
}

interface QuestionStat {
  questionNumber: number;
  correctResponses: number;
  totalResponses: number;
  accuracy: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface ScoreRange {
  range: string;
  count: number;
}

export default function TestAnalyticsPage() {
  const router = useRouter();
  const params = useParams();
  const testId = params.testId as string;
  
  const [analytics, setAnalytics] = useState<TestAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [testId]);

  const fetchAnalytics = async () => {
    try {
      const response = await apiClient.get(`/api/admin/results/analytics/test/${testId}`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      alert('Failed to load analytics');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  if (loading) {
    return (
      <PageWrapper title="Loading...">
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </PageWrapper>
    );
  }

  if (!analytics) {
    return (
      <PageWrapper title="Analytics Not Found">
        <Card>
          <div className="p-6 text-center">
            <p className="text-gray-500">Analytics data could not be loaded.</p>
            <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
          </div>
        </Card>
      </PageWrapper>
    );
  }

  const maxScoreCount = Math.max(...analytics.scoreDistribution.map(s => s.count), 1);

  return (
    <PageWrapper title={`Analytics: ${analytics.test.title}`}>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <div className="p-4 text-center">
              <p className="text-xl md:text-2xl font-bold text-[var(--primary-color)]">
                {analytics.summary.totalAttempts}
              </p>
              <p className="text-sm text-gray-500">Total Attempts</p>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <p className="text-xl md:text-2xl font-bold text-green-600">
                {analytics.summary.passedAttempts}
              </p>
              <p className="text-sm text-gray-500">Passed</p>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <p className="text-xl md:text-2xl font-bold">
                {analytics.summary.passRate.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500">Pass Rate</p>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <p className="text-xl md:text-2xl font-bold">
                {analytics.summary.averagePercentage.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500">Average Score</p>
            </div>
          </Card>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Test Info */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Test Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Test Title</span>
                  <span className="font-medium">{analytics.test.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Marks</span>
                  <span className="font-medium">{analytics.test.totalMarks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Passing Marks</span>
                  <span className="font-medium">{analytics.test.passingMarks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Average Score</span>
                  <span className="font-medium">{analytics.summary.averageScore.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Average Time</span>
                  <span className="font-medium">{formatTime(analytics.summary.averageTimeSeconds)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Score Distribution */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Score Distribution</h3>
              <div className="space-y-3">
                {analytics.scoreDistribution.map((range) => (
                  <div key={range.range} className="flex items-center gap-3">
                    <span className="w-16 text-sm text-gray-500">{range.range}%</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full bg-[var(--primary-color)] rounded-full transition-all duration-300"
                        style={{ width: `${(range.count / maxScoreCount) * 100}%` }}
                      />
                    </div>
                    <span className="w-12 text-sm font-medium text-right">{range.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Question Statistics */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Question-wise Statistics</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Question #</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Correct Responses</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Total Responses</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Accuracy</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Difficulty</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.questionStats.map((stat) => (
                    <tr key={stat.questionNumber} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">
                        Question {stat.questionNumber}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {stat.correctResponses} / {stat.totalResponses}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {stat.totalResponses}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-full rounded-full ${
                                stat.accuracy >= 70 ? 'bg-green-500' :
                                stat.accuracy >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${stat.accuracy}%` }}
                            />
                          </div>
                          <span>{stat.accuracy.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            stat.difficulty === 'easy' ? 'success' :
                            stat.difficulty === 'medium' ? 'warning' : 'danger'
                          }
                        >
                          {stat.difficulty}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        {/* Difficulty Summary */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Difficulty Analysis</h3>
            <div className="grid grid-cols-3 gap-4">
              {['easy', 'medium', 'hard'].map(difficulty => {
                const count = analytics.questionStats.filter(q => q.difficulty === difficulty).length;
                const percentage = analytics.questionStats.length > 0
                  ? (count / analytics.questionStats.length) * 100
                  : 0;

                return (
                  <div
                    key={difficulty}
                    className={`p-4 rounded-lg text-center ${
                      difficulty === 'easy' ? 'bg-green-50' :
                      difficulty === 'medium' ? 'bg-yellow-50' : 'bg-red-50'
                    }`}
                  >
                    <p className="text-lg md:text-xl font-bold">{count}</p>
                    <p className="text-sm text-gray-500 capitalize">{difficulty} Questions</p>
                    <p className="text-xs text-gray-400">{percentage.toFixed(0)}% of total</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
          <Button variant="outline" onClick={() => router.push(`/admin/results?testId=${testId}`)}>
            View All Results
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
}