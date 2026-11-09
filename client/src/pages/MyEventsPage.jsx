import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import eventService from '../services/eventService';
import { analyticsService } from '../services/phase5Service';
import { formatDate, formatCurrency } from '../utils/constants';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { AttendanceScannerModal } from '../components/attendance/AttendanceScannerModal';
import {
  PlusCircle,
  Edit,
  Trash2,
  Users,
  Eye,
  AlertTriangle,
  Loader2,
  Scan,
  TrendingUp,
  CheckCircle,
  Clock,
} from 'lucide-react';

export const MyEventsPage = () => {
  const [events, setEvents] = useState([]);
  const [deleteModalEvent, setDeleteModalEvent] = useState(null);
  const [attendeesModalEvent, setAttendeesModalEvent] = useState(null);
  const [scanningEvent, setScanningEvent] = useState(null);
  const [analyticsSummary, setAnalyticsSummary] = useState(null);
  const [attendeesList, setAttendeesList] = useState([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const fetchOrganizerEvents = async () => {
    try {
      const [resEvents, resAnalytics] = await Promise.allSettled([
        eventService.getOrganizerEvents(),
        analyticsService.getOrganizerAnalytics(),
      ]);

      if (resEvents.status === 'fulfilled' && resEvents.value.success) {
        setEvents(resEvents.value.data);
      }
      if (resAnalytics.status === 'fulfilled' && resAnalytics.value.success) {
        setAnalyticsSummary(resAnalytics.value.data.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizerEvents();
  }, []);

  const handleDelete = async () => {
    if (!deleteModalEvent) return;
    setDeleting(true);
    try {
      const res = await eventService.deleteEvent(deleteModalEvent.id);
      if (res.success) {
        setEvents((prev) => prev.filter((e) => e.id !== deleteModalEvent.id));
        setDeleteModalEvent(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete event.');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenAttendees = async (evt) => {
    setAttendeesModalEvent(evt);
    setLoadingAttendees(true);
    try {
      const res = await eventService.getEventAttendees(evt.id);
      if (res.success) {
        setAttendeesList(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAttendees(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader
        title="Organized Events Management"
        subtitle="Manage submissions, check approval statuses, and monitor attendee registrations"
        breadcrumbs={['Organizer', 'My Events']}
        actions={
          <Link to="/events/create">
            <Button icon={PlusCircle}>
              Host New Event
            </Button>
          </Link>
        }
      />

      {/* Organizer Performance Telemetry Bar */}
      {analyticsSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Events Hosted
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              {analyticsSummary.totalEvents}
            </div>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Booked Attendees
            </div>
            <div className="text-xl sm:text-2xl font-black text-brand-600">
              {analyticsSummary.totalRegistered}
            </div>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Capacity Utilization
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600">
              {analyticsSummary.capacityUtilization}%
            </div>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Door Check-in Rate
            </div>
            <div className="text-xl sm:text-2xl font-black text-indigo-600">
              {analyticsSummary.attendanceRate}%
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex justify-center items-center text-brand-600">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8">
          <h3 className="text-base font-bold text-slate-900">No Events Hosted Yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            You haven't posted any community events yet. Click below to host your first event.
          </p>
          <Link to="/events/create" className="mt-4 inline-block">
            <Button size="sm" icon={PlusCircle}>Post an Event</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">Event Details</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Date & Venue</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Attendees</th>
                  <th className="px-4 py-3.5">Price</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={evt.posterImage || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80'}
                          alt={evt.title}
                          className="w-12 h-12 rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <Link
                            to={`/events/${evt.id}`}
                            className="font-bold text-slate-900 hover:text-brand-600 transition block truncate max-w-xs"
                          >
                            {evt.title}
                          </Link>
                          <span className="text-[11px] text-slate-400">ID: {evt.id}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-slate-700 font-medium">
                      {evt.category}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      <p className="font-semibold text-slate-800">{formatDate(evt.startDate)}</p>
                      <p className="text-[11px] text-slate-500 truncate max-w-[150px]">{evt.venueName}</p>
                    </td>

                    <td className="px-4 py-4">
                      <Badge status={evt.status} />
                    </td>

                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleOpenAttendees(evt)}
                        className="inline-flex items-center gap-1.5 font-bold text-brand-600 hover:text-brand-800 hover:underline"
                      >
                        <Users className="w-3.5 h-3.5" />
                        {evt.currentRegistered} / {evt.maxCapacity}
                      </button>
                    </td>

                    <td className="px-4 py-4 font-semibold text-slate-900">
                      {evt.isFree ? 'Free' : formatCurrency(evt.price)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setScanningEvent(evt)}
                          className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition"
                          title="Scan Door Tickets & Check-in"
                        >
                          <Scan className="w-4 h-4" />
                        </button>
                        <Link
                          to={`/events/${evt.id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
                          title="View Public Page"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/events/edit/${evt.id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition"
                          title="Edit Event"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setDeleteModalEvent(evt)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete Event"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalEvent && (
        <Modal
          isOpen={!!deleteModalEvent}
          onClose={() => setDeleteModalEvent(null)}
          title="Delete Event?"
          subtitle={deleteModalEvent.title}
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Are you sure you want to delete this event?</p>
                <p className="mt-0.5">This action will remove the event listing from the database and cancel all participant tickets.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setDeleteModalEvent(null)}>
                Keep Event
              </Button>
              <Button variant="danger" size="sm" loading={deleting} onClick={handleDelete}>
                Delete Event
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Attendees Modal */}
      {attendeesModalEvent && (
        <Modal
          isOpen={!!attendeesModalEvent}
          onClose={() => setAttendeesModalEvent(null)}
          title={`Registered Attendees: ${attendeesModalEvent.title}`}
          subtitle={`${attendeesList.length} total attendees registered`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            {loadingAttendees ? (
              <div className="py-8 flex justify-center text-brand-600">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : attendeesList.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">No attendees have registered for this event yet.</p>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Attendee</th>
                      <th className="p-3">Ticket Code</th>
                      <th className="p-3">Registered On</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendeesList.map((att) => (
                      <tr key={att.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{att.name}</p>
                          <p className="text-[11px] text-slate-500">{att.email}</p>
                        </td>
                        <td className="p-3 font-mono font-semibold text-brand-600">
                          {att.ticketCode}
                        </td>
                        <td className="p-3 text-slate-600">{formatDate(att.registeredAt)}</td>
                        <td className="p-3">
                          <Badge label={att.status} variant={att.status === 'CONFIRMED' ? 'success' : 'danger'} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setAttendeesModalEvent(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Live Door Attendance Scanner Modal */}
      {scanningEvent && (
        <AttendanceScannerModal
          eventId={scanningEvent.id}
          eventTitle={scanningEvent.title}
          isOpen={Boolean(scanningEvent)}
          onClose={() => {
            setScanningEvent(null);
            fetchOrganizerEvents();
          }}
        />
      )}
    </div>
  );
};
