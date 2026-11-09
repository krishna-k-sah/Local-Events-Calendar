import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { MonthlyTrendsChart, CategoryDistributionChart } from '../components/dashboard/AnalyticsCharts';
import { Button } from '../components/common/Button';
import { Download, FileSpreadsheet, Calendar, Filter, CheckCircle2, Loader2 } from 'lucide-react';
import adminService from '../services/adminService';

export const ReportsAnalyticsPage = () => {
  const [reportType, setReportType] = useState('EVENTS'); // EVENTS, REGISTRATIONS, USERS
  const [dataList, setDataList] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [reportRes, metricsRes] = await Promise.all([
        adminService.getReports(reportType),
        adminService.getDashboardMetrics(),
      ]);
      setDataList(reportRes.data || []);
      setAnalytics(metricsRes.data || null);
    } catch (err) {
      setError(err.message || 'Failed to load report data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [reportType]);

  // Real functional CSV Export
  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      alert('No data available to export.');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = headers.map((header) => {
        const val = row[header] !== undefined && row[header] !== null ? String(row[header]) : '';
        const escaped = val.replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = () => {
    exportToCSV(dataList, `event_hub_${reportType.toLowerCase()}_report`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader
        title="Reports & Analytics Intelligence"
        subtitle="Extract detailed platform telemetry, attendance metrics, and downloadable CSV audits"
        breadcrumbs={['Admin', 'Reports']}
        actions={
          <Button icon={Download} onClick={handleExport} disabled={loading || dataList.length === 0}>
            Download CSV Report
          </Button>
        }
      />

      {/* Filter and Configuration Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Report Dataset:
          </span>
          <button
            onClick={() => setReportType('EVENTS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              reportType === 'EVENTS'
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Events Ledger
          </button>
          <button
            onClick={() => setReportType('REGISTRATIONS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              reportType === 'REGISTRATIONS'
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Registrations Ledger
          </button>
          <button
            onClick={() => setReportType('USERS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              reportType === 'USERS'
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            User Accounts
          </button>
        </div>

        <div className="text-xs font-medium text-slate-500">
          Showing <span className="font-bold text-slate-900">{dataList.length}</span> live records
        </div>
      </div>

      {/* Analytics Visualizations */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <MonthlyTrendsChart data={analytics.monthlyTrends} />
          </div>
          <div>
            <CategoryDistributionChart data={analytics.categoryDistribution} />
          </div>
        </div>
      )}

      {/* Data Table Preview */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {reportType === 'EVENTS'
                ? 'Events Ledger Preview'
                : reportType === 'REGISTRATIONS'
                ? 'Registrations Ledger Preview'
                : 'User Directory Preview'}
            </h3>
            <p className="text-xs text-slate-500">Live preview of database records formatted for CSV download</p>
          </div>
          <Button variant="secondary" size="sm" icon={FileSpreadsheet} onClick={handleExport} disabled={loading || dataList.length === 0}>
            Export CSV
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        ) : dataList.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No records found for {reportType.toLowerCase()}.
          </div>
        ) : (
          <div className="border border-slate-100 rounded-xl overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                {reportType === 'EVENTS' && (
                  <tr>
                    <th className="p-3">Title</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Venue</th>
                    <th className="p-3">Capacity</th>
                    <th className="p-3">Status</th>
                  </tr>
                )}
                {reportType === 'REGISTRATIONS' && (
                  <tr>
                    <th className="p-3">Pass Ticket</th>
                    <th className="p-3">Event</th>
                    <th className="p-3">Attendee</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Registered At</th>
                  </tr>
                )}
                {reportType === 'USERS' && (
                  <tr>
                    <th className="p-3">Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">City</th>
                    <th className="p-3">Joined</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {reportType === 'EVENTS' &&
                  dataList.map((e, idx) => (
                    <tr key={e.ID || idx} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-900">{e.Title}</td>
                      <td className="p-3">{e.Category || 'General'}</td>
                      <td className="p-3">{e.Date ? e.Date.substring(0, 10) : 'TBD'}</td>
                      <td className="p-3">{e.Venue || e.City || 'Online'}</td>
                      <td className="p-3">{e.Registered || 0}/{e.Capacity || 0}</td>
                      <td className="p-3 font-semibold text-emerald-600">{e.Status}</td>
                    </tr>
                  ))}
                {reportType === 'REGISTRATIONS' &&
                  dataList.map((r, idx) => (
                    <tr key={r.RegistrationID || idx} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-brand-600">{r.TicketCode}</td>
                      <td className="p-3 font-semibold text-slate-900">{r.EventTitle}</td>
                      <td className="p-3">{r.AttendeeName} ({r.AttendeeEmail})</td>
                      <td className="p-3 text-emerald-600 font-semibold">{r.Status}</td>
                      <td className="p-3">{r.RegisteredAt ? r.RegisteredAt.substring(0, 10) : ''}</td>
                    </tr>
                  ))}
                {reportType === 'USERS' &&
                  dataList.map((u, idx) => (
                    <tr key={u.UserID || idx} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-900">{u.FullName}</td>
                      <td className="p-3">{u.Email}</td>
                      <td className="p-3 font-semibold">{u.Role}</td>
                      <td className="p-3">{u.City}</td>
                      <td className="p-3">{u.CreatedAt ? u.CreatedAt.substring(0, 10) : ''}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default ReportsAnalyticsPage;
