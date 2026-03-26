'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import PageWrapper from '@/components/layout/PageWrapper';

interface ComplaintReply {
  id: string;
  message: string;
  created_at: string;
}

interface Complaint {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
  complaint_replies?: ComplaintReply[];
}

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'academic',
    priority: 'medium'
  });

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/student/complaints');
      setComplaints(response.data || []);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.post('/api/student/complaints', formData);
      setShowModal(false);
      resetForm();
      fetchComplaints();
    } catch (error) {
      console.error('Error submitting complaint:', error);
      alert('Failed to submit complaint');
    } finally {
      setSaving(false);
    }
  };

  const viewComplaint = async (id: string) => {
    try {
      const response = await apiClient.get(`/api/student/complaints/${id}`);
      setSelectedComplaint(response.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching complaint:', error);
      alert('Failed to load complaint');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'academic',
      priority: 'medium'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'danger';
      case 'in_progress': return 'warning';
      case 'resolved': return 'success';
      case 'closed': return 'info';
      default: return 'info';
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
    <PageWrapper title="Complaints">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Complaints</h1>
            <p className="text-gray-500">Submit and track your complaints and grievances</p>
          </div>
          <Button onClick={() => { resetForm(); setShowModal(true); }}>
            + New Complaint
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {['open', 'in_progress', 'resolved', 'closed'].map(status => (
            <Card key={status}>
              <div className="p-4 text-center">
                <p className="text-2xl font-bold">
                  {complaints.filter(c => c.status === status).length}
                </p>
                <p className="text-sm text-gray-500 capitalize">
                  {status.replace('_', ' ')}
                </p>
              </div>
            </Card>
          ))}
        </div>

        {/* Complaints List */}
        <Card>
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : complaints.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No complaints submitted yet. Click "New Complaint" to submit one.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {complaints.map(complaint => (
                <div
                  key={complaint.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => viewComplaint(complaint.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getStatusColor(complaint.status)}>
                          {complaint.status.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-gray-400 capitalize">{complaint.category}</span>
                      </div>
                      <h3 className="font-medium text-gray-900">{complaint.title}</h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">{complaint.description}</p>
                      <p className="text-xs text-gray-400 mt-2">{formatDate(complaint.created_at)}</p>
                    </div>
                    <Button size="sm" variant="outline">View</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* New Complaint Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title="Submit New Complaint">
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
              rows={4}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
              placeholder="Describe your complaint in detail..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(f => ({ ...f, category: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
              >
                <option value="academic">Academic</option>
                <option value="technical">Technical</option>
                <option value="administrative">Administrative</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(f => ({ ...f, priority: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Submitting...' : 'Submit Complaint'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedComplaint(null); }}
        title={selectedComplaint?.title || 'Complaint Details'}
        size="lg"
      >
        {selectedComplaint && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={getStatusColor(selectedComplaint.status)}>
                {selectedComplaint.status.replace('_', ' ')}
              </Badge>
              <Badge variant="info">{selectedComplaint.category}</Badge>
              <Badge variant={
                selectedComplaint.priority === 'high' ? 'danger' :
                selectedComplaint.priority === 'medium' ? 'warning' : 'info'
              }>
                {selectedComplaint.priority} priority
              </Badge>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">{selectedComplaint.description}</p>
              <p className="text-sm text-gray-400 mt-2">
                Submitted: {formatDate(selectedComplaint.created_at)}
              </p>
            </div>

            {selectedComplaint.complaint_replies && selectedComplaint.complaint_replies.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Replies</h4>
                {selectedComplaint.complaint_replies.map(reply => (
                  <div key={reply.id} className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-700">{reply.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(reply.created_at)}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => { setShowDetailModal(false); setSelectedComplaint(null); }}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}