import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Settings, Bell, Shield, Database, CheckCircle2 } from 'lucide-react';

export const SettingsPage = () => {
  const [siteName, setSiteName] = useState(() => localStorage.getItem('eh_setting_sitename') || 'EventHub - Local Event Calendar');
  const [supportEmail, setSupportEmail] = useState(() => localStorage.getItem('eh_setting_email') || 'support@eventhub.com');
  const [autoApproveEvents, setAutoApproveEvents] = useState(() => localStorage.getItem('eh_setting_autoapprove') === 'true');
  const [emailNotifications, setEmailNotifications] = useState(() => localStorage.getItem('eh_setting_emailnotifs') !== 'false');
  const [success, setSuccess] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem('eh_setting_sitename', siteName);
    localStorage.setItem('eh_setting_email', supportEmail);
    localStorage.setItem('eh_setting_autoapprove', autoApproveEvents ? 'true' : 'false');
    localStorage.setItem('eh_setting_emailnotifs', emailNotifications ? 'true' : 'false');

    setSuccess('Settings saved and applied to local environment successfully!');
    setTimeout(() => setSuccess(''), 4000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader
        title="Platform & System Settings"
        subtitle="Manage global system preferences, moderation policies, and platform defaults"
        breadcrumbs={['Dashboard', 'Settings']}
      />

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-brand-600">
            General Configuration
          </h2>

          <Input
            label="Platform Title / Branding"
            required
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
          />

          <Input
            label="System Support Email"
            type="email"
            required
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
          />
        </div>

        <div className="space-y-4 pt-6 border-t border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-brand-600">
            Moderation & Approval Policies
          </h2>

          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200">
            <div>
              <p className="text-xs font-bold text-slate-900">Automatic Event Publication</p>
              <p className="text-[11px] text-slate-500">
                When enabled, verified organizer submissions bypass admin moderation and publish immediately.
              </p>
            </div>
            <input
              type="checkbox"
              checked={autoApproveEvents}
              onChange={(e) => setAutoApproveEvents(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200">
            <div>
              <p className="text-xs font-bold text-slate-900">In-App & Email Broadcast Notifications</p>
              <p className="text-[11px] text-slate-500">
                Send automatic notifications on registration confirmations, approvals, and reminders.
              </p>
            </div>
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <Button type="submit">
            Save Platform Preferences
          </Button>
        </div>
      </form>
    </div>
  );
};
export default SettingsPage;
