'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageWrapper from '@/components/layout/PageWrapper';
import { Table, Button, Input, Modal, Badge, Spinner } from '@/components/ui';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/context/ToastContext';

interface Student {
  id: string;
  name: string;
  email: string;
  course_id: string;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
  courses: { name: string } | null;
}

interface Course {
  id: string;
  name: string;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    course_id: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  const router = useRouter();
  const toast = useToast();

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(courseFilter && { course_id: courseFilter }),
      });

      const response = await apiClient.get(`/admin/students?${params}`);
      setStudents(response.data.students || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Failed to fetch students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await apiClient.get('/admin/courses');
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [page, courseFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (page === 1) {
        fetchStudents();
      } else {
        setPage(1);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [search]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      await apiClient.post('/admin/students', formData);
      toast.success('Student created successfully');
      setShowAddModal(false);
      setFormData({ name: '', email: '', password: '', course_id: '' });
      fetchStudents();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create student');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    setFormLoading(true);

    try {
      await apiClient.delete(`/admin/students/${selectedStudent.id}`);
      toast.success('Student deactivated successfully');
      setShowDeleteModal(false);
      setSelectedStudent(null);
      fetchStudents();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to deactivate student');
    } finally {
      setFormLoading(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (student: Student) => (
        <span className="font-medium text-gray-900">{student.name}</span>
      ),
    },
    {
      key: 'email',
      label: 'Email',
    },
    {
      key: 'course',
      label: 'Course',
      render: (student: Student) => student.courses?.name || '-',
    },
    {
      key: 'status',
      label: 'Status',
      render: (student: Student) => (
        <Badge variant={student.is_active ? 'success' : 'danger'}>
          {student.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'last_login',
      label: 'Last Login',
      render: (student: Student) =>
        student.last_login ? new Date(student.last_login).toLocaleDateString() : 'Never',
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (student: Student) => (
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/admin/students/${student.id}`)}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              setSelectedStudent(student);
              setShowDeleteModal(true);
            }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageWrapper
        title="Student Management"
        actions={
          <Button onClick={() => setShowAddModal(true)}>Add Student</Button>
        }
      >
        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
            >
              <option value="">All Courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          data={students}
          loading={loading}
          emptyMessage="No students found"
        />

        {/* Pagination */}
        {total > 20 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} students
            </p>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * 20 >= total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Add Student Modal */}
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add New Student"
          size="md"
        >
          <form onSubmit={handleAddStudent}>
            <div className="space-y-4">
              <Input
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  value={formData.course_id}
                  onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                  required
                >
                  <option value="">Select Course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={formLoading}>
                Add Student
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Confirm Deactivation"
          size="sm"
        >
          <p className="text-gray-600 mb-4">
            Are you sure you want to deactivate <strong>{selectedStudent?.name}</strong>? Their results will be preserved.
          </p>
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteStudent} loading={formLoading}>
              Deactivate
            </Button>
          </div>
        </Modal>
      </PageWrapper>
  );
}