import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { authAPI } from '../api/auth';
import Navbar from '../components/Navbar';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing verification token.');
      return;
    }

    const verify = async () => {
      try {
        await authAPI.verifyEmail(token);
        setStatus('success');
        setMessage('Email Verified! Your account is now active.');
      } catch (err: any) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Invalid or expired link.');
      }
    };

    const timer = setTimeout(verify, 1500); // Artificial delay to show spinner
    return () => clearTimeout(timer);
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-card border border-border rounded-[16px] p-10 shadow-sm text-center min-h-[300px] flex flex-col items-center justify-center"
        >
          {status === 'loading' && (
            <div className="flex flex-col items-center">
              <Loader2 className="w-12 h-12 text-foreground animate-spin mb-6" />
              <h2 className="text-xl font-bold font-heading mb-2">Verifying your email...</h2>
              <p className="text-muted-foreground text-sm">Please wait while we confirm your email address.</p>
            </div>
          )}

          {status === 'success' && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mb-6" />
              <h2 className="text-xl font-bold font-heading mb-2">Verification Successful</h2>
              <p className="text-muted-foreground text-sm mb-8">{message}</p>
              <Link to="/login" className="px-8 py-3.5 rounded-full bg-foreground text-background font-medium transition-all hover:scale-[1.03]">
                Go to Login →
              </Link>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center">
              <XCircle className="w-16 h-16 text-red-500 mb-6" />
              <h2 className="text-xl font-bold font-heading mb-2">Verification Failed</h2>
              <p className="text-muted-foreground text-sm mb-8">{message}</p>
              <button 
                onClick={() => window.location.href = '/register'}
                className="px-8 py-3.5 rounded-full border border-border text-foreground hover:bg-foreground/5 font-medium transition-all hover:scale-[1.03]"
              >
                Back to Registration
              </button>
            </motion.div>
          )}

        </motion.div>
      </div>
    </div>
  );
};

export default VerifyEmail;
