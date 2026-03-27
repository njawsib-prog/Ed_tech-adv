'use client';

import { useEffect, useState } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { Card, Button, Modal, Input, Badge, Spinner } from '@/components/ui';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/context/ToastContext';

interface Subject {
  id: string;
  name: string;
  order_index: number;
}

interface Module {
  id: string;
  name: string;
  order_index: number;
  subjects: Subject[];
}

interface Course {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  student_count: number;
  test_count: number;
  material_count: number;
  modules?: Module[];
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [modules, setModules] = useState<Module[]>([]);

  const [formData, setFormData] = useState({ name: '', description: '' });
  const [formLoading, setFormLoading] = useState(false);

  const toast = useToast();

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/admin/courses');
      setCourses(response.data || []);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchModules = async (courseId: string) => {
    try {
      const response = await apiClient.get(`/admin/courses/${courseId}/modules`);
      setModules(response.data || []);
    } catch (error) {
      console.error('Failed to fetch modules:', error);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      await apiClient.post('/admin/courses', formData);
      toast.success('Course created successfully');
      setShowModal(false);
      setFormData({ name: '', description: '' });
      fetchCourses();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create course');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    setFormLoading(true);

    try {
      await apiClient.put(`/admin/courses/${selectedCourse.id}`, formData);
      toast.success('Course updated successfully');
      setShowEditModal(false);
      setSelectedCourse(null);
      setFormData({ name: '', description: '' });
      fetchCourses();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update course');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!selectedCourse) return;
    setFormLoading(true);

    try {
      await apiClient.delete(`/admin/courses/${selectedCourse.id}`);
      toast.success('Course deleted successfully');
      setShowDeleteModal(false);
      setSelectedCourse(null);
      fetchCourses();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete course');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleExpand = (courseId: string) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
    } else {
      setExpandedCourse(courseId);
      fetchModules(courseId);
    }
  };

  return (
    <PageWrapper
        title="Course Management"
        actions={<Button onClick={() => setShowModal(true)}>Create Course</Button>}
      >
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Spinner size="lg" />
          </div>
        ) : courses.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No courses found</p>
              <Button onClick={() => setShowModal(true)}>Create Your First Course</Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <Card key={course.id} className="relative">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{course.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{course.description || 'No description'}</p>
                  </div>
                  <Badge variant={course.is_active ? 'success' : 'danger'}>
                    {course.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
                      {course.student_count}
                    </p>
                    <p className="text-xs text-gray-500">Students</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
                      {course.test_count}
                    </p>
                    <p className="text-xs text-gray-500">Tests</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
                      {course.material_count}
                    </p>
                    <p className="text-xs text-gray-500">Materials</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleExpand(course.id)}
                  >
                    {expandedCourse === course.id ? 'Hide Modules' : 'View Modules'}
                  </Button>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedCourse(course);
                        setFormData({ name: course.name, description: course.description || '' });
                        setShowEditModal(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        setSelectedCourse(course);
                        setShowDeleteModal(true);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {expandedCourse === course.id && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Modules</h4>
                    {modules.length === 0 ? (
                      <p className="text-sm text-gray-500">No modules yet</p>
                    ) : (
                      <div className="space-y-2">
                        {modules.map((module) => (
                          <div key={module.id} className="p-2 bg-gray-50 rounded">
                            <p className="font-medium text-sm">{module.name}</p>
                            {module.subjects && module.subjects.length > 0 && (
                              <div className="mt-1 pl-3 text-xs text-gray-500">
                                {module.subjects.map((s) => s.name).join(', ')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Create Course Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Create New Course"
          size="md"
        >
          <form onSubmit={handleCreateCourse}>
            <div className="space-y-4">
              <Input
                label="Course Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" loading={formLoading}>Create Course</Button>
            </div>
          </form>
        </Modal>

        {/* Edit Course Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Course"
          size="md"
        >
          <form onSubmit={handleUpdateCourse}>
            <div className="space-y-4">
              <Input
                label="Course Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button type="submit" loading={formLoading}>Update Course</Button>
            </div>
          </form>
        </Modal>

        {/* Delete Course Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Course"
          size="sm"
        >
          <p className="text-gray-600 mb-4">
            Are you sure you want to delete <strong>{selectedCourse?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteCourse} loading={formLoading}>Delete</Button>
          </div>
        </Modal>
      </PageWrapper>
  );
}