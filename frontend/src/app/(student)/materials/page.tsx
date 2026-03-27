'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/apiClient';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import PageWrapper from '@/components/layout/PageWrapper';

interface Subject {
  id: string;
  name: string;
  modules?: {
    name: string;
    courses?: {
      name: string;
    };
  };
}

interface Material {
  id: string;
  title: string;
  description: string;
  type: 'pdf' | 'video' | 'document' | 'link' | 'text';
  file_url: string;
  file_size: number;
  created_at: string;
  subjects: Subject;
  viewedAt?: string;
}

export default function StudyMaterialsPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [recentMaterials, setRecentMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ subjectId: '', type: '', search: '' });
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchMaterials();
    fetchRecentMaterials();
  }, [filters]);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.subjectId) params.append('subjectId', filters.subjectId);
      if (filters.type) params.append('type', filters.type);
      if (filters.search) params.append('search', filters.search);

      const response = await apiClient.get(`/api/student/materials?${params}`);
      setMaterials(response.data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentMaterials = async () => {
    try {
      const response = await apiClient.get('/api/student/materials/recent');
      setRecentMaterials(response.data || []);
    } catch (error) {
      console.error('Error fetching recent materials:', error);
    }
  };

  const openMaterial = async (material: Material) => {
    setSelectedMaterial(material);
    setShowModal(true);

    // Log the view
    try {
      await apiClient.get(`/api/student/materials/${material.id}`);
    } catch (error) {
      console.error('Error logging material view:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <PageWrapper title="Study Materials">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Study Materials</h1>
          <p className="text-gray-500">Access learning resources and study materials</p>
        </div>

        {/* Filters */}
        <Card>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                  placeholder="Search materials..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
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

        {/* Recently Viewed */}
        {recentMaterials.length > 0 && (
          <Card>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Recently Viewed</h3>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {recentMaterials.slice(0, 5).map(material => (
                  <div
                    key={material.id}
                    onClick={() => openMaterial(material)}
                    className="flex-shrink-0 w-48 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                  >
                    <div className="text-2xl mb-2">{getTypeIcon(material.type)}</div>
                    <p className="font-medium text-sm truncate">{material.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{material.subjects?.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Materials Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : materials.length === 0 ? (
          <Card>
            <div className="p-8 text-center text-gray-500">
              No study materials found.
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {materials.map(material => (
              <Card key={material.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <div className="p-4" onClick={() => openMaterial(material)}>
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-3xl">{getTypeIcon(material.type)}</span>
                    <Badge variant="info">{material.type.toUpperCase()}</Badge>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{material.title}</h3>
                  <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                    {material.description || 'No description'}
                  </p>
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>{material.subjects?.name || 'General'}</span>
                    {material.file_size && <span>{formatFileSize(material.file_size)}</span>}
                  </div>
                  <div className="mt-3 text-xs text-gray-400">
                    Added: {formatDate(material.created_at)}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Material Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setSelectedMaterial(null); }}
        title={selectedMaterial?.title || 'Material'}
        size="lg"
      >
        {selectedMaterial && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl">{getTypeIcon(selectedMaterial.type)}</span>
              <Badge variant="info">{selectedMaterial.type.toUpperCase()}</Badge>
              {selectedMaterial.file_size && (
                <span className="text-sm text-gray-500">{formatFileSize(selectedMaterial.file_size)}</span>
              )}
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">{selectedMaterial.description || 'No description available'}</p>
              <p className="text-xs text-gray-400 mt-2">
                Subject: {selectedMaterial.subjects?.name || 'General'}
              </p>
            </div>

            {(selectedMaterial.type === 'pdf' || selectedMaterial.type === 'document' || selectedMaterial.type === 'link') && selectedMaterial.file_url && (
              <div className="space-y-3">
                <a
                  href={selectedMaterial.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full"
                >
                  <Button className="w-full">
                    {selectedMaterial.type === 'link' ? 'Open Link' : 'Download File'}
                  </Button>
                </a>
              </div>
            )}

            {selectedMaterial.type === 'video' && selectedMaterial.file_url && (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <iframe
                  src={selectedMaterial.file_url}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            {selectedMaterial.type === 'text' && (
              <div className="prose max-w-none p-4 bg-gray-50 rounded-lg">
                <p className="whitespace-pre-wrap">Content would be displayed here from the server.</p>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={() => { setShowModal(false); setSelectedMaterial(null); }}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}