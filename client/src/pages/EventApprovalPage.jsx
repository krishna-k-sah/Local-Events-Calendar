import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { formatDate, formatTime, formatCurrency } from '../utils/constants';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { useNotifications } from '../context/NotificationContext';
import { CheckCircle2, XCircle, AlertCircle, Eye, Calendar, MapPin, Users, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import adminService from '../services/adminService';
import eventService from '../services/eventService';

export const EventApprovalPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL, PENDING, APPROVED, REJECTED
  const [rejectModalEvent, setRejectModalEvent] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const { addNotification } = useNotifications();

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError('');
      // Fetch both pending events and all events so admin can toggle view
      const [pendingRes, allRes] = await Promise.all([
        adminService.getPendingEvents().catch(() => ({ data: [] })),
        eventService.getEvents({ limit: 100 }).catch(() => ({ data: [] }))
      ]);

      const pendingList = pendingRes.data || [];
      const allList = allRes.data || [];

      // Combine ensuring unique IDs
      const map = new Map();
      pendingList.forEach((e) => map.set(e.id, e));
      allList.forEach((e) => {
        if (!map.has(e.id)) map.set(e.id, e);
      });

      setEvents(Array.from(map.values()));
    } catch (err) {
      setError(err.message || 'Failed to load events for moderation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleApprove = async (evt) => {
    try {
      await adminService.approveEvent(evt.id);
      setEvents((prev) =>
        prev.map((e) => (e.id === evt.id ? { ...e, status: 'PUBLISHED' } : e))
      );
      addNotification({
        title: 'Event Approved & Published',
        message: `"${evt.title}" has been reviewed, approved, and listed on the live community calendar.`,
        type: 'EVENT_APPROVAL',
      });
    } catch (err) {
      alert(err.message || 'Failed to approve event.');
    }
  };

  const handleReject = async () => {
    if (!rejectModalEvent) return;
    try {
      await adminService.rejectEvent(rejectModalEvent.id, rejectReason);
      setEvents((prev) =>
        prev.map((e) => (e.id === rejectModalEvent.id ? { ...e, status: 'REJECTED' } : e))
      );
      addNotification({
        title: 'Event Submission Rejected',
        message: `"${rejectModalEvent.title}" was rejected. Reason: ${rejectReason || 'Does not meet guidelines.'}`,
        type: 'EVENT_REJECTION',
      });
      setRejectModalEvent(null);
      setRejectReason('');
    } catch (err) {
      alert(err.message || 'Failed to reject event.');
    }
  };

  const filteredEvents = events.filter((e) => {
    if (filter === 'PENDING') return e.status === 'PENDING';
    if (filter === 'APPROVED') return e.status === 'PUBLISHED' || e.status === 'APPROVED';
    if (filter === 'REJECTED') return e.status === 'REJECTED';
    return true;
  });

  const pendingCount = events.filter((e) => e.status === 'PENDING').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader
        title="Event Moderation & Approvals"
        subtitle="Review submitted community events before they are published to the public directory"
        breadcrumbs={['Admin', 'Event Approvals']}
      />

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            filter === 'ALL'
              ? 'bg-brand-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          All Events ({events.length})
        </button>
        <button
          onClick={() => setFilter('PENDING')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
            filter === 'PENDING'
              ? 'bg-amber-500 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Pending Review</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilter('APPROVED')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            filter === 'APPROVED'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Approved / Live
        </button>
        <button
          onClick={() => setFilter('REJECTED')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            filter === 'REJECTED'
              ? 'bg-rose-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Rejected
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
          {error}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <p className="text-sm font-semibold text-slate-700">No events found in this category.</p>
          <p className="text-xs text-slate-400 mt-1">Check back later or adjust your moderation filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((evt) => {
            const isPending = evt.status === 'PENDING';
            return (
              <div
                key={evt.id}
                className={`p-6 rounded-2xl bg-white border transition shadow-sm ${
                  isPending ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200/80'
                }`}
              >
                <div className="flex flex-col lg:flex-row gap-6">
                  <img
                    src={evt.posterImage || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=60'}
                    alt={evt.title}
                    className="w-full lg:w-48 h-36 rounded-xl object-cover shrink-0"
                  />

                  <div className="flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                          {evt.category?.name || evt.category || 'General'}
                        </span>
                        <Badge status={evt.status} />
                        <span className="text-xs text-slate-400">
                          Organizer: <strong className="text-slate-700">{evt.organizer?.fullName || evt.organizerName || 'Community Member'}</strong>
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900">{evt.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {evt.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600 pt-2 border-t border-slate-100">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(evt.startDate)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {evt.location?.venueName || evt.venueName || 'Online'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        Capacity: {evt.maxCapacity}
                      </span>
                      <span className="font-semibold text-slate-800">
                        {evt.isFree || Number(evt.price) === 0 ? 'Free Event' : formatCurrency(evt.price)}
                      </span>
                    </div>
                  </div>

                  {/* Moderation Actions */}
                  <div className="flex lg:flex-col justify-end gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0">
                    <Link to={`/events/${evt.id}`}>
                      <Button variant="secondary" size="sm" className="w-full">
                        View Full
                      </Button>
                    </Link>

                    {evt.status !== 'PUBLISHED' && evt.status !== 'APPROVED' && (
                      <Button
                        variant="success"
                        size="sm"
                        icon={CheckCircle2}
                        onClick={() => handleApprove(evt)}
                        className="w-full"
                      >
                        Approve
                      </Button>
                    )}

                    {evt.status !== 'REJECTED' && (
                      <Button
                        variant="danger"
                        size="sm"
                        icon={XCircle}
                        onClick={() => setRejectModalEvent(evt)}
                        className="w-full"
                      >
                        Reject
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectModalEvent && (
        <Modal
          isOpen={!!rejectModalEvent}
          onClose={() => setRejectModalEvent(null)}
          title="Reject Event Submission"
          subtitle={rejectModalEvent.title}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Please specify the reason for rejecting this event submission. This feedback will be sent to{' '}
              <strong>{rejectModalEvent.organizer?.fullName || rejectModalEvent.organizerName || 'the organizer'}</strong>:
            </p>

            <textarea
              rows={3}
              required
              placeholder="e.g. Inappropriate content, missing venue permit, or duplicate listing..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 p-3 text-slate-900 focus:outline-none focus:border-rose-500"
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setRejectModalEvent(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleReject}>
                Confirm Rejection
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
export default EventApprovalPage;
