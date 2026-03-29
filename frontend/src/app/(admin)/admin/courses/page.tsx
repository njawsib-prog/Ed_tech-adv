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
  title?: string;
  description?: string;
  price?: number;
  duration_value?: number;
  duration_unit?: string;
  start_date?: string;
  end_date?: string;
  last_enrollment_date?: string;
  thumbnail?: string;
  instructor?: string;
  terms_and_conditions?: string;
  category?: string;
  level?: string;
  status?: string;
  is_active: boolean;
  is_published?: boolean;
  student_count: number;
  test_count: number;
  material_count: number;
  modules?: Module[];
}

const EMPTY_FORM = {
  name: '',
  title: '',
  description: '',
  price: '',
  duration_value: '',
  duration_unit: 'months',
  start_date: '',
  end_date: '',
  last_enrollment_date: '',
  thumbnail: '',
  instructor: '',
  terms_and_conditions: '',
  category: '',
  level: '',
  status: 'active',
};

type CourseForm = typeof EMPTY_FORM;

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [modules, setModules] = useState<Module[]>([]);

  const [formData, setFormData] = useState<CourseForm>(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);

  const toast = useToast();

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<{ courses: Course[] }>('/admin/courses');
      setCourses(response.data.courses || []);
    } catch {
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
    } catch {
      console.error('Failed to fetch modules');
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await apiClient.post('/admin/courses', {
        ...formData,
        price: formData.price ? Number(formData.price) : undefined,
        duration_value: formData.duration_value ? Number(formData.duration_value) : undefined,
      });
      toast.success('Course created successfully');
      setShowModal(false);
      setFormData(EMPTY_FORM);
      fetchCourses();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to create course');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    setFormLoading(true);
    try {
      await apiClient.put(`/admin/courses/${selectedCourse.id}`, {
        ...formData,
        price: formData.price ? Number(formData.price) : undefined,
        duration_value: formData.duration_value ? Number(formData.duration_value) : undefined,
      });
      toast.success('Course updated successfully');
      setShowEditModal(false);
      setSelectedCourse(null);
      setFormData(EMPTY_FORM);
      fetchCourses();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to update course');
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
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to delete course');
    } finally {
      setFormLoading(false);
    }
  };

  const openEdit = (course: Course) => {
    setSelectedCourse(course);
    setFormData({
      name: course.name,
      title: course.title ?? course.name,
      description: course.description ?? '',
      price: course.price !== undefined ? String(course.price) : '',
      duration_value: course.duration_value !== undefined ? String(course.duration_value) : '',
      duration_unit: course.duration_unit ?? 'months',
      start_date: course.start_date ?? '',
      end_date: course.end_date ?? '',
      last_enrollment_date: course.last_enrollment_date ?? '',
      thumbnail: course.thumbnail ?? '',
      instructor: course.instructor ?? '',
      terms_and_conditions: course.terms_and_conditions ?? '',
      category: course.category ?? '',
      level: course.level ?? '',
      status: course.status ?? (course.is_active ? 'active' : 'inactive'),
    });
    setShowEditModal(true);
  };

  const handleToggleExpand = (courseId: string) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
    } else {
      setExpandedCourse(courseId);
      fetchModules(courseId);
    }
  };

  const statusVariant = (c: Course): 'success' | 'danger' | 'warning' => {
    if (c.status === 'active' || c.is_active) return 'success';
    if (c.status === 'draft') return 'warning';
    return 'danger';
  };

  const CourseFormFields = () => (
    <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
      {/* Title / Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Course Title <span className="text-red-500">*</span>
          </label>
          <Input name="title" value={formData.title} onChange={handleChange} placeholder="e.g. Full Stack Web Development" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Instructor</label>
          <Input name="instructor" value={formData.instructor} onChange={handleChange} placeholder="Instructor name" />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          name="description"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          value={formData.description}
          onChange={handleChange}
          placeholder="Course description..."
        />
      </div>

      {/* Price + Duration */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price (PKR)</label>
          <Input name="price" type="number" min="0" value={formData.price} onChange={handleChange} placeholder="0" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
          <Input name="duration_value" type="number" min="0" value={formData.duration_value} onChange={handleChange} placeholder="e.g. 6" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
          <select name="duration_unit" value={formData.duration_unit} onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="days">Days</option>
            <option value="weeks">Weeks</option>
            <option value="months">Months</option>
            <option value="years">Years</option>
          </select>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <Input name="start_date" type="date" value={formData.start_date} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <Input name="end_date" type="date" value={formData.end_date} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Enrollment Date</label>
          <Input name="last_enrollment_date" type="date" value={formData.last_enrollment_date} onChange={handleChange} />
        </div>
      </div>

      {/* Category + Level + Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <Input name="category" value={formData.category} onChange={handleChange} placeholder="e.g. Programming" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
          <select name="level" value={formData.level} onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Any level</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="expert">Expert</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select name="status" value={formData.status} onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Thumbnail URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail URL</label>
        <Input name="thumbnail" value={formData.thumbnail} onChange={handleChange} placeholder="https://example.com/image.png" />
      </div>

      {/* Terms & Conditions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Terms &amp; Conditions</label>
        <textarea
          name="terms_and_conditions"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
          value={formData.terms_and_conditions}
          onChange={handleChange}
          placeholder="Enter course terms and conditions..."
        />
      </div>
    </div>
  );

  return (
    <PageWrapper
      title="Course Management"
      actions={<Button onClick={() => { setFormData(EMPTY_FORM); setShowModal(true); }}>Create Course</Button>}
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
              {/* Thumbnail */}
              {course.thumbnail && (
                <img
                  src={course.thumbnail}
                  alt={course.title || course.name}
                  className="w-full h-36 object-cover rounded-t-xl mb-3 -mt-4 -mx-4"
                  style={{ width: 'calc(100% + 2rem)' }}
                />
              )}

              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 truncate">
                    {course.title || course.name}
                  </h3>
                  {course.instructor && (
                    <p className="text-xs text-gray-500">👤 {course.instructor}</p>
                  )}
                  {course.category && (
                    <p className="text-xs text-blue-600 mt-0.5">{course.category}</p>
                  )}
                </div>
                <Badge variant={statusVariant(course)} className="ml-2 shrink-0">
                  {course.status ?? (course.is_active ? 'active' : 'inactive')}
                </Badge>
              </div>

              {course.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{course.description}</p>
              )}

              {/* Meta row */}
              <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                {course.price !== undefined && (
                  <span className="font-medium text-green-700">PKR {course.price.toLocaleString()}</span>
                )}
                {course.duration_value && (
                  <span>{course.duration_value} {course.duration_unit}</span>
                )}
                {course.level && (
                  <span className="capitalize bg-gray-100 px-2 py-0.5 rounded">{course.level}</span>
                )}
              </div>

              {/* Date info */}
              {(course.start_date || course.end_date) && (
                <div className="text-xs text-gray-400 mb-3">
                  {course.start_date && <span>From: {new Date(course.start_date).toLocaleDateString()}</span>}
                  {course.start_date && course.end_date && <span className="mx-1">→</span>}
                  {course.end_date && <span>To: {new Date(course.end_date).toLocaleDateString()}</span>}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'Students', val: course.student_count },
                  { label: 'Tests', val: course.test_count },
                  { label: 'Materials', val: course.material_count },
                ].map(({ label, val }) => (
                  <div key={label} className="text-center p-2 bg-gray-50 rounded">
                    <p className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>{val}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <Button size="sm" variant="outline" onClick={() => handleToggleExpand(course.id)}>
                  {expandedCourse === course.id ? 'Hide Modules' : 'View Modules'}
                </Button>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(course)}>Edit</Button>
                  <Button size="sm" variant="danger" onClick={() => { setSelectedCourse(course); setShowDeleteModal(true); }}>Delete</Button>
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
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create New Course" size="lg">
        <form onSubmit={handleCreateCourse}>
          <CourseFormFields />
          <div className="mt-6 flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={formLoading}>Create Course</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Course Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Course" size="lg">
        <form onSubmit={handleUpdateCourse}>
          <CourseFormFields />
          <div className="mt-6 flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button type="submit" loading={formLoading}>Update Course</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Course Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Course" size="sm">
        <p className="text-gray-600 mb-4">
          Are you sure you want to delete <strong>{selectedCourse?.title || selectedCourse?.name}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteCourse} loading={formLoading}>Delete</Button>
        </div>
      </Modal>
    </PageWrapper>
  );
}
