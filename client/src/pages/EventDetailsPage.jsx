import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  DollarSign,
  Mail,
  Phone,
  Heart,
  Share2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Shield,
  Loader2
} from 'lucide-react';
import eventService from '../services/eventService';
import registrationService from '../services/registrationService';
import favoriteService from '../services/favoriteService';
import { waitlistService } from '../services/eventOperationsService';
import { formatDate, formatTime, formatCurrency } from '../utils/constants';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { RecommendedEvents } from '../components/events/RecommendedEvents';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

export const EventDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { addNotification } = useNotifications();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [ticketCode, setTicketCode] = useState('');
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [registering, setRegistering] = useState(false);
  const [waitlistInfo, setWaitlistInfo] = useState({ onWaitlist: false, position: null, totalWaitlist: 0 });
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  const fetchWaitlistStatus = async () => {
    try {
      const res = await waitlistService.getWaitlistStatus(id);
      if (res.success) {
        setWaitlistInfo(res.data);
      }
    } catch (err) {
      console.error('Waitlist fetch error:', err);
    }
  };

  const fetchEventData = async () => {
    try {
      const res = await eventService.getEventById(id);
      if (res.success) {
        setEvent(res.data);
      }
      if (isAuthenticated) {
        const favRes = await favoriteService.getFavorites();
        if (favRes.success) {
          setIsFavorited((favRes.data?.favoriteIds || []).includes(id));
        }
      }
      await fetchWaitlistStatus();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setWaitlistLoading(true);
    try {
      const res = await waitlistService.joinWaitlist(id);
      if (res.success) {
        await fetchWaitlistStatus();
        addNotification({
          type: 'success',
          title: 'Waitlist Joined',
          message: res.message,
        });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to join waitlist.');
    } finally {
      setWaitlistLoading(false);
    }
  };

  const handleLeaveWaitlist = async () => {
    setWaitlistLoading(true);
    try {
      const res = await waitlistService.leaveWaitlist(id);
      if (res.success) {
        await fetchWaitlistStatus();
        addNotification({
          type: 'info',
          title: 'Waitlist Cancelled',
          message: res.message,
        });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to leave waitlist.');
    } finally {
      setWaitlistLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, [id, isAuthenticated]);

  useEffect(() => {
    if (user) {
      setAttendeeName(user.fullName || '');
      setAttendeeEmail(user.email || '');
    }
  }, [user]);

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      const res = await favoriteService.toggleFavorite(id);
      if (res.success) {
        setIsFavorited(res.isFavorited);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setRegistering(true);
    try {
      const res = await registrationService.registerForEvent(id);
      if (res.success) {
        setTicketCode(res.data.ticketCode);
        setIsRegisterModalOpen(false);
        setIsSuccessModalOpen(true);

        addNotification({
          title: 'Registration Confirmed!',
          message: `You're registered for "${event.title}". Pass #${res.data.ticketCode}.`,
          type: 'REGISTRATION_SUCCESS',
        });
        fetchEventData(); // Refresh seat count
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Registration failed.');
    } finally {
      setRegistering(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: event?.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Event link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center items-center text-brand-600">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <h2 className="text-xl font-bold text-slate-900">Event Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">This event listing may have been moved or removed.</p>
        <Link to="/discover" className="mt-4 inline-block">
          <Button size="sm">Browse Events</Button>
        </Link>
      </div>
    );
  }

  const isSoldOut = event.currentRegistered >= event.maxCapacity;
  const percentFilled = Math.min(100, Math.round((event.currentRegistered / event.maxCapacity) * 100));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <Link
          to="/discover"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Discover
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="relative h-80 sm:h-96 w-full rounded-3xl overflow-hidden shadow-lg bg-slate-900">
            <img
              src={event.posterImage || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80'}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

            <div className="absolute top-4 left-4 flex gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/95 backdrop-blur-md text-slate-900 shadow">
                {event.category}
              </span>
              <Badge status={event.status} />
            </div>

            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={handleToggleFavorite}
                className={`p-2.5 rounded-full backdrop-blur-md transition ${
                  isFavorited
                    ? 'bg-rose-500 text-white'
                    : 'bg-white/80 text-slate-700 hover:bg-white hover:text-rose-500'
                }`}
                title="Save Event"
              >
                <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={handleShare}
                className="p-2.5 rounded-full bg-white/80 text-slate-700 hover:bg-white transition"
                title="Share Event"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            <div className="absolute bottom-6 left-6 right-6 text-white">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{event.title}</h1>
              <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                Hosted by <strong className="text-white">{event.organizerName}</strong>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm text-xs text-slate-600">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase text-slate-400">Date</span>
              <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                <Calendar className="w-4 h-4 text-brand-600" />
                <span>{formatDate(event.startDate)}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase text-slate-400">Time</span>
              <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                <Clock className="w-4 h-4 text-brand-600" />
                <span>{formatTime(event.startDate)}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase text-slate-400">Price</span>
              <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                <DollarSign className="w-4 h-4 text-brand-600" />
                <span>{event.isFree ? 'Free Admission' : formatCurrency(event.price)}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase text-slate-400">Capacity</span>
              <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                <Users className="w-4 h-4 text-brand-600" />
                <span>{event.currentRegistered} / {event.maxCapacity}</span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900">About This Event</h2>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Location & Venue</h2>
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900">{event.venueName}</p>
                <p className="text-xs text-slate-500 mt-0.5">{event.address}, {event.city}</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Organizer Inquiries</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Mail className="w-4 h-4 text-brand-600" />
                <span>{event.contactEmail || 'contact@organizer.io'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="w-4 h-4 text-brand-600" />
                <span>{event.contactPhone || '+1 (555) 019-2834'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Booking Card */}
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xl space-y-6 sticky top-24">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Registration & Tickets
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-3xl font-black text-slate-900">
                  {event.isFree ? 'Free' : formatCurrency(event.price)}
                </span>
                <span className="text-xs text-slate-500">per ticket</span>
              </div>
            </div>

            <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>Reserved Seats</span>
                <span>{event.currentRegistered} / {event.maxCapacity}</span>
              </div>
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    percentFilled > 90 ? 'bg-rose-500' : 'bg-brand-600'
                  }`}
                  style={{ width: `${percentFilled}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                {Math.max(0, event.maxCapacity - event.currentRegistered)} tickets remaining
              </p>
            </div>

            {event.registrationDeadline && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 text-amber-800 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Registration closes on {formatDate(event.registrationDeadline)}.
                </span>
              </div>
            )}

            {isSoldOut ? (
              waitlistInfo.onWaitlist ? (
                <div className="space-y-3">
                  <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs text-center space-y-1">
                    <p className="font-bold text-sm">You are on the Waitlist</p>
                    <p className="text-xs text-amber-800">
                      Queue Position: <strong>#{waitlistInfo.position}</strong>
                    </p>
                    <p className="text-[11px] text-amber-600">
                      If an attendee cancels, your ticket will be automatically confirmed!
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full text-rose-600 border-rose-200 hover:bg-rose-50"
                    onClick={handleLeaveWaitlist}
                    loading={waitlistLoading}
                  >
                    Leave Waitlist
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-100 rounded-2xl text-slate-600 text-xs text-center">
                    All seats reserved • <strong>{waitlistInfo.totalWaitlist}</strong> in queue
                  </div>
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20"
                    onClick={handleJoinWaitlist}
                    loading={waitlistLoading}
                  >
                    Join Waitlist (Position #{waitlistInfo.totalWaitlist + 1})
                  </Button>
                </div>
              )
            ) : (
              <Button
                onClick={() => {
                  if (!isAuthenticated) {
                    navigate('/login');
                    return;
                  }
                  setIsRegisterModalOpen(true);
                }}
                size="lg"
                className="w-full shadow-lg"
              >
                Register for Event
              </Button>
            )}

            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                Instant Guaranteed Registration Ticket
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Events Section */}
      <div className="pt-6 border-t border-slate-200">
        <RecommendedEvents title="Similar Events You May Like" />
      </div>

      {/* Registration Modal */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title="Confirm Event Registration"
        subtitle={event.title}
      >
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
            <p><strong>Venue:</strong> {event.venueName}, {event.city}</p>
            <p><strong>Date:</strong> {formatDate(event.startDate)} at {formatTime(event.startDate)}</p>
            <p><strong>Cost:</strong> {event.isFree ? 'Free' : formatCurrency(event.price)}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Attendee Name
            </label>
            <input
              type="text"
              required
              value={attendeeName}
              onChange={(e) => setAttendeeName(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Confirmation Email
            </label>
            <input
              type="email"
              required
              value={attendeeEmail}
              onChange={(e) => setAttendeeEmail(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setIsRegisterModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={registering}>
              Confirm & Issue Ticket
            </Button>
          </div>
        </form>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title="Registration Confirmed!"
        subtitle="You are all set for this event"
      >
        <div className="text-center space-y-4 py-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div>
            <h4 className="text-base font-bold text-slate-900">{event.title}</h4>
            <p className="text-xs text-slate-500 mt-1">Ticket Code: <strong className="text-brand-600 font-mono text-sm">{ticketCode}</strong></p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs text-slate-600">
            A confirmation pass has been issued for <strong>{attendeeEmail}</strong> and saved in your registered tickets ledger.
          </div>

          <div className="flex justify-center gap-2 pt-2">
            <Link to="/my-registrations">
              <Button size="sm">
                View My Registrations
              </Button>
            </Link>
          </div>
        </div>
      </Modal>
    </div>
  );
};
