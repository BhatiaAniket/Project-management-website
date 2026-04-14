import React from 'react';

interface PasswordStrengthMeterProps {
  password?: string;
}

const getStrength = (pw: string) => {
  let score = 0;
  if (!pw) return { level: 0, label: '', bg: 'bg-border' };

  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { level: 1, label: 'Weak', bg: 'bg-red-500', text: 'text-red-500' };
  if (score <= 3) return { level: 2, label: 'Medium', bg: 'bg-orange-500', text: 'text-orange-500' };
  return { level: 3, label: 'Strong', bg: 'bg-green-500', text: 'text-green-500' };
};

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password = '' }) => {
  const strength = getStrength(password);

  return (
    <div className="mt-2 w-full">
      <div className="flex gap-2 h-1.5 w-full">
        <div className={`flex-1 rounded-full transition-all duration-300 ${strength.level >= 1 ? strength.bg : 'bg-border'}`}></div>
        <div className={`flex-1 rounded-full transition-all duration-300 ${strength.level >= 2 ? strength.bg : 'bg-border'}`}></div>
        <div className={`flex-1 rounded-full transition-all duration-300 ${strength.level >= 3 ? strength.bg : 'bg-border'}`}></div>
      </div>
      {strength.label && (
        <p className={`text-xs mt-1.5 font-medium ${strength.text} transition-all duration-300`}>
          {strength.label}
        </p>
      )}
    </div>
  );
};

export default PasswordStrengthMeter;
