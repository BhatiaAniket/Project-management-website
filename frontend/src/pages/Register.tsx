import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { authAPI } from '../api/auth';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import Navbar from '../components/Navbar';
import { showToast } from '../components/Toast';

const step1Schema = z.object({
  companyName: z.string().min(1, 'Company Name is required'),
  companyLocation: z.string().min(1, 'Company Location is required'),
  employeeCount: z.enum(['1-10', '11-50', '51-200', '200+']),
  companyIndustry: z.string().optional(),
});

const step2Schema = z.object({
  fullName: z.string().min(1, 'Full Name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 50 : -50,
    opacity: 0
  })
};

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [successEmail, setSuccessEmail] = useState('');
  const [isResending, setIsResending] = useState(false);

  const form1 = useForm<Step1Data>({ resolver: zodResolver(step1Schema) });
  const form2 = useForm<Step2Data>({ resolver: zodResolver(step2Schema) });

  const onStep1Submit = (data: Step1Data) => {
    setStep1Data(data);
    setDirection(1);
    setStep(2);
  };

  const onStep2Submit = async (data: Step2Data) => {
    setIsLoading(true);
    try {
      await authAPI.register({
        ...step1Data,
        ...data
      });
      setSuccessEmail(data.email);
      setDirection(1);
      setStep(3); // Success step
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Registration failed';
      form2.setError('root', { message: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    setDirection(-1);
    setStep(1);
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await authAPI.resendVerification(successEmail);
      showToast('Verification email resent successfully.', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to resend email.', 'error');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex flex-col items-center justify-center px-4 pt-20 pb-12">
        
        {step < 3 && (
          <div className="w-full max-w-md mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold font-heading">
                Step {step} of 2 — {step === 1 ? 'Company Details' : 'Admin Details'}
              </h2>
            </div>
            <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-foreground"
                initial={false}
                animate={{ width: step === 1 ? '50%' : '100%' }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>
        )}

        <div className="w-full max-w-md relative min-h-[500px]">
          <AnimatePresence mode="wait" custom={direction}>
            
            {step === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="bg-card border border-border rounded-[16px] p-8 shadow-sm absolute w-full top-0 left-0"
              >
                <form onSubmit={form1.handleSubmit(onStep1Submit)} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Company Name</label>
                    <input {...form1.register('companyName')} className="w-full px-4 py-3 rounded-2xl border border-border bg-background focus:outline-none focus:border-foreground" />
                    {form1.formState.errors.companyName && <p className="text-red-500 text-xs mt-1">{form1.formState.errors.companyName.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Company Location</label>
                    <input {...form1.register('companyLocation')} className="w-full px-4 py-3 rounded-2xl border border-border bg-background focus:outline-none focus:border-foreground" />
                    {form1.formState.errors.companyLocation && <p className="text-red-500 text-xs mt-1">{form1.formState.errors.companyLocation.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Number of Employees</label>
                    <select {...form1.register('employeeCount')} className="w-full px-4 py-3 rounded-2xl border border-border bg-background focus:outline-none focus:border-foreground">
                      <option value="1-10">1-10</option>
                      <option value="11-50">11-50</option>
                      <option value="51-200">51-200</option>
                      <option value="200+">200+</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Industry (Optional)</label>
                    <input {...form1.register('companyIndustry')} className="w-full px-4 py-3 rounded-2xl border border-border bg-background focus:outline-none focus:border-foreground" />
                  </div>
                  
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="w-full py-3.5 mt-2 rounded-full bg-foreground text-background font-medium transition-colors"
                  >
                    Proceed →
                  </motion.button>
                </form>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="bg-card border border-border rounded-[16px] p-8 shadow-sm absolute w-full top-0 left-0"
              >
                {form2.formState.errors.root && (
                  <div className="p-3 mb-4 rounded-xl bg-red-500/10 text-red-500 text-sm">
                    {form2.formState.errors.root.message}
                  </div>
                )}
                <form onSubmit={form2.handleSubmit(onStep2Submit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Full Name</label>
                    <input {...form2.register('fullName')} className="w-full px-4 py-3 rounded-2xl border border-border bg-background focus:outline-none focus:border-foreground" />
                    {form2.formState.errors.fullName && <p className="text-red-500 text-xs mt-1">{form2.formState.errors.fullName.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Email Address</label>
                    <input type="email" {...form2.register('email')} className="w-full px-4 py-3 rounded-2xl border border-border bg-background focus:outline-none focus:border-foreground" />
                    {form2.formState.errors.email && <p className="text-red-500 text-xs mt-1">{form2.formState.errors.email.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Password</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} {...form2.register('password')} className="w-full px-4 py-3 rounded-2xl border border-border bg-background focus:outline-none focus:border-foreground pr-12" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {form2.formState.errors.password && <p className="text-red-500 text-xs mt-1">{form2.formState.errors.password.message}</p>}
                    <PasswordStrengthMeter password={form2.watch('password')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <input type={showConfirm ? 'text' : 'password'} {...form2.register('confirmPassword')} className="w-full px-4 py-3 rounded-2xl border border-border bg-background focus:outline-none focus:border-foreground pr-12" />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {form2.formState.errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{form2.formState.errors.confirmPassword.message}</p>}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={goBack} className="px-6 py-3.5 rounded-full border border-border hover:bg-foreground/5 font-medium transition-colors">
                      Back
                    </button>
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 py-3.5 rounded-full bg-foreground text-background font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Register'}
                    </motion.button>
                  </div>
                  
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    Already have an account? <Link to="/login" className="font-medium text-foreground hover:underline">Login</Link>
                  </p>
                </form>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4 }}
                className="bg-card border border-border rounded-[16px] p-10 shadow-sm absolute w-full top-0 left-0 text-center flex flex-col items-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="mb-6"
                >
                  <CheckCircle className="w-20 h-20 text-green-500" />
                </motion.div>
                <h2 className="text-2xl font-bold font-heading mb-4">Registration Successful!</h2>
                <p className="text-muted-foreground text-sm mb-8">
                  Verification email sent to <span className="font-semibold text-foreground">{successEmail}</span>.<br />
                  Please verify to activate your account.
                </p>
                <div className="flex flex-col items-center gap-3 w-full">
                  <Link to="/login" className="px-8 py-3.5 w-full max-w-xs rounded-full bg-foreground text-background font-medium transition-all hover:scale-[1.03]">
                    Go to Login →
                  </Link>
                  <button 
                    onClick={handleResend}
                    disabled={isResending}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isResending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Didn't get it? Resend Email"}
                  </button>
                </div>
              </motion.div>
            )}
            
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Register;
