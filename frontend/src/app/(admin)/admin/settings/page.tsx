'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import PageWrapper from '@/components/layout/PageWrapper';

interface InstituteConfig {
  id: string;
  name: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  features: {
    complaintsEnabled: boolean;
    feedbackEnabled: boolean;
    materialsEnabled: boolean;
    notificationsEnabled: boolean;
  };
}

interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  last_login: string;
}

interface Settings {
  emailNotifications: boolean;
  autoSubmitTests: boolean;
  maintenanceMode: boolean;
  studentRegistration: boolean;
  [key: string]: boolean | string;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('institute');
  const [instituteConfig, setInstituteConfig] = useState<InstituteConfig | null>(null);
  const [settings, setSettings] = useState<Settings>({
    emailNotifications: true,
    autoSubmitTests: true,
    maintenanceMode: false,
    studentRegistration: true
  });
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '', role: 'admin' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [configRes, settingsRes, adminsRes] = await Promise.all([
        apiClient.get('/api/admin/settings/institute'),
        apiClient.get('/api/admin/settings'),
        apiClient.get('/api/admin/settings/admins')
      ]);
      setInstituteConfig(configRes.data);
      if (settingsRes.data) {
        setSettings(prev => ({ ...prev, ...settingsRes.data }));
      }
      setAdmins(adminsRes.data || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInstitute = async () => {
    if (!instituteConfig) return;
    setSaving(true);
    try {
      await apiClient.put('/api/admin/settings/institute', instituteConfig);
      alert('Institute settings saved successfully');
    } catch (error) {
      console.error('Error saving institute settings:', error);
      alert('Failed to save institute settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await apiClient.put('/api/admin/settings', settings);
      alert('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
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
      await apiClient.post('/api/admin/settings/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      alert('Password changed successfully');
      setShowPasswordForm(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Error changing password:', error);
      alert(error.response?.data?.error || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!newAdmin.name || !newAdmin.email || !newAdmin.password) {
      alert('All fields are required');
      return;
    }

    setSaving(true);
    try {
      await apiClient.post('/api/admin/settings/admins', newAdmin);
      alert('Admin created successfully');
      setShowAdminModal(false);
      setNewAdmin({ name: '', email: '', password: '', role: 'admin' });
      fetchData();
    } catch (error: any) {
      console.error('Error creating admin:', error);
      alert(error.response?.data?.error || 'Failed to create admin');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAdmin = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete admin "${name}"?`)) return;

    try {
      await apiClient.delete(`/api/admin/settings/admins/${id}`);
      alert('Admin deleted successfully');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting admin:', error);
      alert(error.response?.data?.error || 'Failed to delete admin');
    }
  };

  if (loading) {
    return (
      <PageWrapper title="Settings">
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Settings">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-heading text-gray-900">Settings</h1>
          <p className="text-gray-500">Manage your institute settings and preferences</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-8">
            {[
              { id: 'institute', label: 'Institute' },
              { id: 'features', label: 'Features' },
              { id: 'security', label: 'Security' },
              { id: 'admins', label: 'Admin Users' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 px-1 border-b-2 font-medium text-sm ${
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

        {/* Institute Settings */}
        {activeTab === 'institute' && instituteConfig && (
          <Card>
            <div className="p-6 space-y-6">
              <h3 className="text-lg font-semibold">Institute Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Institute Name"
                  value={instituteConfig.name}
                  onChange={(e) => setInstituteConfig({ ...instituteConfig, name: e.target.value })}
                />
                <Input
                  label="Logo URL"
                  value={instituteConfig.logo_url || ''}
                  onChange={(e) => setInstituteConfig({ ...instituteConfig, logo_url: e.target.value })}
                />
                <Input
                  label="Contact Email"
                  type="email"
                  value={instituteConfig.contact_email || ''}
                  onChange={(e) => setInstituteConfig({ ...instituteConfig, contact_email: e.target.value })}
                />
                <Input
                  label="Contact Phone"
                  value={instituteConfig.contact_phone || ''}
                  onChange={(e) => setInstituteConfig({ ...instituteConfig, contact_phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={instituteConfig.address || ''}
                  onChange={(e) => setInstituteConfig({ ...instituteConfig, address: e.target.value })}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
                />
              </div>

              <h3 className="text-lg font-semibold pt-4">Brand Colors</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={instituteConfig.primary_color || '#4F46E5'}
                      onChange={(e) => setInstituteConfig({ ...instituteConfig, primary_color: e.target.value })}
                      className="w-12 h-10 rounded border"
                    />
                    <Input
                      value={instituteConfig.primary_color || '#4F46E5'}
                      onChange={(e) => setInstituteConfig({ ...instituteConfig, primary_color: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={instituteConfig.secondary_color || '#7C3AED'}
                      onChange={(e) => setInstituteConfig({ ...instituteConfig, secondary_color: e.target.value })}
                      className="w-12 h-10 rounded border"
                    />
                    <Input
                      value={instituteConfig.secondary_color || '#7C3AED'}
                      onChange={(e) => setInstituteConfig({ ...instituteConfig, secondary_color: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveInstitute} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Feature Settings */}
        {activeTab === 'features' && (
          <Card>
            <div className="p-6 space-y-6">
              <h3 className="text-lg font-semibold">Feature Settings</h3>
              
              <div className="space-y-4">
                {[
                  { key: 'emailNotifications', label: 'Email Notifications', desc: 'Send email notifications for important events' },
                  { key: 'autoSubmitTests', label: 'Auto-Submit Tests', desc: 'Automatically submit tests when time runs out' },
                  { key: 'maintenanceMode', label: 'Maintenance Mode', desc: 'Disable student access temporarily' },
                  { key: 'studentRegistration', label: 'Student Registration', desc: 'Allow new students to register' }
                ].map(feature => (
                  <div key={feature.key} className="flex items-center justify-between py-3 border-b">
                    <div>
                      <p className="font-medium text-gray-900">{feature.label}</p>
                      <p className="text-sm text-gray-500">{feature.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!settings[feature.key]}
                        onChange={(e) => setSettings({ ...settings, [feature.key]: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <Card>
            <div className="p-6 space-y-6">
              <h3 className="text-lg font-semibold">Security Settings</h3>
              
              {!showPasswordForm ? (
                <div className="flex items-center justify-between py-4 border-b">
                  <div>
                    <p className="font-medium text-gray-900">Change Password</p>
                    <p className="text-sm text-gray-500">Update your account password</p>
                  </div>
                  <Button variant="outline" onClick={() => setShowPasswordForm(true)}>
                    Change
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 border p-4 rounded-lg bg-gray-50">
                  <h4 className="font-medium">Change Password</h4>
                  <Input
                    label="Current Password"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  />
                  <Input
                    label="New Password"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  />
                  <Input
                    label="Confirm New Password"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  />
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setShowPasswordForm(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleChangePassword} disabled={saving}>
                      {saving ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
                </div>
              )}

              <div className="py-4 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                    <p className="text-sm text-gray-500">Add an extra layer of security</p>
                  </div>
                  <Button variant="outline" disabled>Coming Soon</Button>
                </div>
              </div>

              <div className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Active Sessions</p>
                    <p className="text-sm text-gray-500">Manage your active login sessions</p>
                  </div>
                  <Button variant="outline" disabled>Coming Soon</Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Admin Users */}
        {activeTab === 'admins' && (
          <Card>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Admin Users</h3>
                <Button onClick={() => setShowAdminModal(true)}>+ Add Admin</Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Role</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Created</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map(admin => (
                      <tr key={admin.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{admin.name}</td>
                        <td className="py-3 px-4">{admin.email}</td>
                        <td className="py-3 px-4 capitalize">{admin.role}</td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {new Date(admin.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteAdmin(admin.id, admin.name)}
                            className="text-red-600"
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        )}

        {/* Add Admin Modal */}
        {showAdminModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Add New Admin</h3>
              <div className="space-y-4">
                <Input
                  label="Name"
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                />
                <Input
                  label="Email"
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                />
                <Input
                  label="Password"
                  type="password"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={newAdmin.role}
                    onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--primary-color)] focus:outline-none"
                  >
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowAdminModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAdmin} disabled={saving}>
                  {saving ? 'Creating...' : 'Create Admin'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}