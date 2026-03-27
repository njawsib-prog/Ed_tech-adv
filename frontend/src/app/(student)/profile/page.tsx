'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/apiClient';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import PageWrapper from '@/components/layout/PageWrapper';

interface Profile {
  id: string;
  name: string;
  email: string;
  roll_number: string;
  phone: string;
  avatar_url: string;
  created_at: string;
  last_login: string;
  is_active: boolean;
}

interface Activity {
  id: string;
  action: string;
  details: Record<string, any>;
  created_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [deletePassword, setDeletePassword] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profileRes, activityRes] = await Promise.all([
        apiClient.get('/api/student/profile'),
        apiClient.get('/api/student/profile/activity')
      ]);
      setProfile(profileRes.data);
      setActivity(activityRes.data || []);
      setFormData({
        name: profileRes.data.name || '',
        phone: profileRes.data.phone || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await apiClient.put('/api/student/profile', formData);
      setProfile(prev => prev ? { ...prev, ...formData } : null);
      alert('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }

    setSaving(true);
    try {
      await apiClient.post('/api/student/profile/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      alert('Password changed successfully');
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Error changing password:', error);
      alert(error.response?.data?.error || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      alert('Please enter your password');
      return;
    }

    setSaving(true);
    try {
      await apiClient.delete('/api/student/profile', { data: { password: deletePassword } });
      alert('Account deleted successfully');
      router.push('/');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      alert(error.response?.data?.error || 'Failed to delete account');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      login: 'Logged in',
      logout: 'Logged out',
      start_test: 'Started a test',
      submit_test: 'Submitted a test',
      view_material: 'Viewed study material',
      submit_feedback: 'Submitted feedback',
      submit_complaint: 'Submitted a complaint'
    };
    return labels[action] || action;
  };

  if (loading) {
    return (
      <PageWrapper title="Profile">
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </PageWrapper>
    );
  }

  if (!profile) {
    return (
      <PageWrapper title="Profile Not Found">
        <Card>
          <div className="p-4 text-center">
            <p className="text-gray-500">Profile not found.</p>
          </div>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="My Profile">
      <div className="space-y-4">
        {/* Profile Header */}
        <Card>
          <div className="p-4 flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-[var(--primary-color)] flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
              {profile.name?.charAt(0).toUpperCase() || 'S'}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-student-heading text-gray-900 truncate">{profile.name}</h2>
              <p className="text-student-muted mt-0.5 truncate">{profile.email}</p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <Badge variant="info">{profile.roll_number}</Badge>
                <Badge variant={profile.is_active ? 'success' : 'danger'}>
                  {profile.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-8">
            {[
              { id: 'profile', label: 'Profile Info' },
              { id: 'security', label: 'Security' },
              { id: 'activity', label: 'Activity Log' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 px-1 border-b-2 font-medium text-base ${
                  activeTab === tab.id
                    ? 'border-[var(--primary-color)] text-[var(--primary-color)]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Profile Info Tab */}
        {activeTab === 'profile' && (
          <Card>
            <div className="p-4 space-y-5">
              <h3 className="text-student-subheading">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                />
                <Input
                  label="Email"
                  value={profile.email}
                  disabled
                />
                <Input
                  label="Roll Number"
                  value={profile.roll_number}
                  disabled
                />
                <Input
                  label="Phone Number"
                  value={formData.phone}
                  onChange={(e) => setFormData(f => ({ ...f, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="text-student-muted">
                Member since {formatDate(profile.created_at)}
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <Card>
            <div className="p-4 space-y-5">
              <h3 className="text-student-subheading">Security Settings</h3>
              
              <div className="flex items-center justify-between py-4 border-b">
                <div>
                  <p className="text-student-body font-medium text-gray-900">Change Password</p>
                  <p className="text-student-muted">Update your account password</p>
                </div>
                <Button variant="outline" onClick={() => setShowPasswordModal(true)}>
                  Change
                </Button>
              </div>

              <div className="flex items-center justify-between py-4 border-b">
                <div>
                  <p className="text-student-body font-medium text-gray-900">Two-Factor Authentication</p>
                  <p className="text-student-muted">Add an extra layer of security</p>
                </div>
                <Button variant="outline" disabled>
                  Coming Soon
                </Button>
              </div>

              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="text-student-body font-medium text-red-600">Delete Account</p>
                  <p className="text-student-muted">Permanently delete your account and all data</p>
                </div>
                <Button variant="outline" onClick={() => setShowDeleteModal(true)} className="text-red-600">
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <Card>
            <div className="p-4">
              <h3 className="text-student-subheading mb-4">Recent Activity</h3>
              {activity.length === 0 ? (
                <p className="text-center text-student-muted py-8">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {activity.map(item => (
                    <div key={item.id} className="flex items-center gap-4 py-3 border-b last:border-0">
                      <div className="w-2 h-2 rounded-full bg-[var(--primary-color)] flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-student-body font-medium text-gray-900">{getActionLabel(item.action)}</p>
                        <p className="text-student-muted">{formatDateTime(item.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Password Change Modal */}
      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Change Password">
        <div className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData(p => ({ ...p, currentPassword: e.target.value }))}
          />
          <Input
            label="New Password"
            type="password"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData(p => ({ ...p, newPassword: e.target.value }))}
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData(p => ({ ...p, confirmPassword: e.target.value }))}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowPasswordModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={saving}>
              {saving ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Account Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Account">
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-red-800 font-medium">Warning: This action cannot be undone</p>
            <p className="text-red-600 text-sm mt-1">
              All your data, including test results and progress, will be permanently deleted.
            </p>
          </div>
          <Input
            label="Enter your password to confirm"
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleDeleteAccount} disabled={saving} className="bg-red-600 hover:bg-red-700">
              {saving ? 'Deleting...' : 'Delete Account'}
            </Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}