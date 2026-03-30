'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { DataTable } from '@/components/super-admin/DataTable';
import { StatCard } from '@/components/super-admin/StatCard';
import { Modal } from '@/components/ui';

interface Student {
  id: string;
  name: string;
  email: string;
  roll_number: string;
  branch_name: string;
  course_name: string;
  status: string;
  phone?: string;
  branch_id?: string;
}

interface Branch {
  id: string;
  name: string;
}

interface StudentForm {
  name: string;
  email: string;
  password: string;
  phone: string;
  branch_id: string;
  roll_number: string;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isAddModal, setIsAddModal] = useState(false);
  const [isStatusModal, setIsStatusModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [newStatus, setNewStatus] = useState('ACTIVE');
  const [formData, setFormData] = useState<StudentForm>({
    name: '', email: '', password: '', phone: '', branch_id: '', roll_number: '',
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [branchFilter, statusFilter, search]);

  const fetchBranches = async () => {
    try {
      const res = await apiClient.get('/api/super-admin/branches');
      if (res.data.success) setBranches(res.data.data);
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (branchFilter) params.branch_id = branchFilter;
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const res = await apiClient.get('/api/super-admin/students', { params });
      if (res.data.success) setStudents(res.data.data);
    } catch (err) {
      setError('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const res = await apiClient.post('/api/super-admin/students', formData);
      if (res.data.success) {
        setIsAddModal(false);
        setFormData({ name: '', email: '', password: '', phone: '', branch_id: '', roll_number: '' });
        fetchStudents();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to add student');
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedStudent) return;
    try {
      const res = await apiClient.put(`/api/super-admin/students/${selectedStudent.id}/status`, { status: newStatus });
      if (res.data.success) {
        setStudents(students.map(s => s.id === selectedStudent.id ? { ...s, status: newStatus } : s));
        setIsStatusModal(false);
        setSelectedStudent(null);
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    try {
      const res = await apiClient.delete(`/api/super-admin/students/${id}`);
      if (res.data.success) {
        setStudents(students.filter(s => s.id !== id));
      }
    } catch (err) {
      alert('Failed to delete student');
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-700',
      SUSPENDED: 'bg-red-100 text-red-700',
      INACTIVE: 'bg-gray-100 text-gray-600',
      DEACTIVATED: 'bg-orange-100 text-orange-700',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${map[status] || 'bg-gray-100 text-gray-600'}`}>
        {status}
      </span>
    );
  };

  const activeCount = students.filter(s => s.status === 'ACTIVE').length;
  const suspendedCount = students.filter(s => s.status === 'SUSPENDED').length;

  const columns = [
    {
      key: 'name',
      header: 'Name / Email',
      render: (row: Student) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="text-xs text-gray-500">{row.email}</p>
        </div>
      ),
    },
    { key: 'roll_number', header: 'Roll Number' },
    { key: 'branch_name', header: 'Branch' },
    { key: 'course_name', header: 'Course' },
    {
      key: 'status',
      header: 'Status',
      render: (row: Student) => statusBadge(row.status),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: Student) => (
        <div className="flex space-x-2">
          <a
            href={`/super-admin/students/${row.id}`}
            className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
          >
            View
          </a>
          <button
            onClick={() => { setSelectedStudent(row); setNewStatus(row.status); setIsStatusModal(true); }}
            className="px-3 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
          >
            Status
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  if (loading && students.length === 0) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading students...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-64 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Students</h1>
        <button
          onClick={() => setIsAddModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Add New Student
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Students" value={students.length} icon="students" color="blue" />
        <StatCard title="Active" value={activeCount} icon="students" color="green" />
        <StatCard title="Suspended" value={suspendedCount} icon="students" color="orange" />
        <StatCard title="Inactive" value={students.filter(s => s.status !== 'ACTIVE' && s.status !== 'SUSPENDED').length} icon="students" color="purple" />
      </div>

      <div className="flex flex-wrap gap-4">
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
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <input
          type="text"
          placeholder="Search students..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1 min-w-48"
        />
      </div>

      <DataTable columns={columns} data={students} />

      <Modal isOpen={isAddModal} onClose={() => setIsAddModal(false)} title="Add New Student" size="lg">
        <form onSubmit={handleAddStudent} className="space-y-4">
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          {[
            { label: 'Full Name', key: 'name', type: 'text' },
            { label: 'Email', key: 'email', type: 'email' },
            { label: 'Password', key: 'password', type: 'password' },
            { label: 'Phone', key: 'phone', type: 'text' },
            { label: 'Roll Number', key: 'roll_number', type: 'text' },
          ].map(field => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
              <input
                type={field.type}
                value={formData[field.key as keyof StudentForm]}
                onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
            <select
              value={formData.branch_id}
              onChange={e => setFormData({ ...formData, branch_id: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">Select Branch</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={() => setIsAddModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              Add Student
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isStatusModal} onClose={() => setIsStatusModal(false)} title="Update Student Status" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Update status for <strong>{selectedStudent?.name}</strong></p>
          <select
            value={newStatus}
            onChange={e => setNewStatus(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="INACTIVE">Inactive</option>
            <option value="DEACTIVATED">Deactivated</option>
          </select>
          <div className="flex justify-end space-x-3">
            <button onClick={() => setIsStatusModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleUpdateStatus} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              Update
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
