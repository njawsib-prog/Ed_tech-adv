'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { DataTable } from '@/components/super-admin/DataTable';
import { StatCard } from '@/components/super-admin/StatCard';
import { Modal } from '@/components/ui';

interface Payment {
  id: string;
  student_name: string;
  branch_name: string;
  amount: number;
  status: string;
  created_at: string;
  currency?: string;
}

interface Defaulter {
  id: string;
  student_name: string;
  branch_name: string;
  pending_amount: number;
  due_date: string;
}

interface Analytics {
  total_revenue: number;
  pending_amount: number;
  completed_count: number;
  defaulter_count: number;
}

interface Branch {
  id: string;
  name: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [defaulters, setDefaulters] = useState<Defaulter[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'defaulters'>('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [search, setSearch] = useState('');
  const [receiptModal, setReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [statusFilter, branchFilter, search]);

  const fetchAll = async () => {
    try {
      const [analyticsRes, branchesRes, defaultersRes] = await Promise.all([
        apiClient.get('/api/super-admin/payments/analytics'),
        apiClient.get('/api/super-admin/branches'),
        apiClient.get('/api/super-admin/payments/defaulters'),
      ]);
      if (analyticsRes.data.success) setAnalytics(analyticsRes.data.data);
      if (branchesRes.data.success) setBranches(branchesRes.data.data);
      if (defaultersRes.data.success) setDefaulters(defaultersRes.data.data);
    } catch (err) {
      setError('Failed to load data');
    }
    await fetchPayments();
    setLoading(false);
  };

  const fetchPayments = async () => {
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (branchFilter) params.branch_id = branchFilter;
      if (search) params.search = search;
      const res = await apiClient.get('/api/super-admin/payments', { params });
      if (res.data.success) setPayments(res.data.data);
    } catch (err) {
      console.error('Error fetching payments:', err);
    }
  };

  const handleVerify = async (id: string) => {
    try {
      const res = await apiClient.put(`/api/super-admin/payments/${id}/verify`);
      if (res.data.success) {
        setPayments(payments.map(p => p.id === id ? { ...p, status: 'completed' } : p));
      }
    } catch (err) {
      alert('Failed to verify payment');
    }
  };

  const handleReceipt = async (id: string) => {
    try {
      const res = await apiClient.post(`/api/super-admin/payments/${id}/receipt`);
      if (res.data.success) {
        setReceiptData(res.data.data);
        setReceiptModal(true);
      }
    } catch (err) {
      alert('Failed to fetch receipt');
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      completed: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      failed: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${map[status] || 'bg-gray-100 text-gray-700'}`}>
        {status}
      </span>
    );
  };

  const paymentColumns = [
    {
      key: 'id',
      header: 'Payment ID',
      render: (row: Payment) => (
        <span className="font-mono text-xs text-gray-600">{row.id.slice(0, 8)}...</span>
      ),
    },
    {
      key: 'student_name',
      header: 'Student Name',
      render: (row: Payment) => <span className="font-medium">{row.student_name}</span>,
    },
    { key: 'branch_name', header: 'Branch' },
    {
      key: 'amount',
      header: 'Amount',
      render: (row: Payment) => (
        <span className="font-semibold">${Number(row.amount).toLocaleString()}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Payment) => statusBadge(row.status),
    },
    {
      key: 'created_at',
      header: 'Date',
      render: (row: Payment) => new Date(row.created_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: Payment) => (
        <div className="flex space-x-2">
          {row.status !== 'completed' && (
            <button
              onClick={() => handleVerify(row.id)}
              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Verify
            </button>
          )}
          <button
            onClick={() => handleReceipt(row.id)}
            className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
          >
            Receipt
          </button>
        </div>
      ),
    },
  ];

  const defaulterColumns = [
    {
      key: 'student_name',
      header: 'Student',
      render: (row: Defaulter) => <span className="font-medium">{row.student_name}</span>,
    },
    { key: 'branch_name', header: 'Branch' },
    {
      key: 'pending_amount',
      header: 'Pending Amount',
      render: (row: Defaulter) => (
        <span className="font-semibold text-red-600">${Number(row.pending_amount).toLocaleString()}</span>
      ),
    },
    {
      key: 'due_date',
      header: 'Due Date',
      render: (row: Defaulter) => new Date(row.due_date).toLocaleDateString(),
    },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading payments...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-64 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
      </div>

      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Revenue" value={`$${Number(analytics.total_revenue).toLocaleString()}`} icon="payments" color="green" />
          <StatCard title="Pending Amount" value={`$${Number(analytics.pending_amount).toLocaleString()}`} icon="payments" color="orange" />
          <StatCard title="Completed Payments" value={analytics.completed_count} icon="payments" color="blue" />
          <StatCard title="Defaulters" value={analytics.defaulter_count} icon="students" color="pink" />
        </div>
      )}

      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {(['all', 'defaulters'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'all' ? 'All Payments' : 'Defaulters'}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'all' && (
        <>
          <div className="flex flex-wrap gap-4">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            <select
              value={branchFilter}
              onChange={e => setBranchFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Search payments..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1 min-w-48"
            />
          </div>
          <DataTable columns={paymentColumns} data={payments} />
        </>
      )}

      {activeTab === 'defaulters' && (
        <DataTable columns={defaulterColumns} data={defaulters} />
      )}

      <Modal isOpen={receiptModal} onClose={() => setReceiptModal(false)} title="Payment Receipt" size="md">
        {receiptData && (
          <div className="space-y-3 text-sm">
            {Object.entries(receiptData).map(([key, value]) => (
              <div key={key} className="flex justify-between border-b pb-2">
                <span className="font-medium text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="text-gray-900">{String(value)}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
