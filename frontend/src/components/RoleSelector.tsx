import React from 'react';

interface RoleSelectorProps {
  selectedRole: string;
  onRoleChange: (val: string) => void;
}

const roles = [
  { label: 'Super Admin', value: 'super_admin' },
  { label: 'Company Admin', value: 'company_admin' },
  { label: 'Manager', value: 'manager' },
  { label: 'Employee', value: 'employee' },
  { label: 'Client', value: 'client' },
];

const RoleSelector: React.FC<RoleSelectorProps> = ({ selectedRole, onRoleChange }) => {
  return (
    <div className="w-full mb-6">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {roles.map((r) => {
          const isActive = selectedRole === r.value;
          return (
            <button
              key={r.value}
              type="button"
              onClick={() => onRoleChange(r.value)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border ${
                isActive
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-transparent text-muted-foreground border-border hover:border-foreground'
              }`}
            >
              {r.label}
            </button>
          );
        })}
      </div>
      <p className="text-sm mt-3 text-muted-foreground font-medium transition-colors">
        Logging in as: <span className="text-foreground">{roles.find((r) => r.value === selectedRole)?.label}</span>
      </p>
    </div>
  );
};

export default RoleSelector;
