'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { DataTable } from '@/components/super-admin/DataTable';
import { StatCard } from '@/components/super-admin/StatCard';

interface Feedback {
  id: string;
  rating: number;
  type: string;
  subject: string;
  message: string;
  student_name: string;
  branch_name: string;
  created_at: string;
}

interface Analytics {
  total_feedback: number;
  average_rating: number;
  positive_reviews: number;
}

interface Branch {
  id: string;
  name: string;
}

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex">
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

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAnalyticsAndBranches();
  }, []);

  useEffect(() => {
    fetchFeedback();
  }, [branchFilter, typeFilter, ratingFilter, search]);

  const fetchAnalyticsAndBranches = async () => {
    try {
      const [analyticsRes, branchRes] = await Promise.all([
        apiClient.get('/api/super-admin/feedback/analytics'),
        apiClient.get('/api/super-admin/branches'),
      ]);
      if (analyticsRes.data.success) setAnalytics(analyticsRes.data.data);
      if (branchRes.data.success) setBranches(branchRes.data.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (branchFilter) params.branch_id = branchFilter;
      if (typeFilter) params.type = typeFilter;
      if (ratingFilter) params.rating = ratingFilter;
      if (search) params.search = search;
      const res = await apiClient.get('/api/super-admin/feedback', { params });
      if (res.data.success) setFeedback(res.data.data);
    } catch (err) {
      setError('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  const typeBadge = (type: string) => {
    const map: Record<string, string> = {
      course: 'bg-blue-100 text-blue-700',
      teacher: 'bg-purple-100 text-purple-700',
      platform: 'bg-indigo-100 text-indigo-700',
      general: 'bg-gray-100 text-gray-600',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${map[type] || 'bg-gray-100 text-gray-600'}`}>{type}</span>;
  };

  const columns = [
    {
      key: 'rating',
      header: 'Rating',
      render: (row: Feedback) => <StarRating rating={row.rating} />,
    },
    {
      key: 'type',
      header: 'Type',
      render: (row: Feedback) => typeBadge(row.type),
    },
    {
      key: 'subject',
      header: 'Subject / Message',
      render: (row: Feedback) => (
        <div className="max-w-xs">
          <p className="font-medium text-gray-900">{row.subject}</p>
          <p className="text-xs text-gray-500 truncate">{row.message}</p>
        </div>
      ),
    },
    { key: 'student_name', header: 'Student' },
    { key: 'branch_name', header: 'Branch' },
    {
      key: 'created_at',
      header: 'Date',
      render: (row: Feedback) => new Date(row.created_at).toLocaleDateString(),
    },
  ];

  if (loading && feedback.length === 0) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading feedback...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-64 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>

      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Total Feedback" value={analytics.total_feedback} icon="tests" color="blue" />
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <p className="text-sm font-medium text-gray-500">Average Rating</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-bold text-gray-900">{Number(analytics.average_rating).toFixed(1)}</p>
              <StarRating rating={Math.round(analytics.average_rating)} />
            </div>
          </div>
          <StatCard title="Positive Reviews (4-5★)" value={analytics.positive_reviews} icon="tests" color="green" />
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        <select
          value={branchFilter}
          onChange={e => setBranchFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Branches</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Types</option>
          <option value="course">Course</option>
          <option value="teacher">Teacher</option>
          <option value="platform">Platform</option>
          <option value="general">General</option>
        </select>
        <select
          value={ratingFilter}
          onChange={e => setRatingFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Ratings</option>
          <option value="1">1★+</option>
          <option value="2">2★+</option>
          <option value="3">3★+</option>
          <option value="4">4★+</option>
          <option value="5">5★</option>
        </select>
        <input
          type="text"
          placeholder="Search feedback..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1 min-w-48"
        />
      </div>

      <DataTable columns={columns} data={feedback} />
    </div>
  );
}
