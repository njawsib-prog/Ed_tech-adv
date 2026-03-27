'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import PageWrapper from '@/components/layout/PageWrapper';

interface Subject {
  id: string;
  name: string;
  modules?: {
    id: string;
    name: string;
    courses?: {
      id: string;
      name: string;
    };
  };
}

interface Material {
  id: string;
  title: string;
  description: string;
  type: 'pdf' | 'video' | 'document' | 'link' | 'text';
  url: string;
  file_size: number;
  is_published: boolean;
  created_at: string;
  subjects: Subject;
  created_by_admin?: {
    id: string;
    name: string;
  };
}

interface MaterialsResponse {
  materials: Material[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface Course {
  id: string;
  name: string;
  modules: { id: string; name: string; subjects: { id: string; name: string }[] }[];
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({
    subjectId: '',
    type: '',
    search: ''
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'pdf',
    subjectId: '',
    url: '',
    content: '',
    isPublished: false
  });

  useEffect(() => {
    fetchCourses();
    fetchMaterials();
  }, [page]);

  useEffect(() => {
    fetchMaterials();
  }, [filters]);

  const fetchCourses = async () => {
    try {
      const response = await apiClient.get('/api/admin/courses');
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '15');
      if (filters.subjectId) params.append('subjectId', filters.subjectId);
      if (filters.type) params.append('type', filters.type);
      if (filters.search) params.append('search', filters.search);

      const response = await apiClient.get<MaterialsResponse>(`/api/admin/materials?${params}`);
      setMaterials(response.data.materials || []);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectChange = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (course) {
      const allSubjects = course.modules.flatMap(m => m.subjects || []);
      setSubjects(allSubjects);
    } else {
      setSubjects([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        subjectId: formData.subjectId,
        url: formData.url || undefined,
        content: formData.content || undefined,
        isPublished: formData.isPublished
      };

      if (editingMaterial) {
        await apiClient.put(`/api/admin/materials/${editingMaterial.id}`, payload);
      } else {
        await apiClient.post('/api/admin/materials', payload);
      }

      setShowModal(false);
      resetForm();
      fetchMaterials();
    } catch (error) {
      console.error('Error saving material:', error);
      alert('Failed to save material');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setFormData({
      title: material.title,
      description: material.description || '',
      type: material.type,
      subjectId: material.subjects?.id || '',
      url: material.url || '',
      content: '',
      isPublished: material.is_published
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return;
    try {
      await apiClient.delete(`/api/admin/materials/${id}`);
      fetchMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
      alert('Failed to delete material');
    }
  };

  const handleTogglePublish = async (id: string) => {
    try {
      await apiClient.patch(`/api/admin/materials/${id}/publish`);
      fetchMaterials();
    } catch (error) {
      console.error('Error toggling publish:', error);
      alert('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'pdf',
      subjectId: '',
      url: '',
      content: '',
      isPublished: false
    });
    setEditingMaterial(null);
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf': return '📄';
      case 'video': return '🎥';
      case 'document': return '📝';
      case 'link': return '🔗';
      case 'text': return '📃';
      default: return '📎';
    }
  };

  return (
    <PageWrapper title="Study Materials">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Study Materials</h1>
            <p className="text-gray-500">Manage learning resources for students</p>
          </div>
          <Button onClick={() => { resetForm(); setShowModal(true); }}>
            + Add Material
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                  placeholder="Search materials..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
                >
                  <option value="">All Types</option>
                  <option value="pdf">PDF</option>
                  <option value="video">Video</option>
                  <option value="document">Document</option>
                  <option value="link">Link</option>
                  <option value="text">Text</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <select
                  value={filters.subjectId}
                  onChange={(e) => setFilters(f => ({ ...f, subjectId: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
                >
                  <option value="">All Subjects</option>
                  {courses.map(course => 
                    course.modules?.map(module => 
                      module.subjects?.map(subject => (
                        <option key={subject.id} value={subject.id}>
                          {course.name} / {module.name} / {subject.name}
                        </option>
                      ))
                    )
                  )}
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => setFilters({ subjectId: '', type: '', search: '' })}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Materials Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : materials.length === 0 ? (
          <Card>
            <div className="p-8 text-center text-gray-500">
              No study materials found. Click &quot;Add Material&quot; to create one.
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.map(material => (
              <Card key={material.id}>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getTypeIcon(material.type)}</span>
                      <Badge variant={material.is_published ? 'success' : 'warning'}>
                        {material.is_published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                    <Badge variant="info">{material.type.toUpperCase()}</Badge>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{material.title}</h3>
                  <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                    {material.description || 'No description'}
                  </p>
                  <div className="text-xs text-gray-400 mb-3">
                    {material.subjects?.modules?.courses?.name} / {material.subjects?.name}
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>{material.file_size ? formatFileSize(material.file_size) : 'No file'}</span>
                    <span>{new Date(material.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(material)}
                      className="flex-1"
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTogglePublish(material.id)}
                      className="flex-1"
                    >
                      {material.is_published ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(material.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </Button>
            <span className="px-4 py-2 text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingMaterial ? 'Edit Material' : 'Add New Material'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(f => ({ ...f, type: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
            >
              <option value="pdf">PDF</option>
              <option value="video">Video</option>
              <option value="document">Document</option>
              <option value="link">External Link</option>
              <option value="text">Text Content</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
            <select
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
            >
              <option value="">Select Course</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <select
              value={formData.subjectId}
              onChange={(e) => setFormData(f => ({ ...f, subjectId: e.target.value }))}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
            >
              <option value="">Select Subject</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </div>

          {(formData.type === 'pdf' || formData.type === 'video' || formData.type === 'document' || formData.type === 'link') && (
            <Input
              label={formData.type === 'link' ? 'URL' : 'File URL'}
              type="url"
              value={formData.url}
              onChange={(e) => setFormData(f => ({ ...f, url: e.target.value }))}
              placeholder={formData.type === 'link' ? 'https://...' : 'File storage URL'}
            />
          )}

          {formData.type === 'text' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(f => ({ ...f, content: e.target.value }))}
                rows={6}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublished"
              checked={formData.isPublished}
              onChange={(e) => setFormData(f => ({ ...f, isPublished: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <label htmlFor="isPublished" className="text-sm text-gray-700">
              Publish immediately
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingMaterial ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </PageWrapper>
  );
}