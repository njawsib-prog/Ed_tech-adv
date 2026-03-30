'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { DataTable } from '@/components/super-admin/DataTable';
import { StatCard } from '@/components/super-admin/StatCard';
import { Modal } from '@/components/ui';

interface Complaint {
  id: string;
  subject: string;
  description: string;
  student_name: string;
  branch_name: string;
  priority: string;
  status: string;
  created_at: string;
}

interface Stats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
}

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [resolveModal, setResolveModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter, priorityFilter, search]);

  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/api/super-admin/complaints/stats');
      if (res.data.success) setStats(res.data.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (search) params.search = search;
      const res = await apiClient.get('/api/super-admin/complaints', { params });
      if (res.data.success) setComplaints(res.data.data);
    } catch (err) {
      setError('Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedComplaint) return;
    try {
      const res = await apiClient.put(`/api/super-admin/complaints/${selectedComplaint.id}/resolve`, {
        resolution_notes: resolutionNotes,
      });
      if (res.data.success) {
        setComplaints(complaints.map(c => c.id === selectedComplaint.id ? { ...c, status: 'resolved' } : c));
        setResolveModal(false);
        setSelectedComplaint(null);
        setResolutionNotes('');
        fetchStats();
      }
    } catch (err) {
      alert('Failed to resolve complaint');
    }
  };

  const handleOverride = async (id: string) => {
    if (!confirm('Override this complaint?')) return;
    try {
      const res = await apiClient.put(`/api/super-admin/complaints/${id}/override`);
      if (res.data.success) {
        setComplaints(complaints.map(c => c.id === id ? { ...c, status: res.data.data?.status || 'overridden' } : c));
      }
    } catch (err) {
      alert('Failed to override complaint');
    }
  };

  const priorityBadge = (priority: string) => {
    const map: Record<string, string> = {
      low: 'bg-gray-100 text-gray-600',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-orange-100 text-orange-700',
      critical: 'bg-red-100 text-red-700',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${map[priority] || 'bg-gray-100 text-gray-600'}`}>{priority}</span>;
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      open: 'bg-red-100 text-red-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      resolved: 'bg-green-100 text-green-700',
      overridden: 'bg-purple-100 text-purple-700',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${map[status] || 'bg-gray-100 text-gray-600'}`}>{status.replace(/_/g, ' ')}</span>;
  };

  const columns = [
    {
      key: 'subject',
      header: 'Subject',
      render: (row: Complaint) => <span className="font-medium">{row.subject}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      render: (row: Complaint) => (
        <span className="text-xs text-gray-600">{row.description?.length > 60 ? row.description.slice(0, 60) + '...' : row.description}</span>
      ),
    },
    { key: 'student_name', header: 'Student' },
    { key: 'branch_name', header: 'Branch' },
    { key: 'priority', header: 'Priority', render: (row: Complaint) => priorityBadge(row.priority) },
    { key: 'status', header: 'Status', render: (row: Complaint) => statusBadge(row.status) },
    {
      key: 'created_at',
      header: 'Created',
      render: (row: Complaint) => new Date(row.created_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: Complaint) => (
        <div className="flex space-x-2">
          {row.status !== 'resolved' && (
            <button
              onClick={() => { setSelectedComplaint(row); setResolveModal(true); }}
              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Resolve
            </button>
          )}
          <button
            onClick={() => handleOverride(row.id)}
            className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
          >
            Override
          </button>
        </div>
      ),
    },
  ];

  if (loading && complaints.length === 0) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading complaints...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-64 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Complaints</h1>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total" value={stats.total} icon="tests" color="blue" />
          <StatCard title="Open" value={stats.open} icon="tests" color="orange" />
          <StatCard title="In Progress" value={stats.in_progress} icon="tests" color="purple" />
          <StatCard title="Resolved" value={stats.resolved} icon="tests" color="green" />
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <input
          type="text"
          placeholder="Search complaints..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1 min-w-48"
        />
      </div>

      <DataTable columns={columns} data={complaints} />

      <Modal isOpen={resolveModal} onClose={() => setResolveModal(false)} title="Resolve Complaint" size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Resolving: <strong>{selectedComplaint?.subject}</strong></p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Notes</label>
            <textarea
              value={resolutionNotes}
              onChange={e => setResolutionNotes(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Describe how the complaint was resolved..."
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button onClick={() => setResolveModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={handleResolve} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">Resolve</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
