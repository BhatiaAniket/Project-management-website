import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Bell, Loader2, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { companyAPI } from '../../api/company';
import { showToast } from '../../components/Toast';

export default function ManagerSettings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('security');
  
  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast("Passwords don't match", 'error');
      return;
    }
    setSaving(true);
    try {
      // Re-using the companyAPI's changePassword which hits /settings/password
      // This should work for any user that's logged in IF the backend auth is verified properly.
      // Wait, let's verify if the backend handles it.
      await companyAPI.changePassword({ 
        currentPassword: passwordForm.currentPassword, 
        newPassword: passwordForm.newPassword 
      });
      showToast('Password changed successfully!', 'success');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) { 
      showToast(err.response?.data?.message || 'Failed to update password', 'error'); 
    } finally { 
      setSaving(false); 
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold font-heading">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your security and preferences</p>
      </div>

      <div className="flex gap-2 border-b border-border pb-2">
        <button 
          onClick={() => setActiveTab('security')} 
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'security' ? 'bg-foreground text-background' : 'hover:bg-muted/60 text-muted-foreground'}`}
        >
          <Shield className="w-4 h-4" /> Security
        </button>
        <button 
          onClick={() => setActiveTab('notifications')} 
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'notifications' ? 'bg-foreground text-background' : 'hover:bg-muted/60 text-muted-foreground'}`}
        >
          <Bell className="w-4 h-4" /> Notifications
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        {activeTab === 'security' && (
          <form onSubmit={handleChangePassword} className="space-y-5 max-w-lg">
            <div className="mb-2">
              <h3 className="text-lg font-semibold">Change Password</h3>
              <p className="text-xs text-muted-foreground">Keep your account secure by updating your password regularly.</p>
            </div>
            
            <input 
              type="password" 
              placeholder="Current Password" 
              value={passwordForm.currentPassword} 
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} 
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground" 
              required 
            />
            <input 
              type="password" 
              placeholder="New Password" 
              value={passwordForm.newPassword} 
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} 
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground" 
              required 
            />
            <input 
              type="password" 
              placeholder="Confirm New Password" 
              value={passwordForm.confirmPassword} 
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} 
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground" 
              required 
            />
            <motion.button 
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }} 
              disabled={saving} 
              type="submit" 
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-foreground text-background text-sm font-medium disabled:opacity-70 mt-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
            </motion.button>
          </form>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4 max-w-lg">
            <h3 className="text-lg font-semibold border-b border-border pb-3">Email Preferences</h3>
            {[
              { label: 'Task Assigned to Me', key: 'emailOnTaskAssigned' },
              { label: 'Deadline Summaries', key: 'emailOnDeadline' },
              { label: 'Meeting Invites & Reminders', key: 'emailOnMeeting' },
              { label: 'New Direct Messages', key: 'emailOnMessage' },
              { label: 'Company Announcements', key: 'emailOnAnnouncement' },
            ].map((pref) => (
              <label key={pref.key} className="flex items-center justify-between py-3 hover:bg-muted/30 px-2 rounded-lg transition-colors cursor-pointer">
                <span className="text-sm font-medium text-foreground/80">{pref.label}</span>
                <div className="relative inline-flex items-center">
                  <input type="checkbox" className="sr-only peer" defaultChecked={true} />
                  <div className="w-11 h-6 bg-muted border border-border rounded-full peer peer-checked:bg-green-500 peer-checked:border-green-500 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white shadow-sm" />
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
