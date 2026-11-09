import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Search,
  Sparkles,
  MapPin,
  ArrowRight,
  TrendingUp,
  Tag,
  Loader2
} from 'lucide-react';
import eventService from '../services/eventService';
import favoriteService from '../services/favoriteService';
import registrationService from '../services/registrationService';
import { CATEGORIES } from '../utils/constants';
import { EventCard } from '../components/common/EventCard';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

export const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addNotification } = useNotifications();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const [featuredRes, upcomingRes] = await Promise.all([
          eventService.getFeaturedEvents(),
          eventService.getEvents({ limit: 6, sort: 'UPCOMING' }),
        ]);

        if (featuredRes.success) setFeaturedEvents(featuredRes.data);
        if (upcomingRes.success) setUpcomingEvents(upcomingRes.data);

        if (isAuthenticated) {
          const favRes = await favoriteService.getFavorites();
          if (favRes.success) setFavoriteIds(favRes.data.favoriteIds);
        }
      } catch (err) {
        console.error('Failed to load landing events:', err);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [isAuthenticated]);

  const handleToggleFavorite = async (id) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      const res = await favoriteService.toggleFavorite(id);
      if (res.success) {
        setFavoriteIds((prev) =>
          res.isFavorited ? [...prev, id] : prev.filter((item) => item !== id)
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegister = async (event) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      const res = await registrationService.registerForEvent(event.id);
      if (res.success) {
        addNotification({
          title: 'Registration Confirmed!',
          message: `You're registered for "${event.title}". Pass #${res.data.ticketCode}.`,
          type: 'REGISTRATION_SUCCESS',
        });
        alert(`Successfully registered for ${event.title}! Ticket #${res.data.ticketCode}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Registration failed.');
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate(`/discover?q=${encodeURIComponent(searchQuery)}&city=${encodeURIComponent(selectedCity)}`);
  };

  return (
    <div className="space-y-20 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-indigo-50/50 via-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200/80 text-brand-700 text-xs font-semibold mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>Discover What's Happening in Your Community</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15] max-w-4xl mx-auto">
            Experience Local Events.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600">
              Never Miss Out Again.
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            The modern, centralized hub for discovering live concerts, developer summits, artisan workshops, and neighborhood gatherings with one-click registration.
          </p>

          {/* Search Bar Widget */}
          <form
            onSubmit={handleSearchSubmit}
            className="mt-10 max-w-3xl mx-auto p-2 sm:p-2.5 rounded-2xl bg-white border border-slate-200 shadow-xl flex flex-col sm:flex-row items-center gap-2"
          >
            <div className="flex-1 flex items-center gap-2.5 px-3 py-2 w-full">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search events, workshops, keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none bg-transparent"
              />
            </div>

            <div className="hidden sm:block w-px h-8 bg-slate-200" />

            <div className="flex items-center gap-2 px-3 py-2 w-full sm:w-48">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full text-xs sm:text-sm text-slate-700 focus:outline-none bg-transparent"
              >
                <option value="">All Cities</option>
                <option value="San Francisco">San Francisco</option>
                <option value="Austin">Austin</option>
                <option value="Seattle">Seattle</option>
              </select>
            </div>

            <Button type="submit" size="md" className="w-full sm:w-auto shrink-0 shadow-md">
              Find Events
            </Button>
          </form>

          {/* Stats Bar */}
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto text-center border-t border-slate-200/60 pt-8">
            <div>
              <p className="text-2xl font-black text-slate-900">500+</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Local Events Hosted</p>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">25,000+</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Active Attendees</p>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">98%</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Positive Satisfaction</p>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">120+</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Verified Organizers</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600">Categories</span>
            <h2 className="text-2xl font-black text-slate-900 mt-1">Explore By Interest</h2>
          </div>
          <Link to="/discover" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
            View All Categories <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              to={`/discover?category=${cat.id}`}
              className="group p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-brand-300 transition text-center flex flex-col items-center"
            >
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white mb-2 shadow-sm group-hover:scale-110 transition-transform"
                style={{ backgroundColor: cat.color }}
              >
                <Tag className="w-5 h-5" />
              </span>
              <span className="text-xs font-semibold text-slate-800 group-hover:text-brand-600 transition">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Events Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600">Curated</span>
            <h2 className="text-2xl font-black text-slate-900 mt-1">Featured Local Experiences</h2>
          </div>
          <Link to="/discover?featured=true" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
            Browse All Featured <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center items-center text-brand-600">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredEvents.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 border border-slate-200 rounded-2xl">
                <Calendar className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                <p className="font-medium">No featured events currently available.</p>
                <p className="text-xs text-slate-400 mt-1">Check back soon or explore our full event catalog.</p>
              </div>
            ) : (
              featuredEvents.map((evt) => (
                <EventCard
                  key={evt.id}
                  event={evt}
                  isFavorited={favoriteIds.includes(evt.id)}
                  onToggleFavorite={handleToggleFavorite}
                  onRegister={handleRegister}
                />
              ))
            )}
          </div>
        )}
      </section>

      {/* Upcoming Events Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600">Directory</span>
            <h2 className="text-2xl font-black text-slate-900 mt-1">Upcoming Events Near You</h2>
          </div>
          <Link to="/discover" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
            View All Events <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center items-center text-brand-600">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 border border-slate-200 rounded-2xl">
                <Calendar className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                <p className="font-medium">No upcoming events found.</p>
                <p className="text-xs text-slate-400 mt-1">Stay tuned for new community experiences.</p>
              </div>
            ) : (
              upcomingEvents.map((evt) => (
                <EventCard
                  key={evt.id}
                  event={evt}
                  isFavorited={favoriteIds.includes(evt.id)}
                  onToggleFavorite={handleToggleFavorite}
                  onRegister={handleRegister}
                />
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
};
