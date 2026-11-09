import React, { useState, Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { Footer } from './components/layout/Footer';
import { RoleSwitcher } from './components/common/RoleSwitcher';
import { Loader2 } from 'lucide-react';

// Route-based code splitting for production optimization
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage || m.default })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage || m.default })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage || m.default })));
const DiscoveryPage = lazy(() => import('./pages/DiscoveryPage').then(m => ({ default: m.DiscoveryPage || m.default })));
const CalendarPage = lazy(() => import('./pages/CalendarPage').then(m => ({ default: m.CalendarPage || m.default })));
const EventDetailsPage = lazy(() => import('./pages/EventDetailsPage').then(m => ({ default: m.EventDetailsPage || m.default })));
const UserDashboard = lazy(() => import('./pages/UserDashboard').then(m => ({ default: m.UserDashboard || m.default })));
const MyRegistrationsPage = lazy(() => import('./pages/MyRegistrationsPage').then(m => ({ default: m.MyRegistrationsPage || m.default })));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage').then(m => ({ default: m.FavoritesPage || m.default })));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage').then(m => ({ default: m.UserProfilePage || m.default })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage || m.default })));
const CreateEventPage = lazy(() => import('./pages/CreateEventPage').then(m => ({ default: m.CreateEventPage || m.default })));
const EditEventPage = lazy(() => import('./pages/EditEventPage').then(m => ({ default: m.EditEventPage || m.default })));
const MyEventsPage = lazy(() => import('./pages/MyEventsPage').then(m => ({ default: m.MyEventsPage || m.default })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard || m.default })));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage').then(m => ({ default: m.UserManagementPage || m.default })));
const EventApprovalPage = lazy(() => import('./pages/EventApprovalPage').then(m => ({ default: m.EventApprovalPage || m.default })));
const CategoryManagementPage = lazy(() => import('./pages/CategoryManagementPage').then(m => ({ default: m.CategoryManagementPage || m.default })));
const ReportsAnalyticsPage = lazy(() => import('./pages/ReportsAnalyticsPage').then(m => ({ default: m.ReportsAnalyticsPage || m.default })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage || m.default })));

const PageLoader = () => (
  <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] p-8">
    <Loader2 className="w-8 h-8 text-brand-600 animate-spin mb-3" />
    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
      Loading view...
    </span>
  </div>
);

export function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Pages that don't need the dashboard sidebar
  const isPublicStandalone = ['/login', '/register'].includes(location.pathname);
  const isDashboardView =
    location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/organizer') ||
    location.pathname.startsWith('/my-events') ||
    location.pathname.startsWith('/my-registrations') ||
    location.pathname.startsWith('/favorites') ||
    location.pathname.startsWith('/profile') ||
    location.pathname.startsWith('/notifications') ||
    location.pathname.startsWith('/reports') ||
    location.pathname.startsWith('/settings');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Top Unified Header Container (Role Switcher + Main Navbar) */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 shadow-sm flex flex-col">
        <RoleSwitcher />
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      </header>

      {/* App Shell Body with in-flow Desktop Sidebar & Off-Canvas Mobile Drawer */}
      <div className="flex-1 flex min-w-0">
        {isDashboardView && !isPublicStandalone && (
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        )}

        <main className="flex-1 min-w-0 flex flex-col">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Discovery & Core */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/discover" element={<DiscoveryPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/events/:id" element={<EventDetailsPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Normal User Routes */}
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/my-registrations" element={<MyRegistrationsPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/profile" element={<UserProfilePage />} />
              <Route path="/notifications" element={<NotificationsPage />} />

              {/* Organizer Routes */}
              <Route path="/events/create" element={<CreateEventPage />} />
              <Route path="/events/edit/:id" element={<EditEventPage />} />
              <Route path="/events/:id/edit" element={<EditEventPage />} />
              <Route path="/organizer/events" element={<MyEventsPage />} />
              <Route path="/my-events" element={<MyEventsPage />} />

              {/* Admin Governance Routes */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<UserManagementPage />} />
              <Route path="/admin/approvals" element={<EventApprovalPage />} />
              <Route path="/admin/categories" element={<CategoryManagementPage />} />
              <Route path="/admin/reports" element={<ReportsAnalyticsPage />} />
              <Route path="/reports" element={<ReportsAnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />

              {/* Fallback route */}
              <Route path="*" element={<LandingPage />} />
            </Routes>
          </Suspense>
        </main>
      </div>

      {/* Global Footer (shown on public and landing views) */}
      {!isDashboardView && <Footer />}
    </div>
  );
}
export default App;
