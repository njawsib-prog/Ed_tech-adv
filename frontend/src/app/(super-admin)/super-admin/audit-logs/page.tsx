'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { DataTable } from '@/components/super-admin/DataTable';
import { StatCard } from '@/components/super-admin/StatCard';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  description: string;
  admin_name: string;
  ip_address: string;
  created_at: string;
}

interface Stats {
  total_logs: number;
  today_actions: number;
  unique_admins: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, entityFilter, search, dateFrom, dateTo, pagination.page]);

  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/api/super-admin/audit-logs/stats');
      if (res.data.success) setStats(res.data.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: pagination.page, limit: pagination.limit };
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entity_type = entityFilter;
      if (search) params.search = search;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const res = await apiClient.get('/api/super-admin/audit-logs', { params });
      if (res.data.success) {
        setLogs(res.data.data);
        if (res.data.pagination) setPagination(prev => ({ ...prev, ...res.data.pagination }));
      }
    } catch (err) {
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await apiClient.get('/api/super-admin/audit-logs/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const dateStamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
      link.setAttribute('download', `audit-logs_${dateStamp}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export logs');
    }
  };

  const entityBadge = (entity: string) => {
    const map: Record<string, string> = {
      student: 'bg-blue-100 text-blue-700',
      branch: 'bg-purple-100 text-purple-700',
      course: 'bg-indigo-100 text-indigo-700',
      payment: 'bg-green-100 text-green-700',
      admin: 'bg-orange-100 text-orange-700',
      settings: 'bg-gray-100 text-gray-600',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${map[entity?.toLowerCase()] || 'bg-gray-100 text-gray-600'}`}>{entity}</span>;
  };

  const columns = [
    {
      key: 'action',
      header: 'Action',
      render: (row: AuditLog) => <span className="font-mono text-xs font-medium text-gray-900">{row.action}</span>,
    },
    {
      key: 'entity_type',
      header: 'Entity Type',
      render: (row: AuditLog) => entityBadge(row.entity_type),
    },
    {
      key: 'description',
      header: 'Description',
      render: (row: AuditLog) => (
        <span className="text-xs text-gray-600">{row.description?.length > 80 ? row.description.slice(0, 80) + '...' : row.description}</span>
      ),
    },
    { key: 'admin_name', header: 'Admin' },
    { key: 'ip_address', header: 'IP Address' },
    {
      key: 'created_at',
      header: 'Timestamp',
      render: (row: AuditLog) => (
        <span className="text-xs">{new Date(row.created_at).toLocaleString()}</span>
      ),
    },
  ];

  if (loading && logs.length === 0) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading audit logs...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-64 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Export Logs (CSV)
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Total Logs" value={stats.total_logs} icon="tests" color="blue" />
          <StatCard title="Today's Actions" value={stats.today_actions} icon="tests" color="green" />
          <StatCard title="Unique Admins" value={stats.unique_admins} icon="students" color="purple" />
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="Filter by action..."
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="text"
          placeholder="Filter by entity type..."
          value={entityFilter}
          onChange={e => setEntityFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          title="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          title="To date"
        />
        <input
          type="text"
          placeholder="Search logs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1 min-w-48"
        />
      </div>

      <DataTable columns={columns} data={logs} />

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
              disabled={pagination.page <= 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPagination(p => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
