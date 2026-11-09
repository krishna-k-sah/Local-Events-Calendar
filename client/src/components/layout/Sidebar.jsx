import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Compass,
  Calendar,
  CheckCircle2,
  Bookmark,
  Bell,
  User,
  PlusCircle,
  FolderKanban,
  Users,
  ShieldCheck,
  Tag,
  BarChart3,
  Settings,
  HelpCircle
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, isAdmin, isOrganizer } = useAuth();
  const location = useLocation();

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
      isActive
        ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
    }`;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200/80 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col justify-between overflow-y-auto p-4`}
      >
        <div className="space-y-6">
          {/* General Navigation */}
          <div>
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Main Navigation
            </p>
            <div className="space-y-1">
              <NavLink to="/dashboard" onClick={onClose} className={navItemClass}>
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                User Dashboard
              </NavLink>
              <NavLink to="/discover" onClick={onClose} className={navItemClass}>
                <Compass className="w-4 h-4 shrink-0" />
                Discover Events
              </NavLink>
              <NavLink to="/calendar" onClick={onClose} className={navItemClass}>
                <Calendar className="w-4 h-4 shrink-0" />
                Interactive Calendar
              </NavLink>
              <NavLink to="/my-registrations" onClick={onClose} className={navItemClass}>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                My Registrations
              </NavLink>
              <NavLink to="/favorites" onClick={onClose} className={navItemClass}>
                <Bookmark className="w-4 h-4 shrink-0" />
                Saved Favorites
              </NavLink>
              <NavLink to="/notifications" onClick={onClose} className={navItemClass}>
                <Bell className="w-4 h-4 shrink-0" />
                Notifications
              </NavLink>
              <NavLink to="/profile" onClick={onClose} className={navItemClass}>
                <User className="w-4 h-4 shrink-0" />
                Profile Settings
              </NavLink>
            </div>
          </div>

          {/* Organizer Workspace */}
          {(isAdmin || isOrganizer) && (
            <div>
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Organizer Workspace
              </p>
              <div className="space-y-1">
                <NavLink to="/events/create" onClick={onClose} className={navItemClass}>
                  <PlusCircle className="w-4 h-4 shrink-0 text-brand-500" />
                  Post New Event
                </NavLink>
                <NavLink to="/organizer/events" onClick={onClose} className={navItemClass}>
                  <FolderKanban className="w-4 h-4 shrink-0" />
                  My Organized Events
                </NavLink>
              </div>
            </div>
          )}

          {/* Admin Management Section */}
          {isAdmin && (
            <div>
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-rose-500/80 mb-2">
                Admin Console
              </p>
              <div className="space-y-1">
                <NavLink to="/admin" end onClick={onClose} className={navItemClass}>
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  Admin Overview
                </NavLink>
                <NavLink to="/admin/approvals" onClick={onClose} className={navItemClass}>
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  Event Approvals
                </NavLink>
                <NavLink to="/admin/users" onClick={onClose} className={navItemClass}>
                  <Users className="w-4 h-4 shrink-0" />
                  User Directory
                </NavLink>
                <NavLink to="/admin/categories" onClick={onClose} className={navItemClass}>
                  <Tag className="w-4 h-4 shrink-0" />
                  Categories & Venues
                </NavLink>
                <NavLink to="/admin/reports" onClick={onClose} className={navItemClass}>
                  <BarChart3 className="w-4 h-4 shrink-0" />
                  Reports & CSV Export
                </NavLink>
                <NavLink to="/settings" onClick={onClose} className={navItemClass}>
                  <Settings className="w-4 h-4 shrink-0" />
                  Platform Settings
                </NavLink>
              </div>
            </div>
          )}
        </div>

        {/* User Card at Bottom */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-100">
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
              alt={user?.fullName || 'User'}
              className="w-9 h-9 rounded-full object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{user?.fullName}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

