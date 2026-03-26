'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import apiClient from '@/lib/apiClient';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Spinner from '@/components/ui/Spinner';
import PageWrapper from '@/components/layout/PageWrapper';

interface Test {
  id: string;
  title: string;
  total_marks: number;
  passing_marks: number;
}

interface Student {
  id: string;
  name: string;
  email: string;
  roll_number: string;
}

interface Result {
  id: string;
  score: number;
  total_marks: number;
  percentage: number;
  status: 'passed' | 'failed' | 'pending';
  time_taken_seconds: number;
  submitted_at: string;
  started_at: string;
  tests: Test;
  students: Student;
}

interface ResultsResponse {
  results: Result[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface TestOption {
  id: string;
  title: string;
}

export default function ResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [results, setResults] = useState<Result[]>([]);
  const [tests, setTests] = useState<TestOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    testId: searchParams.get('testId') || '',
    status: '',
    sortBy: 'submitted_at',
    sortOrder: 'desc'
  });

  useEffect(() => {
    fetchTests();
  }, []);

  useEffect(() => {
    fetchResults();
  }, [page, filters]);

  const fetchTests = async () => {
    try {
      const response = await apiClient.get('/api/admin/tests', {
        params: { limit: 100 }
      });
      setTests(response.data.tests || []);
    } catch (error) {
      console.error('Error fetching tests:', error);
    }
  };

  const fetchResults = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '15');
      if (filters.testId) params.append('testId', filters.testId);
      if (filters.status) params.append('status', filters.status);
      params.append('sortBy', filters.sortBy);
      params.append('sortOrder', filters.sortOrder);

      const response = await apiClient.get<ResultsResponse>(`/api/admin/results?${params}`);
      setResults(response.data.results || []);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (filters.testId) params.append('testId', filters.testId);
      if (filters.status) params.append('status', filters.status);

      const response = await apiClient.get(`/api/admin/results/export?${params}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `results-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting results:', error);
      alert('Failed to export results');
    } finally {
      setExporting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  return (
    <PageWrapper title="Results & Analytics">
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Test
                </label>
                <select
                  value={filters.testId}
                  onChange={(e) => handleFilterChange('testId', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
                >
                  <option value="">All Tests</option>
                  {tests.map(test => (
                    <option key={test.id} value={test.id}>
                      {test.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
                >
                  <option value="">All Status</option>
                  <option value="passed">Passed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
                >
                  <option value="submitted_at">Submitted Date</option>
                  <option value="score">Score</option>
                  <option value="percentage">Percentage</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={exportToCSV}
                  variant="outline"
                  disabled={exporting}
                  className="w-full"
                >
                  {exporting ? 'Exporting...' : 'Export to CSV'}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Results Table */}
        <Card>
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Test Results</h3>
            {loading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : results.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No results found</p>
            ) : (
              <>
                <Table
                  headers={[
                    'Student',
                    'Roll No.',
                    'Test',
                    'Score',
                    'Percentage',
                    'Status',
                    'Time Taken',
                    'Submitted',
                    'Actions'
                  ]}
                >
                  {results.map(result => (
                    <tr key={result.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">{result.students?.name || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{result.students?.email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {result.students?.roll_number || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {result.tests?.title || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {result.score} / {result.total_marks}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {result.percentage?.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={result.status === 'passed' ? 'success' : 'danger'}>
                          {result.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {result.time_taken_seconds ? formatTime(result.time_taken_seconds) : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {result.submitted_at ? formatDate(result.submitted_at) : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/admin/results/${result.id}`)}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/admin/results/analytics/test/${result.tests?.id}`)}
                          >
                            Analytics
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    <span className="px-4 py-2 text-sm">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === totalPages}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}