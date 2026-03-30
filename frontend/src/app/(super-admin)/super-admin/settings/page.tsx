'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';

interface Settings {
  platform_name?: string;
  tagline?: string;
  primary_color?: string;
  logo_url?: string;
  currency?: string;
  timezone?: string;
  session_timeout?: number;
  payment_threshold?: number;
  late_fee_percentage?: number;
  grace_period_days?: number;
  max_upload_size_mb?: number;
  allowed_file_types?: string[];
  [key: string]: any;
}

interface Features {
  maintenance_mode?: boolean;
  user_registration?: boolean;
  email_notifications?: boolean;
  sms_notifications?: boolean;
  [key: string]: any;
}

const TIMEZONES = ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Kolkata', 'Asia/Karachi', 'Asia/Dubai'];
const FILE_TYPES = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'mp4', 'mp3', 'doc', 'docx', 'xls', 'xlsx'];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [features, setFeatures] = useState<Features>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSettings = async () => {
    try {
      const [settingsRes, featuresRes] = await Promise.all([
        apiClient.get('/super-admin/settings'),
        apiClient.get('/super-admin/settings/features'),
      ]);
      if (settingsRes.data.success) setSettings(settingsRes.data.data || {});
      if (featuresRes.data.success) setFeatures(featuresRes.data.data || {});
    } catch (err) {
      showToast('error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...settings, ...features };
      const res = await apiClient.put('/super-admin/settings', payload);
      if (res.data.success) {
        showToast('success', 'Settings saved successfully');
      }
    } catch (err) {
      showToast('error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all settings to defaults?')) return;
    try {
      const res = await apiClient.post('/super-admin/settings/reset');
      if (res.data.success) {
        showToast('success', 'Settings reset to defaults');
        fetchSettings();
      }
    } catch (err) {
      showToast('error', 'Failed to reset settings');
    }
  };

  const toggleFileType = (type: string) => {
    const current = settings.allowed_file_types || [];
    const updated = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
    setSettings({ ...settings, allowed_file_types: updated });
  };

  const ToggleSwitch = ({ label, featureKey }: { label: string; featureKey: string }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => setFeatures({ ...features, [featureKey]: !features[featureKey] })}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${features[featureKey] ? 'bg-indigo-600' : 'bg-gray-300'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${features[featureKey] ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <button
          type="button"
          onClick={handleReset}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Reset to Defaults
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Branding */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Branding</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Platform Name</label>
              <input type="text" value={settings.platform_name || ''} onChange={e => setSettings({ ...settings, platform_name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
              <input type="text" value={settings.tagline || ''} onChange={e => setSettings({ ...settings, tagline: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={settings.primary_color || '#6366f1'} onChange={e => setSettings({ ...settings, primary_color: e.target.value })} className="h-10 w-16 border border-gray-300 rounded cursor-pointer" />
                <input type="text" value={settings.primary_color || '#6366f1'} onChange={e => setSettings({ ...settings, primary_color: e.target.value })} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
              <input type="text" value={settings.logo_url || ''} onChange={e => setSettings({ ...settings, logo_url: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </div>

        {/* Feature Flags */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Feature Flags</h2>
          <ToggleSwitch label="Maintenance Mode" featureKey="maintenance_mode" />
          <ToggleSwitch label="User Registration" featureKey="user_registration" />
          <ToggleSwitch label="Email Notifications" featureKey="email_notifications" />
          <ToggleSwitch label="SMS Notifications" featureKey="sms_notifications" />
        </div>

        {/* Platform Settings */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select value={settings.currency || 'INR'} onChange={e => setSettings({ ...settings, currency: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {['USD', 'EUR', 'GBP', 'INR', 'PKR'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
              <select value={settings.timezone || 'UTC'} onChange={e => setSettings({ ...settings, timezone: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Session Timeout (minutes)</label>
              <input type="number" value={settings.session_timeout || 60} onChange={e => setSettings({ ...settings, session_timeout: Number(e.target.value) })} min="5" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </div>

        {/* Payment Settings */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Threshold</label>
              <input type="number" value={settings.payment_threshold || 0} onChange={e => setSettings({ ...settings, payment_threshold: Number(e.target.value) })} min="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Late Fee Percentage (%)</label>
              <input type="number" value={settings.late_fee_percentage || 0} onChange={e => setSettings({ ...settings, late_fee_percentage: Number(e.target.value) })} min="0" max="100" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grace Period (days)</label>
              <input type="number" value={settings.grace_period_days || 0} onChange={e => setSettings({ ...settings, grace_period_days: Number(e.target.value) })} min="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </div>

        {/* Upload Settings */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Settings</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Upload Size (MB)</label>
            <input type="number" value={settings.max_upload_size_mb || 10} onChange={e => setSettings({ ...settings, max_upload_size_mb: Number(e.target.value) })} min="1" className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Allowed File Types</label>
            <div className="flex flex-wrap gap-2">
              {FILE_TYPES.map(type => {
                const checked = (settings.allowed_file_types || []).includes(type);
                return (
                  <label key={type} className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleFileType(type)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">.{type}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
