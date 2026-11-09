import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Sparkles, User, Briefcase } from 'lucide-react';

export const RoleSwitcher = () => {
  const { user, role, switchDemoRole } = useAuth();

  const roles = [
    { key: 'ADMIN', label: 'Admin View', icon: Shield, color: 'text-rose-600 bg-rose-50 border-rose-200' },
    { key: 'ORGANIZER', label: 'Organizer View', icon: Briefcase, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    { key: 'USER', label: 'Attendee / User View', icon: User, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  ];

  return (
    <div className="bg-slate-900 text-white text-xs py-1.5 px-4 flex flex-wrap items-center justify-between border-b border-slate-800">
      <div className="flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="font-semibold text-slate-300">Live Role Preview:</span>
        <span className="text-slate-400 hidden sm:inline">Active as <strong className="text-white">{user?.fullName}</strong> ({role})</span>
      </div>

      <div className="flex items-center gap-1.5 mt-1 sm:mt-0">
        {roles.map((r) => {
          const Icon = r.icon;
          const isActive = role === r.key;
          return (
            <button
              key={r.key}
              onClick={() => switchDemoRole(r.key)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm ring-1 ring-white/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Icon className="w-3 h-3" />
              {r.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

