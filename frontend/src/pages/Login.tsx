import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { authAPI } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/Toast';
import RoleSelector from '../components/RoleSelector';
import Navbar from '../components/Navbar';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const stats = [
  { value: '6+', label: 'USER ROLES' },
  { value: 'AI', label: 'REPORTS' },
  { value: 'REAL-TIME', label: 'TRACKING' },
  { value: 'MULTI', label: 'COMPANY' },
];

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState('company_admin');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await authAPI.login({
        email: data.email,
        password: data.password,
        role: selectedRole
      });
      const { accessToken, user } = response.data.data;
      login(accessToken, user);
      showToast('Logged in successfully', 'success');

      // Check if user must change password first
      if (user.mustChangePassword) {
        navigate('/change-password');
        return;
      }

      // Redirect based on role
      const roleRoutes: Record<string, string> = {
        super_admin: '/dashboard/super-admin',
        company_admin: '/company/dashboard',
        manager: '/manager/dashboard',
        employee: '/employee/dashboard',
        client: '/dashboard/client',
      };
      navigate(roleRoutes[user.role] || '/dashboard');
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Login failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 pt-32 pb-12 flex flex-col lg:flex-row gap-16 lg:items-center min-h-[calc(100vh-80px)]">

        {/* Left Side */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left max-w-2xl mx-auto lg:mx-0"
        >
          <div className="inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-full bg-background border border-border text-xs font-semibold tracking-widest uppercase mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Project Management Website
          </div>

          <h1 className="font-heading text-6xl md:text-7xl lg:text-8xl font-bold leading-none tracking-tight mb-8">
            Welcome <br />
            <span className="text-stroke text-transparent">Back</span>
          </h1>

          <div className="flex flex-wrap justify-center lg:justify-start gap-4 mt-12">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-background">
                <span className="font-bold text-foreground">{stat.value}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-widest">{stat.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right Side */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md mx-auto lg:mx-0"
        >
          <div className="bg-card border border-border rounded-[16px] p-8 shadow-sm">
            <h2 className="text-2xl font-bold font-heading mb-6">Login to CognifyPM</h2>

            <RoleSelector selectedRole={selectedRole} onRoleChange={setSelectedRole} />

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1.5">Email Address</label>
                <input
                  type="email"
                  {...register('email')}
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-background focus:outline-none focus:border-foreground transition-all focus:shadow-[0_0_0_1px_var(--foreground)]"
                  placeholder="name@company.com"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    className="w-full px-4 py-3 rounded-2xl border border-border bg-background focus:outline-none focus:border-foreground transition-all focus:shadow-[0_0_0_1px_var(--foreground)] pr-12"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}

                <div className="flex justify-end mt-2">
                  <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground">Forgot Password?</a>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading}
                type="submit"
                className="w-full py-3.5 rounded-full bg-foreground text-background font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login →'}
              </motion.button>

              {selectedRole === 'company_admin' && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Don't have an account? <Link to="/register" className="font-medium text-foreground hover:underline">Register</Link>
                </p>
              )}
            </form>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default Login;
