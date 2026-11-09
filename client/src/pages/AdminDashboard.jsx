import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/dashboard/StatCard';
import { MonthlyTrendsChart, CategoryDistributionChart } from '../components/dashboard/AnalyticsCharts';
import adminService from '../services/adminService';
import { formatDate } from '../utils/constants';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import {
  Users,
  Calendar,
  Briefcase,
  TrendingUp,
  FileSpreadsheet,
  ShieldCheck,
  ArrowRight,
  Loader2
} from 'lucide-react';

export const AdminDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminOverview = async () => {
      try {
        const [dashRes, pendingRes, usersRes] = await Promise.all([
          adminService.getDashboardMetrics(),
          adminService.getPendingEvents(),
          adminService.getUsers(),
        ]);

        if (dashRes.success) setMetrics(dashRes.data);
        if (pendingRes.success) setPendingEvents(pendingRes.data);
        if (usersRes.success) setRecentUsers(usersRes.data.slice(0, 5));
      } catch (err) {
        console.error('Failed to load admin overview:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminOverview();
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex justify-center items-center text-brand-600">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <PageHeader
        title="Administrative Governance Console"
        subtitle="Live platform-wide database metrics, event approvals, user management, and operational analytics"
        breadcrumbs={['Admin', 'Overview']}
        actions={
          <div className="flex gap-2">
            <Link to="/admin/approvals">
              <Button size="sm" variant="outline" icon={ShieldCheck}>
                Review Pending ({pendingEvents.length})
              </Button>
            </Link>
            <Link to="/admin/reports">
              <Button size="sm" icon={FileSpreadsheet}>
                Export Reports
              </Button>
            </Link>
          </div>
        }
      />

      {/* Primary 4 Key Metric Cards (Real Database Queries) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={metrics?.totalUsers?.toLocaleString() || '0'}
          change="+12.4% this mo"
          icon={Users}
          color="brand"
        />
        <StatCard
          title="Organizers"
          value={metrics?.totalOrganizers || '0'}
          change="+4 this wk"
          icon={Briefcase}
          color="indigo"
        />
        <StatCard
          title="Total Events"
          value={metrics?.totalEvents || '0'}
          change="+18% YoY"
          icon={Calendar}
          color="sky"
        />
        <StatCard
          title="Total Registrations"
          value={metrics?.totalRegistrations?.toLocaleString() || '0'}
          change="+24% this mo"
          icon={TrendingUp}
          color="emerald"
        />
      </div>

      {/* Secondary Status Counts Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200/80">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Pending Approvals</p>
          <p className="text-xl font-black text-amber-900 mt-1">{metrics?.pendingApprovals || 0}</p>
        </div>
        <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200/80">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Approved & Active</p>
          <p className="text-xl font-black text-emerald-900 mt-1">{metrics?.approvedEvents || 0}</p>
        </div>
        <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200/80">
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Rejected Submissions</p>
          <p className="text-xl font-black text-rose-900 mt-1">{metrics?.rejectedEvents || 0}</p>
        </div>
        <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200/80">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Completed Events</p>
          <p className="text-xl font-black text-slate-800 mt-1">{metrics?.completedEvents || 0}</p>
        </div>
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MonthlyTrendsChart data={metrics?.monthlyTrends || []} />
        </div>
        <div>
          <CategoryDistributionChart data={metrics?.categoryDistribution || []} />
        </div>
      </div>

      {/* Quick Action Tables: Pending Approvals & Recent Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals Widget */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pending Event Submissions</h3>
              <p className="text-xs text-slate-500">Events requiring moderation before public listing</p>
            </div>
            <Link
              to="/admin/approvals"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              Review All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {pendingEvents.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No events currently pending review!</p>
            ) : (
              pendingEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3 hover:bg-slate-50 transition"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{evt.title}</p>
                    <p className="text-[11px] text-slate-500">By {evt.organizerName} • {formatDate(evt.startDate)}</p>
                  </div>
                  <Link to="/admin/approvals">
                    <Button size="sm" variant="outline">
                      Review
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Registered Users */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent User Registrations</h3>
              <p className="text-xs text-slate-500">Latest accounts joined to EventHub</p>
            </div>
            <Link
              to="/admin/users"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              Manage Users <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentUsers.map((u) => (
              <div
                key={u.id}
                className="p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                    alt={u.fullName}
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{u.fullName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                  </div>
                </div>
                <Badge
                  label={u.role}
                  variant={u.role === 'ADMIN' ? 'danger' : u.role === 'ORGANIZER' ? 'primary' : 'warning'}
                  size="sm"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
