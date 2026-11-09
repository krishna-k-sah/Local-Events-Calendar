import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import registrationService from '../services/registrationService';
import { formatDate, formatCurrency } from '../utils/constants';
import { Calendar, MapPin, Ticket, AlertTriangle, Loader2, QrCode } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { QrTicketModal } from '../components/tickets/QrTicketModal';

export const MyRegistrationsPage = () => {
  const [registrations, setRegistrations] = useState([]);
  const [cancelModalItem, setCancelModalItem] = useState(null);
  const [selectedTicketCode, setSelectedTicketCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const fetchRegistrations = async () => {
    try {
      const res = await registrationService.getUserRegistrations();
      if (res.success) {
        setRegistrations(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const handleCancelRegistration = async () => {
    if (!cancelModalItem) return;
    setCancelling(true);
    try {
      const res = await registrationService.cancelRegistration(cancelModalItem.eventId);
      if (res.success) {
        setRegistrations((prev) =>
          prev.map((reg) =>
            reg.id === cancelModalItem.id ? { ...reg, status: 'CANCELLED' } : reg
          )
        );
        setCancelModalItem(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Cancellation failed.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader
        title="My Event Registrations"
        subtitle="Manage your booked tickets, view digital badges, or cancel attendance"
        breadcrumbs={['Dashboard', 'Registrations']}
      />

      {loading ? (
        <div className="py-20 flex justify-center items-center text-brand-600">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : registrations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8">
          <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">No Registrations Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            You haven't registered for any events yet. Explore upcoming gatherings in your local community!
          </p>
          <Link to="/discover" className="mt-4 inline-block">
            <Button size="sm">Discover Events</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {registrations.map((reg) => {
            const isCancelled = reg.status === 'CANCELLED';
            return (
              <div
                key={reg.id}
                className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm transition ${
                  isCancelled ? 'opacity-60 bg-slate-50/70' : 'hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-4">
                  <img
                    src={reg.posterImage || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80'}
                    alt={reg.eventTitle}
                    className="w-20 h-20 rounded-xl object-cover shrink-0 hidden sm:block"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                        Ticket: {reg.ticketCode}
                      </span>
                      <Badge
                        status={reg.status}
                        label={reg.status}
                        variant={isCancelled ? 'danger' : 'success'}
                      />
                    </div>
                    <Link
                      to={`/events/${reg.eventId}`}
                      className="text-base font-bold text-slate-900 hover:text-brand-600 transition block"
                    >
                      {reg.eventTitle}
                    </Link>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(reg.eventDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {reg.venueName}
                      </span>
                      <span className="font-semibold text-slate-700">
                        {formatCurrency(reg.price)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0">
                  {!isCancelled && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setSelectedTicketCode(reg.ticketCode)}
                      className="bg-brand-600 hover:bg-brand-700 text-white flex items-center gap-1.5 shadow-sm shadow-brand-500/20"
                    >
                      <QrCode className="w-3.5 h-3.5" /> View Pass
                    </Button>
                  )}
                  <Link to={`/events/${reg.eventId}`}>
                    <Button variant="secondary" size="sm">
                      Details
                    </Button>
                  </Link>
                  {!isCancelled && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCancelModalItem(reg)}
                      className="text-rose-600 border-rose-200 hover:bg-rose-50"
                    >
                      Cancel RSVP
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel RSVP Confirmation Modal */}
      {cancelModalItem && (
        <Modal
          isOpen={!!cancelModalItem}
          onClose={() => setCancelModalItem(null)}
          title="Cancel Registration?"
          subtitle={cancelModalItem.eventTitle}
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">This will release your reserved seat.</p>
                <p className="mt-0.5">Ticket #{cancelModalItem.ticketCode} will be voided and your spot will become available to other community attendees.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setCancelModalItem(null)}>
                Keep Reservation
              </Button>
              <Button variant="danger" size="sm" loading={cancelling} onClick={handleCancelRegistration}>
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Digital QR Ticket Pass Modal */}
      <QrTicketModal
        ticketCode={selectedTicketCode}
        isOpen={Boolean(selectedTicketCode)}
        onClose={() => setSelectedTicketCode(null)}
      />
    </div>
  );
};
