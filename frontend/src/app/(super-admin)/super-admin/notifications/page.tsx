'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { DataTable } from '@/components/super-admin/DataTable';
import { Modal } from '@/components/ui';

interface Notification {
  id: string;
  title: string;
  message: string;
  target_type: string;
  branch_name?: string;
  priority: string;
  scheduled_at?: string;
  created_at: string;
}

interface Branch {
  id: string;
  name: string;
}

interface NotifForm {
  title: string;
  message: string;
  target_type: string;
  branch_id: string;
  priority: string;
  scheduled_at: string;
}

const defaultForm: NotifForm = {
  title: '', message: '', target_type: 'all', branch_id: '', priority: 'normal', scheduled_at: '',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<NotifForm>(defaultForm);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [notifRes, branchRes] = await Promise.all([
        apiClient.get('/super-admin/notifications'),
        apiClient.get('/super-admin/branches'),
      ]);
      if (notifRes.data.success) setNotifications(notifRes.data.data);
      if (branchRes.data.success) setBranches(branchRes.data.data);
    } catch (err) {
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const payload: Record<string, any> = { ...formData };
      if (!payload.scheduled_at) delete payload.scheduled_at;
      if (payload.target_type !== 'branches' || !payload.branch_id) delete payload.branch_id;
      const res = await apiClient.post('/super-admin/notifications', payload);
      if (res.data.success) {
        setIsModalOpen(false);
        setFormData(defaultForm);
        fetchAll();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create notification');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this notification?')) return;
    try {
      const res = await apiClient.delete(`/super-admin/notifications/${id}`);
      if (res.data.success) setNotifications(notifications.filter(n => n.id !== id));
    } catch (err) {
      alert('Failed to delete notification');
    }
  };

  const priorityBadge = (priority: string) => {
    const map: Record<string, string> = {
      low: 'bg-gray-100 text-gray-600',
      normal: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${map[priority] || 'bg-gray-100 text-gray-600'}`}>
        {priority}
      </span>
    );
  };

  const columns = [
    {
      key: 'title',
      header: 'Title',
      render: (row: Notification) => <span className="font-medium">{row.title}</span>,
    },
    {
      key: 'message',
      header: 'Message',
      render: (row: Notification) => (
        <span className="text-gray-600 text-xs">{row.message.length > 60 ? row.message.slice(0, 60) + '...' : row.message}</span>
      ),
    },
    {
      key: 'target_type',
      header: 'Target',
      render: (row: Notification) => (
        <span className="capitalize">{row.target_type}{row.branch_name ? ` - ${row.branch_name}` : ''}</span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row: Notification) => priorityBadge(row.priority),
    },
    {
      key: 'date',
      header: 'Date',
      render: (row: Notification) => new Date(row.scheduled_at || row.created_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: Notification) => (
        <button
          onClick={() => handleDelete(row.id)}
          className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Delete
        </button>
      ),
    },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading notifications...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-64 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Create Notification
        </button>
      </div>

      <DataTable columns={columns} data={notifications} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Notification" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} rows={4} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Type</label>
              <select value={formData.target_type} onChange={e => setFormData({ ...formData, target_type: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="all">All</option>
                <option value="branches">Branches</option>
                <option value="admins">Admins</option>
                <option value="students">Students</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          {formData.target_type === 'branches' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <select value={formData.branch_id} onChange={e => setFormData({ ...formData, branch_id: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">All Branches</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Schedule At (optional)</label>
            <input type="datetime-local" value={formData.scheduled_at} onChange={e => setFormData({ ...formData, scheduled_at: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Create</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
