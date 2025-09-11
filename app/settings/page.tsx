// app/settings/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';
import { 
  User, 
  Shield, 
  Bell, 
  Palette, 
  FileText, 
  Download,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Settings as SettingsIcon,
  LogOut,
  ChevronRight,
  AlertTriangle,
  Check,
  Mail,
  Calendar,
  Lock,
  Smartphone,
  Globe
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  username: string;
  organization: string;
  created_at: string;
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications_enabled: boolean;
  email_notifications: boolean;
  export_format: 'docx' | 'pdf' | 'html';
  auto_save: boolean;
  tutorial_completed: boolean;
  default_template: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const router = useRouter();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const supa = supabaseClient();
      const { data: { user } } = await supa.auth.getUser();

      if (!user) {
        router.push('/signin');
        return;
      }

      setUser(user);

      // Load profile
      const { data: profileData } = await supa
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Load preferences (mock data for now - would come from user_preferences table)
      setPreferences({
        theme: 'light',
        notifications_enabled: true,
        email_notifications: true,
        export_format: 'docx',
        auto_save: true,
        tutorial_completed: localStorage.getItem('pulsenote-tutorial-completed') === 'true',
        default_template: 'physio-default'
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    if (!profile || !user) return;

    setSaving(true);
    setError(null);

    try {
      const supa = supabaseClient();
      
      const { error } = await supa
        .from('profiles')
        .update({
          full_name: profile.full_name,
          organization: profile.organization
        })
        .eq('id', user.id);

      if (error) throw error;

      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(null), 3000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All password fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supa = supabaseClient();
      
      const { error } = await supa.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setSuccess('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(null), 3000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updatePreferences = async () => {
    if (!preferences) return;

    setSaving(true);
    setError(null);

    try {
      // In a real app, save to database
      // For now, just save to localStorage
      localStorage.setItem('user-preferences', JSON.stringify(preferences));

      setSuccess('Preferences updated successfully');
      setTimeout(() => setSuccess(null), 3000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (deleteInput !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    setSaving(true);

    try {
      // In a real app, this would soft-delete the user and schedule data purge
      const supa = supabaseClient();
      await supa.auth.signOut();
      
      // Redirect to goodbye page
      router.push('/');

    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  const exportData = async () => {
    try {
      const supa = supabaseClient();
      
      // Get user's projects/reports
      const { data: projects } = await supa
        .from('projects')
        .select('*')
        .eq('created_by', user.id);

      // Get user's workspaces
      const { data: memberships } = await supa
        .from('workspace_memberships')
        .select(`
          role,
          added_at,
          workspace:workspaces(name, created_at)
        `)
        .eq('user_id', user.id);

      const exportData = {
        profile,
        preferences,
        projects: projects || [],
        workspaces: memberships || [],
        exported_at: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pulsenote-data-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setSuccess('Data exported successfully');
      setTimeout(() => setSuccess(null), 3000);

    } catch (err: any) {
      setError(err.message);
    }
  };

  const signOut = async () => {
    const supa = supabaseClient();
    await supa.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Loading settings...</div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'preferences', label: 'Preferences', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'account', label: 'Account', icon: SettingsIcon }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-600 mt-2">
            Manage your account, preferences, and security settings
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800 text-xs underline mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-green-800 font-medium">Success</p>
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </button>
                );
              })}
            </nav>

            {/* Quick Actions */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="space-y-2">
                <button
                  onClick={() => router.push('/settings/security')}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Smartphone className="w-4 h-4" />
                  Two-Factor Auth
                </button>
                <button
                  onClick={exportData}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export Data
                </button>
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="panel p-8">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 mb-1">Profile Information</h2>
                    <p className="text-slate-600 text-sm">
                      Update your personal information and professional details
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="label block mb-2">Full Name</label>
                      <input
                        type="text"
                        value={profile?.full_name || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                        className="input w-full"
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div>
                      <label className="label block mb-2">Username</label>
                      <input
                        type="text"
                        value={profile?.username || ''}
                        disabled
                        className="input w-full bg-gray-50"
                        placeholder="Your username"
                      />
                      <p className="text-xs text-slate-500 mt-1">Username cannot be changed</p>
                    </div>

                    <div>
                      <label className="label block mb-2">Email Address</label>
                      <input
                        type="email"
                        value={profile?.email || ''}
                        disabled
                        className="input w-full bg-gray-50"
                        placeholder="Your email address"
                      />
                      <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
                    </div>

                    <div>
                      <label className="label block mb-2">Organization</label>
                      <input
                        type="text"
                        value={profile?.organization || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, organization: e.target.value } : null)}
                        className="input w-full"
                        placeholder="Your organization or clinic"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                    <button
                      onClick={updateProfile}
                      disabled={saving}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <div className="text-xs text-slate-500">
                      Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 mb-1">Security Settings</h2>
                    <p className="text-slate-600 text-sm">
                      Manage your password and security preferences
                    </p>
                  </div>

                  {/* Password Change */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-slate-900">Change Password</h3>
                    
                    <div className="space-y-4 max-w-md">
                      <div>
                        <label className="label block mb-2">Current Password</label>
                        <div className="relative">
                          <input
                            type={showPasswords.current ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="input w-full pr-10"
                            placeholder="Enter current password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700"
                          >
                            {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="label block mb-2">New Password</label>
                        <div className="relative">
                          <input
                            type={showPasswords.new ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="input w-full pr-10"
                            placeholder="Enter new password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700"
                          >
                            {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="label block mb-2">Confirm New Password</label>
                        <div className="relative">
                          <input
                            type={showPasswords.confirm ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="input w-full pr-10"
                            placeholder="Confirm new password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700"
                          >
                            {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={updatePassword}
                        disabled={saving || !currentPassword || !newPassword || !confirmPassword}
                        className="btn btn-primary flex items-center gap-2"
                      >
                        <Lock className="w-4 h-4" />
                        {saving ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="pt-6 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-slate-900">Two-Factor Authentication</h3>
                        <p className="text-sm text-slate-600 mt-1">
                          Add an extra layer of security to your account
                        </p>
                      </div>
                      <button
                        onClick={() => router.push('/settings/security')}
                        className="btn flex items-center gap-2"
                      >
                        <Smartphone className="w-4 h-4" />
                        Manage 2FA
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && preferences && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 mb-1">Preferences</h2>
                    <p className="text-slate-600 text-sm">
                      Customize your PulseNote experience
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Theme */}
                    <div>
                      <label className="label block mb-2">Theme</label>
                      <select
                        value={preferences.theme}
                        onChange={(e) => setPreferences(prev => prev ? { ...prev, theme: e.target.value as any } : null)}
                        className="input w-full max-w-xs"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="system">System</option>
                      </select>
                    </div>

                    {/* Default Export Format */}
                    <div>
                      <label className="label block mb-2">Default Export Format</label>
                      <select
                        value={preferences.export_format}
                        onChange={(e) => setPreferences(prev => prev ? { ...prev, export_format: e.target.value as any } : null)}
                        className="input w-full max-w-xs"
                      >
                        <option value="docx">Word Document (.docx)</option>
                        <option value="pdf">PDF Document (.pdf)</option>
                        <option value="html">HTML Document (.html)</option>
                      </select>
                    </div>

                    {/* Auto Save */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-900">Auto Save</div>
                        <div className="text-sm text-slate-600">Automatically save drafts as you type</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.auto_save}
                          onChange={(e) => setPreferences(prev => prev ? { ...prev, auto_save: e.target.checked } : null)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                      <button
                        onClick={updatePreferences}
                        disabled={saving}
                        className="btn btn-primary flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Preferences'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && preferences && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 mb-1">Notification Settings</h2>
                    <p className="text-slate-600 text-sm">
                      Control how you receive notifications from PulseNote
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-900">Push Notifications</div>
                        <div className="text-sm text-slate-600">Receive browser notifications for important updates</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.notifications_enabled}
                          onChange={(e) => setPreferences(prev => prev ? { ...prev, notifications_enabled: e.target.checked } : null)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-900">Email Notifications</div>
                        <div className="text-sm text-slate-600">Receive email updates about workspace invitations and important changes</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.email_notifications}
                          onChange={(e) => setPreferences(prev => prev ? { ...prev, email_notifications: e.target.checked } : null)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                      <button
                        onClick={updatePreferences}
                        disabled={saving}
                        className="btn btn-primary flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Notifications'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Account Tab */}
              {activeTab === 'account' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 mb-1">Account Management</h2>
                    <p className="text-slate-600 text-sm">
                      Export your data or delete your account
                    </p>
                  </div>

                  {/* Data Export */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-slate-900">Export Your Data</h3>
                    <p className="text-slate-600">
                      Download a copy of all your reports, workspaces, and account data in JSON format.
                    </p>
                    <button
                      onClick={exportData}
                      className="btn bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export Data
                    </button>
                  </div>

                  {/* Account Deletion */}
                  <div className="pt-6 border-t border-slate-200">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-red-800 mb-2">Delete Account</h3>
                          <p className="text-red-700 text-sm mb-4">
                            Permanently delete your account and all associated data. This action cannot be undone.
                            All your reports, workspaces, and personal information will be permanently removed.
                          </p>

                          {!showDeleteConfirm ? (
                            <button
                              onClick={() => setShowDeleteConfirm(true)}
                              className="btn bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete Account
                            </button>
                          ) : (
                            <div className="space-y-4">
                              <div>
                                <label className="label block mb-2 text-red-800">
                                  Type <code className="bg-red-100 px-1 rounded">DELETE</code> to confirm
                                </label>
                                <input
                                  type="text"
                                  value={deleteInput}
                                  onChange={(e) => setDeleteInput(e.target.value)}
                                  className="input w-full max-w-xs border-red-300 focus:border-red-500 focus:ring-red-500"
                                  placeholder="DELETE"
                                />
                              </div>
                              <div className="flex gap-3">
                                <button
                                  onClick={deleteAccount}
                                  disabled={deleteInput !== 'DELETE' || saving}
                                  className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {saving ? 'Deleting...' : 'Permanently Delete Account'}
                                </button>
                                <button
                                  onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setDeleteInput('');
                                  }}
                                  className="btn"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
