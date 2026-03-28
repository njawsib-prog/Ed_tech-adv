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

interface Feedback {
  id: string;
  type: 'course' | 'test' | 'platform' | 'other';
  rating: number;
  subject: string;
  created_at: string;
}

export default function FeedbackPage() {
  const [feedbackHistory, setFeedbackHistory] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    type: 'platform',
    rating: 5,
    subject: '',
    message: ''
  });
  const [hoveredRating, setHoveredRating] = useState(0);

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/student/feedback');
      // Handle both old format (direct object) and new format ({ success, data })
      setFeedbackHistory(response.data.success ? response.data.data : response.data || []);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.post('/student/feedback', formData);
      setShowModal(false);
      resetForm();
      fetchFeedback();
      alert('Thank you for your feedback!');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'platform',
      rating: 5,
      subject: '',
      message: ''
    });
    setHoveredRating(0);
  };

  const renderStars = (rating: number, interactive: boolean = false) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && setFormData(f => ({ ...f, rating: star }))}
            onMouseEnter={() => interactive && setHoveredRating(star)}
            onMouseLeave={() => interactive && setHoveredRating(0)}
            className={`${interactive ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <svg
              className={`w-6 h-6 ${
                star <= (interactive && hoveredRating ? hoveredRating : rating)
                  ? 'text-yellow-400'
                  : 'text-gray-300'
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'course': return 'info';
      case 'test': return 'warning';
      case 'platform': return 'success';
      default: return 'info';
    }
  };

  return (
    <PageWrapper title="Feedback">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
            <p className="text-gray-500">Share your thoughts and help us improve</p>
          </div>
          <Button onClick={() => { resetForm(); setShowModal(true); }}>
            + Give Feedback
          </Button>
        </div>

        {/* Feedback History */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Your Feedback History</h3>
            {loading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : feedbackHistory.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No feedback submitted yet. We&apos;d love to hear from you!
              </div>
            ) : (
              <div className="space-y-4">
                {feedbackHistory.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="flex items-center gap-4">
                      <Badge variant={getTypeColor(item.type)}>{item.type}</Badge>
                      <div>
                        <p className="font-medium">{item.subject || 'General Feedback'}</p>
                        <p className="text-sm text-gray-500">{formatDate(item.created_at)}</p>
                      </div>
                    </div>
                    {renderStars(item.rating)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Feedback Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title="Share Your Feedback">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Feedback Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(f => ({ ...f, type: e.target.value as any }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
            >
              <option value="platform">Platform</option>
              <option value="course">Course</option>
              <option value="test">Test</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
            {renderStars(formData.rating, true)}
            <p className="text-sm text-gray-500 mt-1">
              {formData.rating === 5 ? 'Excellent!' :
               formData.rating === 4 ? 'Good' :
               formData.rating === 3 ? 'Average' :
               formData.rating === 2 ? 'Below Average' : 'Poor'}
            </p>
          </div>

          <Input
            label="Subject"
            value={formData.subject}
            onChange={(e) => setFormData(f => ({ ...f, subject: e.target.value }))}
            placeholder="Brief subject of your feedback"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Feedback</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData(f => ({ ...f, message: e.target.value }))}
              rows={4}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
              placeholder="Tell us more about your experience..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </form>
      </Modal>
    </PageWrapper>
  );
}