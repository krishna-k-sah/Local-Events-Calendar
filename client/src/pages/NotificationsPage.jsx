import React, { useState, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/common/Button';
import { Bell, CheckCheck, Trash2, CheckCircle2, ShieldAlert, Clock, Loader2 } from 'lucide-react';
import { formatDate, formatTime } from '../utils/constants';

export const NotificationsPage = () => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    refreshNotifications,
  } = useNotifications();

  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    refreshNotifications();
  }, []);

  const filtered = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.isRead;
    return true;
  });

  const getIcon = (type) => {
    switch (type) {
      case 'REGISTRATION_SUCCESS':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'EVENT_APPROVAL':
        return <CheckCircle2 className="w-5 h-5 text-brand-600" />;
      case 'EVENT_REJECTION':
        return <ShieldAlert className="w-5 h-5 text-rose-600" />;
      default:
        return <Clock className="w-5 h-5 text-amber-600" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader
        title="In-App Notifications"
        subtitle={`You have ${unreadCount} unread alert${unreadCount === 1 ? '' : 's'}`}
        breadcrumbs={['Dashboard', 'Notifications']}
        actions={
          unreadCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              icon={CheckCheck}
              onClick={markAllAsRead}
            >
              Mark All as Read
            </Button>
          )
        }
      />

      <div className="flex gap-2">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            filter === 'ALL'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('UNREAD')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            filter === 'UNREAD'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">No Notifications</h3>
          <p className="text-xs text-slate-500 mt-1">
            You're all caught up with your event updates and messages.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition flex items-start justify-between gap-4 ${
                !item.isRead
                  ? 'bg-brand-50/40 border-brand-200/80 shadow-sm'
                  : 'bg-white border-slate-200/80'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-xs shrink-0 mt-0.5">
                  {getIcon(item.type)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                    {!item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-brand-600" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.message}</p>
                  <p className="text-[11px] text-slate-400">
                    {formatDate(item.createdAt)} • {formatTime(item.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {!item.isRead && (
                  <button
                    onClick={() => markAsRead(item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-white transition"
                    title="Mark as Read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => clearNotification(item.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
