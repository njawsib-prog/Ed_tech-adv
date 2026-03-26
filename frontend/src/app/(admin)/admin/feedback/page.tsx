'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import PageWrapper from '@/components/layout/PageWrapper';

interface Student {
  id: string;
  name: string;
  email: string;
  roll_number: string;
}

interface Feedback {
  id: string;
  type: 'course' | 'test' | 'platform' | 'other';
  rating: number;
  subject: string;
  message: string;
  created_at: string;
  students: Student;
}

interface FeedbackResponse {
  feedback: Feedback[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface FeedbackStats {
  totalFeedback: number;
  averageRating: number;
  ratingDistribution: { rating: number; count: number }[];
  typeDistribution: Record<string, number>;
}

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ type: '', rating: '' });

  useEffect(() => {
    fetchFeedback();
    fetchStats();
  }, [page, filters]);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '15');
      if (filters.type) params.append('type', filters.type);
      if (filters.rating) params.append('rating', filters.rating);

      const response = await apiClient.get<FeedbackResponse>(`/api/admin/notifications/feedback?${params}`);
      setFeedback(response.data.feedback || []);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/api/admin/notifications/feedback/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching feedback stats:', error);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'course': return 'info';
      case 'test': return 'warning';
      case 'platform': return 'success';
      default: return 'info';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <svg
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  const maxRatingCount = stats ? Math.max(...stats.ratingDistribution.map(r => r.count)) : 1;

  return (
    <PageWrapper title="Feedback">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Feedback</h1>
          <p className="text-gray-500">View and analyze student feedback</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <div className="p-4 text-center">
                <p className="text-3xl font-bold text-[var(--primary-color)]">{stats.totalFeedback}</p>
                <p className="text-sm text-gray-500">Total Feedback</p>
              </div>
            </Card>
            <Card>
              <div className="p-4 text-center">
                <p className="text-3xl font-bold text-yellow-500">
                  {stats.averageRating.toFixed(1)}
                  <span className="text-lg text-gray-400">/5</span>
                </p>
                <p className="text-sm text-gray-500">Average Rating</p>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Rating Distribution</p>
                <div className="space-y-1">
                  {stats.ratingDistribution.map(r => (
                    <div key={r.rating} className="flex items-center gap-2">
                      <span className="text-xs w-6">{r.rating}⭐</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-full rounded-full"
                          style={{ width: `${(r.count / maxRatingCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs w-6 text-right">{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Type Distribution */}
        {stats && (
          <Card>
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-3">Feedback by Type</h3>
              <div className="grid grid-cols-4 gap-4">
                {Object.entries(stats.typeDistribution).map(([type, count]) => (
                  <div key={type} className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-sm text-gray-500 capitalize">{type}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
                >
                  <option value="">All Types</option>
                  <option value="course">Course</option>
                  <option value="test">Test</option>
                  <option value="platform">Platform</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                <select
                  value={filters.rating}
                  onChange={(e) => setFilters(f => ({ ...f, rating: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
                >
                  <option value="">All Ratings</option>
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={() => setFilters({ type: '', rating: '' })} className="w-full">
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Feedback List */}
        <Card>
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : feedback.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No feedback found.</div>
            ) : (
              feedback.map(item => (
                <div key={item.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getTypeColor(item.type)}>{item.type}</Badge>
                        {renderStars(item.rating)}
                      </div>
                      <h3 className="font-semibold text-gray-900">{item.subject || 'No Subject'}</h3>
                      <p className="text-sm text-gray-600 mt-1">{item.message}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span>From: {item.students?.name || 'Anonymous'}</span>
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <span className="px-4 py-2 text-sm">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}