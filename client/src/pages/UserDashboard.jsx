import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/dashboard/StatCard';
import registrationService from '../services/registrationService';
import favoriteService from '../services/favoriteService';
import eventService from '../services/eventService';
import { formatDate, formatTime, formatCurrency } from '../utils/constants';
import { CheckCircle2, Bookmark, Calendar, ArrowRight, Clock, MapPin, PlusCircle, Loader2 } from 'lucide-react';
import { Button } from '../components/common/Button';
import { RecommendedEvents } from '../components/events/RecommendedEvents';

export const UserDashboard = () => {
  const { user, isOrganizer, isAdmin } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [regRes, favRes, eventsRes] = await Promise.all([
          registrationService.getUserRegistrations(),
          favoriteService.getFavorites(),
          eventService.getEvents({ limit: 4, sort: 'POPULAR' }),
        ]);

        if (regRes.success) setRegistrations(regRes.data);
        if (favRes.success) setFavoritesCount(favRes.data?.favoriteIds?.length || 0);
        if (eventsRes.success) setRecommendations(eventsRes.data);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const activeRegistrations = registrations.filter((r) => r.status === 'CONFIRMED');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <PageHeader
        title={`Welcome back, ${user?.fullName || 'User'}!`}
        subtitle="Here is an overview of your active event registrations and community schedule"
        breadcrumbs={['Home', 'Dashboard']}
        actions={
          <div className="flex gap-2">
            <Link to="/discover">
              <Button variant="secondary" size="sm">
                Browse Events
              </Button>
            </Link>
            {(isAdmin || isOrganizer) && (
              <Link to="/events/create">
                <Button size="sm" icon={PlusCircle}>
                  Post Event
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {loading ? (
        <div className="py-20 flex justify-center items-center text-brand-600">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <>
          {/* Overview Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Active Registrations"
              value={activeRegistrations.length}
              subtitle="Confirmed upcoming passes"
              icon={CheckCircle2}
              color="emerald"
            />
            <StatCard
              title="Saved Favorites"
              value={favoritesCount}
              subtitle="Bookmarked for later"
              icon={Bookmark}
              color="brand"
            />
            <StatCard
              title="Total Bookings"
              value={registrations.length}
              subtitle="All-time event bookings"
              icon={Calendar}
              color="indigo"
            />
            <StatCard
              title="Reward Points"
              value={registrations.length * 50 + 100}
              subtitle="Community participation points"
              icon={Clock}
              color="amber"
            />
          </div>

          {/* Active Registrations Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Your Upcoming Registered Events</h2>
                <p className="text-xs text-slate-500">Tickets and passes ready for your attendance</p>
              </div>
              <Link
                to="/my-registrations"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                View All ({registrations.length}) <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {registrations.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                <p className="text-xs text-slate-500">You haven't booked any event tickets yet.</p>
                <Link to="/discover" className="mt-2 inline-block">
                  <Button size="sm">Explore Events Near You</Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {registrations.map((reg) => (
                  <div
                    key={reg.id}
                    className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition"
                  >
                    <img
                      src={reg.posterImage || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80'}
                      alt={reg.eventTitle}
                      className="w-full sm:w-36 h-28 object-cover rounded-xl"
                    />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                            Pass #{reg.ticketCode}
                          </span>
                          <span className={`text-xs font-bold ${reg.status === 'CONFIRMED' ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {reg.status}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                          {reg.eventTitle}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatDate(reg.eventDate)}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {reg.venueName}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          {formatCurrency(reg.price)}
                        </span>
                        <Link
                          to={`/events/${reg.eventId}`}
                          className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                        >
                          View Details →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Intelligent Recommended Events Section */}
          <RecommendedEvents
            title="Personalized For You"
            subtitle="Curated based on your interests, past attendance, and local community trends"
          />
        </>
      )}
    </div>
  );
};
