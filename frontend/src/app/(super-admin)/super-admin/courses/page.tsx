'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { DataTable } from '@/components/super-admin/DataTable';
import { Modal } from '@/components/ui';

interface Course {
  id: string;
  name: string;
  description: string;
  branch_name: string;
  branch_id: string;
  level: string;
  price: number;
  duration_weeks: number;
  is_active: boolean;
  thumbnail_url?: string;
}

interface Branch {
  id: string;
  name: string;
}

interface CourseForm {
  name: string;
  description: string;
  branch_id: string;
  level: string;
  price: string;
  duration_weeks: string;
  thumbnail_url: string;
}

const defaultForm: CourseForm = {
  name: '', description: '', branch_id: '', level: 'beginner', price: '', duration_weeks: '', thumbnail_url: '',
};

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState<CourseForm>(defaultForm);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [branchFilter, statusFilter, levelFilter, search]);

  const fetchBranches = async () => {
    try {
      const res = await apiClient.get('/super-admin/branches');
      if (res.data.success) setBranches(res.data.data);
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  };

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (branchFilter) params.branch_id = branchFilter;
      if (statusFilter) params.status = statusFilter;
      if (levelFilter) params.level = levelFilter;
      if (search) params.search = search;
      const res = await apiClient.get('/super-admin/courses', { params });
      if (res.data.success) setCourses(res.data.data);
    } catch (err) {
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        duration_weeks: Number(formData.duration_weeks),
      };
      const res = selectedCourse
        ? await apiClient.put(`/super-admin/courses/${selectedCourse.id}`, payload)
        : await apiClient.post('/super-admin/courses', payload);
      if (res.data.success) {
        setIsModalOpen(false);
        setSelectedCourse(null);
        setFormData(defaultForm);
        fetchCourses();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save course');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      const res = await apiClient.delete(`/super-admin/courses/${id}`);
      if (res.data.success) setCourses(courses.filter(c => c.id !== id));
    } catch (err) {
      alert('Failed to delete course');
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const res = await apiClient.put(`/super-admin/courses/${id}/toggle-status`);
      if (res.data.success) {
        setCourses(courses.map(c => c.id === id ? { ...c, is_active: res.data.data.is_active } : c));
      }
    } catch (err) {
      alert('Failed to toggle status');
    }
  };

  const levelBadge = (level: string) => {
    const map: Record<string, string> = {
      beginner: 'bg-green-100 text-green-700',
      intermediate: 'bg-yellow-100 text-yellow-700',
      advanced: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${map[level] || 'bg-gray-100 text-gray-600'}`}>
        {level}
      </span>
    );
  };

  const columns = [
    {
      key: 'name',
      header: 'Name / Description',
      render: (row: Course) => (
        <div className="max-w-xs">
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="text-xs text-gray-500 truncate">{row.description}</p>
        </div>
      ),
    },
    { key: 'branch_name', header: 'Branch' },
    {
      key: 'level',
      header: 'Level',
      render: (row: Course) => levelBadge(row.level),
    },
    {
      key: 'price',
      header: 'Price',
      render: (row: Course) => `₹${Number(row.price).toLocaleString()}`,
    },
    {
      key: 'duration_weeks',
      header: 'Duration',
      render: (row: Course) => `${row.duration_weeks} weeks`,
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (row: Course) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${row.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: Course) => (
        <div className="flex space-x-2">
          <button
            onClick={() => { setSelectedCourse(row); setFormData({ name: row.name, description: row.description, branch_id: row.branch_id, level: row.level, price: String(row.price), duration_weeks: String(row.duration_weeks), thumbnail_url: row.thumbnail_url || '' }); setIsModalOpen(true); }}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => handleToggleStatus(row.id)}
            className="px-3 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
          >
            {row.is_active ? 'Deactivate' : 'Activate'}
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

  if (loading && courses.length === 0) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading courses...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-64 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
        <button
          onClick={() => { setSelectedCourse(null); setFormData(defaultForm); setIsModalOpen(true); }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Add New Course
        </button>
      </div>

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
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={levelFilter}
          onChange={e => setLevelFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <input
          type="text"
          placeholder="Search courses..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1 min-w-48"
        />
      </div>

      <DataTable columns={columns} data={courses} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedCourse ? 'Edit Course' : 'Add New Course'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course Name</label>
            <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
            <select value={formData.branch_id} onChange={e => setFormData({ ...formData, branch_id: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required>
              <option value="">Select Branch</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              <select value={formData.level} onChange={e => setFormData({ ...formData, level: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
              <input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required min="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (weeks)</label>
              <input type="number" value={formData.duration_weeks} onChange={e => setFormData({ ...formData, duration_weeks: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required min="1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail URL</label>
              <input type="text" value={formData.thumbnail_url} onChange={e => setFormData({ ...formData, thumbnail_url: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">{selectedCourse ? 'Update' : 'Create'} Course</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
