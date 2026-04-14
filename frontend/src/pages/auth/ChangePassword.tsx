import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { companyAPI } from '../../api/company';
import { showToast } from '../../components/Toast';
import PasswordStrengthMeter from '../../components/PasswordStrengthMeter';

const ChangePassword: React.FC = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await companyAPI.changePasswordFirstLogin(newPassword);
      updateUser({ mustChangePassword: false });
      showToast('Password changed successfully!', 'success');

      // Redirect to appropriate dashboard
      const roleRoutes: Record<string, string> = {
        super_admin: '/super-admin/dashboard',
        company_admin: '/company/dashboard',
        manager: '/',        // placeholder until manager dashboard is rebuilt
        employee: '/',       // placeholder until employee dashboard is rebuilt
        client: '/client/dashboard',
      };
      navigate(roleRoutes[user?.role || 'company_admin'] || '/company/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-card border border-border rounded-[20px] p-8 shadow-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-foreground/10 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-foreground" />
            </div>
            <h1 className="text-2xl font-bold font-heading">Change Your Password</h1>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Your account requires a password change before you can continue.
            </p>
          </div>

          {error && (
            <div className="p-3 mb-4 rounded-xl bg-red-500/10 text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-background focus:outline-none focus:border-foreground transition-all focus:shadow-[0_0_0_1px_var(--foreground)] pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <PasswordStrengthMeter password={newPassword} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-background focus:outline-none focus:border-foreground transition-all focus:shadow-[0_0_0_1px_var(--foreground)] pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-red-500 text-xs mt-1">Passwords don't match</p>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isLoading}
              type="submit"
              className="w-full py-3.5 rounded-full bg-foreground text-background font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Set New Password →'}
            </motion.button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          CognifyPM — AI-Powered Project Management
        </p>
      </motion.div>
    </div>
  );
};

export default ChangePassword;
