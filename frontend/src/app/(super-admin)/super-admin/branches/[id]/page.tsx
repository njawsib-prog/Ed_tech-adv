'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import { BarChart, LineChart } from '@/components/super-admin/charts';
import { DataTable } from '@/components/super-admin/DataTable';

interface BranchDetails {
  id: string;
  name: string;
  location: string;
  contact_number: string;
  is_active: boolean;
  created_at: string;
  stats: {
    studentCount: number;
    courseCount: number;
    totalRevenue: number;
    recentActivities: any[];
  };
}

interface Student {
  id: string;
  name: string;
  email: string;
  roll_number: string;
  status: string;
  created_at: string;
}

interface Payment {
  id: string;
  student_name: string;
  amount: number;
  status: string;
  created_at: string;
}

export default function BranchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params?.id as string;

  const [branch, setBranch] = useState<BranchDetails | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'payments' | 'activity'>('overview');

  useEffect(() => {
    if (branchId) {
      fetchBranchData();
    }
  }, [branchId]);

  const fetchBranchData = async () => {
    setLoading(true);
    try {
      const [detailsRes, studentsRes, paymentsRes] = await Promise.all([
        apiClient.get(`/api/super-admin/branches/${branchId}/details`),
        apiClient.get(`/api/super-admin/students?branch_id=${branchId}&limit=50`),
        apiClient.get(`/api/super-admin/payments/branch/${branchId}`),
      ]);

      if (detailsRes.data.success) setBranch(detailsRes.data.data);
      if (studentsRes.data.success) setStudents(studentsRes.data.data || []);
      if (paymentsRes.data.success) setPayments(paymentsRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load branch details');
    } finally {
      setLoading(false);
    }
  };

  const studentColumns = [
    {
      key: 'name',
      header: 'Student',
      render: (row: Student) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="text-sm text-gray-500">{row.email}</p>
        </div>
      ),
    },
    { key: 'roll_number', header: 'Roll Number' },
    {
      key: 'status',
      header: 'Status',
      render: (row: Student) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            row.status === 'ACTIVE'
              ? 'text-green-700 bg-green-100'
              : row.status === 'SUSPENDED'
              ? 'text-red-700 bg-red-100'
              : 'text-gray-700 bg-gray-100'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Joined',
      render: (row: Student) => new Date(row.created_at).toLocaleDateString(),
    },
  ];

  const paymentColumns = [
    {
      key: 'id',
      header: 'Payment ID',
      render: (row: Payment) => (
        <span className="font-mono text-sm">{row.id.substring(0, 8)}...</span>
      ),
    },
    { key: 'student_name', header: 'Student' },
    {
      key: 'amount',
      header: 'Amount',
      render: (row: Payment) => `$${(row.amount || 0).toLocaleString()}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Payment) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            row.status === 'completed'
              ? 'text-green-700 bg-green-100'
              : row.status === 'pending'
              ? 'text-yellow-700 bg-yellow-100'
              : 'text-red-700 bg-red-100'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Date',
      render: (row: Payment) => new Date(row.created_at).toLocaleDateString(),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
          <p className="text-gray-500">Loading branch details...</p>
        </div>
      </div>
    );
  }

  if (error || !branch) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 text-lg">{error || 'Branch not found'}</p>
        <button
          onClick={() => router.push('/super-admin/branches')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Back to Branches
        </button>
      </div>
    );
  }

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'students', label: `Students (${branch.stats.studentCount})` },
    { key: 'payments', label: 'Payments' },
    { key: 'activity', label: 'Recent Activity' },
  ];

  return (
    <div className="space-y-6">
      {/* Back Button + Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => router.push('/super-admin/branches')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Back"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900">{branch.name}</h1>
            <span
              className={`px-3 py-1 text-sm font-medium rounded-full ${
                branch.is_active ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
              }`}
            >
              {branch.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-gray-500 mt-1">
            {branch.location} • {branch.contact_number}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
          <p className="text-sm text-gray-500">Total Students</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{branch.stats.studentCount}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
          <p className="text-sm text-gray-500">Active Courses</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{branch.stats.courseCount}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">${branch.stats.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-orange-500">
          <p className="text-sm text-gray-500">Member Since</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{new Date(branch.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Branch Info */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Branch Information</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Branch Name</dt>
                <dd className="text-sm font-medium text-gray-900">{branch.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Location</dt>
                <dd className="text-sm font-medium text-gray-900">{branch.location || 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Contact</dt>
                <dd className="text-sm font-medium text-gray-900">{branch.contact_number || 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Status</dt>
                <dd>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      branch.is_active ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
                    }`}
                  >
                    {branch.is_active ? 'Active' : 'Inactive'}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Created</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {new Date(branch.created_at).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>

          {/* Payment Summary */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Payment Summary</h3>
            <div className="space-y-3">
              {(() => {
                const completed = payments.filter(p => p.status === 'completed');
                const pending = payments.filter(p => p.status === 'pending');
                const failed = payments.filter(p => p.status === 'failed' || p.status === 'overdue');
                return (
                  <>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-sm text-green-700 font-medium">Completed</span>
                      <div className="text-right">
                        <p className="font-bold text-green-800">{completed.length} payments</p>
                        <p className="text-sm text-green-600">${completed.reduce((s, p) => s + (p.amount || 0), 0).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                      <span className="text-sm text-yellow-700 font-medium">Pending</span>
                      <div className="text-right">
                        <p className="font-bold text-yellow-800">{pending.length} payments</p>
                        <p className="text-sm text-yellow-600">${pending.reduce((s, p) => s + (p.amount || 0), 0).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <span className="text-sm text-red-700 font-medium">Failed/Overdue</span>
                      <div className="text-right">
                        <p className="font-bold text-red-800">{failed.length} payments</p>
                        <p className="text-sm text-red-600">${failed.reduce((s, p) => s + (p.amount || 0), 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Students in {branch.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{students.length} students found</p>
          </div>
          <DataTable columns={studentColumns} data={students} />
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Payment History</h3>
            <p className="text-sm text-gray-500 mt-1">All payments from {branch.name}</p>
          </div>
          <DataTable columns={paymentColumns} data={payments} />
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Recent Activity</h3>
          </div>
          <div className="p-6">
            {branch.stats.recentActivities.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No recent activity found</p>
            ) : (
              <div className="space-y-4">
                {branch.stats.recentActivities.map((activity, idx) => (
                  <div key={idx} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {activity.created_at ? new Date(activity.created_at).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
