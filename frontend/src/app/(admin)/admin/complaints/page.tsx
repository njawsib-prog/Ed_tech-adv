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

interface Student {
  id: string;
  name: string;
  email: string;
  roll_number: string;
}

interface ComplaintReply {
  id: string;
  message: string;
  created_at: string;
  admin_id: string;
  admins?: { name: string };
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
  students: Student;
  complaint_replies?: ComplaintReply[];
}

interface ComplaintsResponse {
  complaints: Complaint[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function ComplaintsPage() {
  const router = useRouter();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ status: '', category: '' });
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyStatus, setReplyStatus] = useState('');
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    fetchComplaints();
  }, [page, filters]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '15');
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);

      const response = await apiClient.get<ComplaintsResponse>(`/admin/notifications/complaints?${params}`);
      setComplaints(response.data.complaints || []);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewComplaint = async (id: string) => {
    try {
      const response = await apiClient.get(`/admin/notifications/complaints/${id}`);
      setSelectedComplaint(response.data);
      setReplyStatus(response.data.status);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching complaint:', error);
      alert('Failed to load complaint details');
    }
  };

  const handleReply = async () => {
    if (!selectedComplaint || !replyMessage.trim()) return;
    setReplying(true);
    try {
      await apiClient.post(`/admin/notifications/complaints/${selectedComplaint.id}/reply`, {
        message: replyMessage,
        updateStatus: replyStatus !== selectedComplaint.status ? replyStatus : undefined
      });
      setReplyMessage('');
      viewComplaint(selectedComplaint.id);
      fetchComplaints();
    } catch (error) {
      console.error('Error replying to complaint:', error);
      alert('Failed to send reply');
    } finally {
      setReplying(false);
    }
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'info';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <PageWrapper title="Complaints">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Complaints & Grievances</h1>
          <p className="text-gray-500">View and respond to student complaints</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <div className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">
                {complaints.filter(c => c.status === 'open').length}
              </p>
              <p className="text-sm text-gray-500">Open</p>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {complaints.filter(c => c.status === 'in_progress').length}
              </p>
              <p className="text-sm text-gray-500">In Progress</p>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {complaints.filter(c => c.status === 'resolved').length}
              </p>
              <p className="text-sm text-gray-500">Resolved</p>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {complaints.filter(c => c.status === 'closed').length}
              </p>
              <p className="text-sm text-gray-500">Closed</p>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
                >
                  <option value="">All Status</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(f => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
                >
                  <option value="">All Categories</option>
                  <option value="academic">Academic</option>
                  <option value="technical">Technical</option>
                  <option value="administrative">Administrative</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={() => setFilters({ status: '', category: '' })} className="w-full">
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Complaints List */}
        <Card>
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : complaints.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No complaints found.</div>
            ) : (
              complaints.map(complaint => (
                <div
                  key={complaint.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => viewComplaint(complaint.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getStatusColor(complaint.status)}>{complaint.status}</Badge>
                        <Badge variant={getPriorityColor(complaint.priority)}>{complaint.priority}</Badge>
                        <span className="text-xs text-gray-400">{complaint.category}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900">{complaint.title}</h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{complaint.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span>From: {complaint.students?.name} ({complaint.students?.roll_number})</span>
                        <span>{formatDate(complaint.created_at)}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">View</Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <span className="px-4 py-2 text-sm">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedComplaint(null); }}
        title={selectedComplaint?.title || 'Complaint Details'}
        size="lg"
      >
        {selectedComplaint && (
          <div className="space-y-4">
            {/* Complaint Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={getStatusColor(selectedComplaint.status)}>{selectedComplaint.status}</Badge>
                <Badge variant={getPriorityColor(selectedComplaint.priority)}>{selectedComplaint.priority}</Badge>
              </div>
              <p className="text-gray-700">{selectedComplaint.description}</p>
              <div className="mt-2 text-sm text-gray-500">
                From: {selectedComplaint.students?.name} ({selectedComplaint.students?.email})
              </div>
              <div className="text-sm text-gray-400">
                Submitted: {formatDate(selectedComplaint.created_at)}
              </div>
            </div>

            {/* Replies */}
            {selectedComplaint.complaint_replies && selectedComplaint.complaint_replies.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Replies</h4>
                {selectedComplaint.complaint_replies.map(reply => (
                  <div key={reply.id} className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-blue-800">
                        {reply.admins?.name || 'Admin'}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(reply.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700">{reply.message}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Reply Form */}
            <div className="border-t pt-4">
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Update Status</label>
                <select
                  value={replyStatus}
                  onChange={(e) => setReplyStatus(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Reply</label>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={3}
                  placeholder="Type your response..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={() => { setShowDetailModal(false); setSelectedComplaint(null); }}>
                  Close
                </Button>
                <Button onClick={handleReply} disabled={replying || !replyMessage.trim()}>
                  {replying ? 'Sending...' : 'Send Reply'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}