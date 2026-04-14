import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  message: string;
  type: ToastType;
}

let toastListener: (options: ToastOptions) => void;

export const showToast = (message: string, type: ToastType = 'info') => {
  if (toastListener) {
    toastListener({ message, type });
  }
};

const ToastContainer: React.FC = () => {
  const [toast, setToast] = useState<{ id: number; message: string; type: ToastType } | null>(null);

  useEffect(() => {
    toastListener = (options) => {
      setToast({ id: Date.now(), ...options });
    };

    return () => {
      toastListener = () => {};
    };
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="flex items-center gap-3 px-5 py-3 rounded-full bg-background border border-border shadow-xl min-w-[280px]"
          >
            {icons[toast.type]}
            <p className="text-sm font-medium text-foreground flex-1">{toast.message}</p>
            <button 
              onClick={() => setToast(null)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;
