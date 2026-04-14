import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 hover:bg-foreground/10 focus:outline-none"
      aria-label="Toggle Theme"
    >
      <Sun
        className={`w-5 h-5 absolute transition-all duration-300 ${
          isDark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
        } text-foreground`}
      />
      <Moon
        className={`w-5 h-5 absolute transition-all duration-300 ${
          isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
        } text-foreground`}
      />
    </button>
  );
};

export default ThemeToggle;
