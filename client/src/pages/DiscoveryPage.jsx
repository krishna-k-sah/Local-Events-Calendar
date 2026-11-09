import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Filter, MapPin, Tag, X, SlidersHorizontal, Loader2 } from 'lucide-react';
import eventService from '../services/eventService';
import favoriteService from '../services/favoriteService';
import registrationService from '../services/registrationService';
import { CATEGORIES } from '../utils/constants';
import { EventCard } from '../components/common/EventCard';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/common/Button';
import { RecommendedEvents } from '../components/events/RecommendedEvents';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

export const DiscoveryPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addNotification } = useNotifications();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [categoriesList, setCategoriesList] = useState(CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'ALL');
  const [selectedCity, setSelectedCity] = useState(searchParams.get('city') || 'ALL');
  const [priceFilter, setPriceFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('UPCOMING');
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  const [events, setEvents] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    eventService.getCategories().then((res) => {
      if (res.success && res.data?.length > 0) {
        setCategoriesList(res.data);
      }
    }).catch(() => {});
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = {
        q: query || undefined,
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        city: selectedCity !== 'ALL' ? selectedCity : undefined,
        price: priceFilter !== 'ALL' ? priceFilter : undefined,
        sort: sortBy,
      };

      const res = await eventService.getEvents(params);
      if (res.success) {
        setEvents(res.data);
      }

      if (isAuthenticated) {
        const favRes = await favoriteService.getFavorites();
        if (favRes.success) {
          setFavoriteIds(favRes.data?.favoriteIds || []);
        }
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [query, selectedCategory, selectedCity, priceFilter, sortBy, isAuthenticated]);

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
        fetchEvents(); // Refresh seat count
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Registration failed.');
    }
  };

  const resetFilters = () => {
    setQuery('');
    setSelectedCategory('ALL');
    setSelectedCity('ALL');
    setPriceFilter('ALL');
    setSortBy('UPCOMING');
    setSearchParams({});
  };

  const hasActiveFilters =
    query || selectedCategory !== 'ALL' || selectedCity !== 'ALL' || priceFilter !== 'ALL';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader
        title="Discover Local Events"
        subtitle={`Showing ${events.length} events across your community`}
        breadcrumbs={['Home', 'Events', 'Discovery']}
        actions={
          <button
            onClick={() => setShowFiltersMobile(!showFiltersMobile)}
            className="md:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold bg-white text-slate-700"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters {hasActiveFilters && '(Active)'}
          </button>
        }
      />

      {/* Filter Bar */}
      <div className={`p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-3 ${showFiltersMobile ? 'block' : 'hidden md:block'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, venue..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="relative">
            <Tag className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-slate-700 focus:outline-none focus:border-brand-500 bg-white"
            >
              <option value="ALL">All Categories</option>
              {categoriesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-slate-700 focus:outline-none focus:border-brand-500 bg-white"
            >
              <option value="ALL">All Cities</option>
              <option value="San Francisco">San Francisco</option>
              <option value="Austin">Austin</option>
              <option value="Seattle">Seattle</option>
            </select>
          </div>

          <div className="flex gap-2">
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="w-1/2 text-xs rounded-lg border border-slate-200 px-2 py-2 text-slate-700 focus:outline-none focus:border-brand-500 bg-white"
            >
              <option value="ALL">All Prices</option>
              <option value="FREE">Free Only</option>
              <option value="PAID">Paid Only</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-1/2 text-xs rounded-lg border border-slate-200 px-2 py-2 text-slate-700 focus:outline-none focus:border-brand-500 bg-white"
            >
              <option value="UPCOMING">Upcoming</option>
              <option value="NEWEST">Newest</option>
              <option value="POPULAR">Most Popular</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-1.5 text-slate-600">
              <span className="font-semibold text-slate-500">Active filters:</span>
              {query && <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">Keyword: "{query}"</span>}
              {selectedCategory !== 'ALL' && (
                <span className="px-2 py-0.5 rounded bg-brand-50 text-brand-700">
                  {categoriesList.find((c) => c.id === selectedCategory)?.name || selectedCategory}
                </span>
              )}
              {selectedCity !== 'ALL' && <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">{selectedCity}</span>}
              {priceFilter !== 'ALL' && <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">{priceFilter}</span>}
            </div>

            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="py-20 flex justify-center items-center text-brand-600">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm">
          <h3 className="text-base font-bold text-slate-900">No events matched your criteria</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search terms or clearing the active filters.
          </p>
          <Button variant="secondary" size="sm" onClick={resetFilters} className="mt-4">
            Clear All Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((evt) => (
            <EventCard
              key={evt.id}
              event={evt}
              isFavorited={favoriteIds.includes(evt.id)}
              onToggleFavorite={handleToggleFavorite}
              onRegister={handleRegister}
            />
          ))}
        </div>
      )}

      {/* Intelligent Recommendations */}
      <div className="pt-8 border-t border-slate-200">
        <RecommendedEvents
          title="Curated Recommendations"
          subtitle="Events dynamically tailored to your community interests and attendance history"
        />
      </div>
    </div>
  );
};
