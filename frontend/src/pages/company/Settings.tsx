import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Shield, Bell, AlertTriangle, Loader2, Save } from 'lucide-react';
import { companyAPI } from '../../api/company';
import { showToast } from '../../components/Toast';

const settingsTabs = [
  { label: 'Company Profile', value: 'profile', icon: Building2 },
  { label: 'Security', value: 'security', icon: Shield },
  { label: 'Notifications', value: 'notifications', icon: Bell },
  { label: 'Danger Zone', value: 'danger', icon: AlertTriangle },
];

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [company, setCompany] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [deactivatePassword, setDeactivatePassword] = useState('');

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const res = await companyAPI.getCompanyProfile();
        setCompany(res.data.data || {});
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    fetchCompany();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await companyAPI.updateCompanyProfile({ name: company.name, location: company.location, industry: company.industry });
      showToast('Profile updated!', 'success');
    } catch { showToast('Failed to update', 'error'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast("Passwords don't match", 'error');
      return;
    }
    setSaving(true);
    try {
      await companyAPI.changePassword({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      showToast('Password changed!', 'success');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) { showToast(err.response?.data?.message || 'Failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async () => {
    if (!deactivatePassword) return;
    if (!window.confirm('Are you sure you want to deactivate your company? This action cannot be easily reversed.')) return;
    try {
      await companyAPI.deactivateCompany(deactivatePassword);
      showToast('Company deactivated', 'success');
    } catch (err: any) { showToast(err.response?.data?.message || 'Failed', 'error'); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold font-heading">Settings</h1><p className="text-sm text-muted-foreground mt-1">Manage your company and account settings</p></div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {settingsTabs.map((tab) => (
          <button key={tab.value} onClick={() => setActiveTab(tab.value)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border whitespace-nowrap ${activeTab === tab.value ? 'bg-foreground text-background border-foreground' : 'bg-transparent text-muted-foreground border-border hover:border-foreground'}`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        {activeTab === 'profile' && (
          <div className="space-y-5 max-w-lg">
            <div><label className="text-sm font-medium block mb-1.5">Company Name</label><input value={company.name || ''} onChange={(e) => setCompany({ ...company, name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground" /></div>
            <div><label className="text-sm font-medium block mb-1.5">Location</label><input value={company.location || ''} onChange={(e) => setCompany({ ...company, location: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground" /></div>
            <div><label className="text-sm font-medium block mb-1.5">Industry</label><input value={company.industry || ''} onChange={(e) => setCompany({ ...company, industry: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground" /></div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={saving} onClick={handleSaveProfile} className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-foreground text-background text-sm font-medium disabled:opacity-70">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
            </motion.button>
          </div>
        )}

        {activeTab === 'security' && (
          <form onSubmit={handleChangePassword} className="space-y-5 max-w-lg">
            <h3 className="text-lg font-semibold">Change Password</h3>
            <input type="password" placeholder="Current Password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground" required />
            <input type="password" placeholder="New Password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground" required />
            <input type="password" placeholder="Confirm New Password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground" required />
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={saving} type="submit" className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-foreground text-background text-sm font-medium disabled:opacity-70">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
            </motion.button>
          </form>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4 max-w-lg">
            <h3 className="text-lg font-semibold">Email Notifications</h3>
            {[
              { label: 'Task assigned to team member', key: 'emailOnTaskAssigned' },
              { label: 'Deadline approaching', key: 'emailOnDeadline' },
              { label: 'Meeting reminders', key: 'emailOnMeeting' },
              { label: 'New chat messages', key: 'emailOnMessage' },
              { label: 'Announcements', key: 'emailOnAnnouncement' },
            ].map((pref) => (
              <label key={pref.key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <span className="text-sm">{pref.label}</span>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-green-500 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                </div>
              </label>
            ))}
          </div>
        )}

        {activeTab === 'danger' && (
          <div className="space-y-6 max-w-lg">
            <div className="p-4 rounded-2xl border-2 border-red-500/30 bg-red-500/5">
              <h3 className="text-lg font-semibold text-red-500 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Danger Zone</h3>
              <p className="text-sm text-muted-foreground mt-2">Deactivating your company will disable all accounts and projects. This action requires your password.</p>
              <div className="mt-4 space-y-3">
                <input type="password" placeholder="Enter your password to confirm" value={deactivatePassword} onChange={(e) => setDeactivatePassword(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-red-500/30 bg-background text-sm focus:outline-none focus:border-red-500" />
                <button onClick={handleDeactivate} disabled={!deactivatePassword} className="px-6 py-2.5 rounded-full bg-red-500 text-white text-sm font-medium disabled:opacity-50 hover:bg-red-600 transition-colors">
                  Deactivate Company Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
