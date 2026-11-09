import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  Calendar,
  Search,
  Bell,
  PlusCircle,
  Menu,
  X,
  User,
  LogOut,
  LayoutDashboard,
  ShieldAlert,
  ChevronDown,
  Sparkles,
  Bookmark,
  CheckCircle2
} from 'lucide-react';
import { ROLES } from '../../utils/constants';

export const Navbar = ({ onToggleSidebar }) => {
  const { user, isAuthenticated, logout, isAdmin, isOrganizer } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="w-full bg-white" aria-label="Top Brand Navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand Logo & Hamburger */}
          <div className="flex items-center gap-3">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:hidden"
                aria-label="Toggle Navigation"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-brand-600 transition">
                  Event<span className="text-brand-600">Hub</span>
                </span>
                <span className="hidden sm:inline-block ml-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                  Local
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 ml-8">
              <Link
                to="/discover"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive('/discover')
                    ? 'text-brand-600 bg-brand-50 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Discover Events
              </Link>
              <Link
                to="/calendar"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive('/calendar')
                    ? 'text-brand-600 bg-brand-50 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Calendar
              </Link>

              {/* Role Context Link */}
              {isAuthenticated && (
                <Link
                  to={isAdmin ? '/admin' : isOrganizer ? '/organizer/events' : '/dashboard'}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    location.pathname.startsWith('/admin') ||
                    location.pathname.startsWith('/organizer') ||
                    location.pathname.startsWith('/dashboard')
                      ? 'text-brand-600 bg-brand-50 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {isAdmin ? 'Admin Console' : isOrganizer ? 'Organizer Hub' : 'My Dashboard'}
                </Link>
              )}
            </nav>
          </div>

          {/* Right: Actions, Search, Notifications, Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Create Event CTA for Organizers / Admins */}
            {(isAdmin || isOrganizer) && (
              <Link
                to="/events/create"
                className="hidden sm:inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition hover:shadow"
              >
                <PlusCircle className="w-4 h-4" />
                Post Event
              </Link>
            )}

            {/* Notification Dropdown */}
            {isAuthenticated && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-50">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">Notifications</span>
                        <span className="text-[11px] font-semibold bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">
                          {unreadCount} new
                        </span>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-500">
                          No notifications right now
                        </div>
                      ) : (
                        notifications.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => markAsRead(item.id)}
                            className={`p-3.5 hover:bg-slate-50 cursor-pointer transition ${
                              !item.isRead ? 'bg-indigo-50/40' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-semibold text-slate-900">{item.title}</p>
                              {!item.isRead && (
                                <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0 mt-1" />
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                              {item.message}
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="px-4 py-2 border-t border-slate-100 text-center">
                      <Link
                        to="/notifications"
                        onClick={() => setShowNotifications(false)}
                        className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                      >
                        View all notifications
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Profile Menu or Login Button */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition"
                >
                  <img
                    src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                    alt={user.fullName}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-brand-500/20"
                  />
                  <div className="hidden lg:block text-left">
                    <p className="text-xs font-bold text-slate-900 leading-none">{user.fullName}</p>
                    <p className="text-[10px] font-medium text-slate-500 capitalize mt-0.5">
                      {(user?.role?.name || (typeof user?.role === 'string' ? user.role : 'User')).toLowerCase()}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 hidden lg:block" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-50">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900">{user.fullName}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                        {user?.role?.name || user?.role}
                      </span>
                    </div>

                    <div className="py-1 text-xs text-slate-700">
                      <Link
                        to="/profile"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50"
                      >
                        <User className="w-4 h-4 text-slate-400" />
                        My Profile
                      </Link>
                      <Link
                        to="/my-registrations"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50"
                      >
                        <CheckCircle2 className="w-4 h-4 text-slate-400" />
                        My Registrations
                      </Link>
                      <Link
                        to="/favorites"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50"
                      >
                        <Bookmark className="w-4 h-4 text-slate-400" />
                        Saved Events
                      </Link>

                      {(isAdmin || isOrganizer) && (
                        <Link
                          to="/organizer/events"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 font-medium text-brand-600"
                        >
                          <LayoutDashboard className="w-4 h-4 text-brand-600" />
                          Organizer Management
                        </Link>
                      )}

                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 font-medium text-rose-600"
                        >
                          <ShieldAlert className="w-4 h-4 text-rose-600" />
                          Admin Console
                        </Link>
                      )}
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                          navigate('/login');
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-semibold"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white px-3.5 py-2 rounded-lg shadow-sm transition"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile Hamburger toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 md:hidden"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2">
          <Link
            to="/discover"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Discover Events
          </Link>
          <Link
            to="/calendar"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Calendar
          </Link>
          {isAuthenticated && (
            <>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                User Dashboard
              </Link>
              {(isAdmin || isOrganizer) && (
                <Link
                  to="/organizer/events"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-brand-600 hover:bg-brand-50"
                >
                  Organizer Events
                </Link>
              )}
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50"
                >
                  Admin Console
                </Link>
              )}
            </>
          )}
        </div>
      )}
    </nav>
  );
};

