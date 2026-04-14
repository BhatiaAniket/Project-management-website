import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HoverCardProps {
  children: React.ReactNode;
  content: React.ReactNode;
  onEnter?: () => void;
  width?: string;
}

const HoverCard: React.FC<HoverCardProps> = ({ children, content, onEnter, width = 'w-64' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMouseEnter, setIsMouseEnter] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isMouseEnter) {
      if (onEnter) onEnter();
      timeout = setTimeout(() => setIsVisible(true), 300); // 300ms delay to prevent accidental hovers
    } else {
      setIsVisible(false);
    }
    return () => clearTimeout(timeout);
  }, [isMouseEnter, onEnter]);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsMouseEnter(true)}
      onMouseLeave={() => setIsMouseEnter(false)}
    >
      {children}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.2 }}
            className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 ${width} bg-card border border-border shadow-xl rounded-xl z-50 overflow-hidden`}
          >
            <div className="max-h-60 overflow-y-auto p-3 custom-scrollbar">
              {content}
            </div>

            {/* Arrow */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-card border-l border-t border-border transform rotate-45"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HoverCard;
