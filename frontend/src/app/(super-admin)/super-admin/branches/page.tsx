'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { DataTable } from '@/components/super-admin/DataTable';
import { Modal } from '@/components/ui';

interface Branch {
  id: string;
  name: string;
  location: string;
  contact_number: string;
  is_active: boolean;
  active_students: number;
  total_students: number;
  total_revenue: number;
  created_at: string;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    contact_number: '',
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await apiClient.get('/api/super-admin/branches');
      if (res.data.success) {
        setBranches(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const res = await apiClient.put(`/api/super-admin/branches/${id}/toggle-status`);
      if (res.data.success) {
        setBranches(branches.map(b =>
          b.id === id ? { ...b, is_active: res.data.data.is_active } : b
        ));
      }
    } catch (error) {
      console.error('Error toggling branch status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this branch?')) return;

    try {
      const res = await apiClient.delete(`/api/super-admin/branches/${id}`);
      if (res.data.success) {
        setBranches(branches.filter(b => b.id !== id));
      }
    } catch (error) {
      console.error('Error deleting branch:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const endpoint = selectedBranch
        ? `/api/super-admin/branches/${selectedBranch.id}`
        : '/api/super-admin/branches';
      const method = selectedBranch ? 'put' : 'post';

      const res = await apiClient[method](endpoint, formData);
      if (res.data.success) {
        fetchBranches();
        setIsModalOpen(false);
        setSelectedBranch(null);
        setFormData({ name: '', location: '', contact_number: '' });
      }
    } catch (error) {
      console.error('Error saving branch:', error);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row: Branch) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="text-sm text-gray-500">{row.location}</p>
        </div>
      ),
    },
    {
      key: 'contact_number',
      header: 'Contact',
    },
    {
      key: 'active_students',
      header: 'Active Students',
      render: (row: Branch) => (
        <span className="px-2 py-1 text-sm font-medium text-green-700 bg-green-100 rounded-full">
          {row.active_students}
        </span>
      ),
    },
    {
      key: 'total_revenue',
      header: 'Revenue',
      render: (row: Branch) => `$${row.total_revenue.toLocaleString()}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Branch) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            row.is_active
              ? 'text-green-700 bg-green-100'
              : 'text-red-700 bg-red-100'
          }`}
        >
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: Branch) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleToggleStatus(row.id)}
            className="text-indigo-600 hover:text-indigo-900"
            title={row.is_active ? 'Deactivate' : 'Activate'}
          >
            {row.is_active ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          <button
            onClick={() => {
              setSelectedBranch(row);
              setFormData({
                name: row.name,
                location: row.location,
                contact_number: row.contact_number,
              });
              setIsModalOpen(true);
            }}
            className="text-blue-600 hover:text-blue-900"
            title="Edit"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="text-red-600 hover:text-red-900"
            title="Delete"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ),
    },
  ];

  const filteredBranches = branches.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.location?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading branches...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branch Management</h1>
          <p className="text-gray-600">Manage all branches across the platform</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Add New Branch
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search branches..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <svg
          className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Table */}
      <DataTable columns={columns} data={filteredBranches} />

      {/* Modal */}
      {isModalOpen && (
        <Modal onClose={() => setIsModalOpen(false)} title={selectedBranch ? 'Edit Branch' : 'Add Branch'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
              <input
                type="tel"
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {selectedBranch ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
