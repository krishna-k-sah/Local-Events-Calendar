import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import favoriteService from '../services/favoriteService';
import registrationService from '../services/registrationService';
import { EventCard } from '../components/common/EventCard';
import { Heart, Loader2 } from 'lucide-react';
import { Button } from '../components/common/Button';
import { useNotifications } from '../context/NotificationContext';

export const FavoritesPage = () => {
  const [favoriteEvents, setFavoriteEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addNotification } = useNotifications();

  const fetchFavorites = async () => {
    try {
      const res = await favoriteService.getFavorites();
      if (res.success) {
        setFavoriteEvents(res.data?.events || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const handleToggleFavorite = async (id) => {
    try {
      const res = await favoriteService.toggleFavorite(id);
      if (res.success) {
        setFavoriteEvents((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegister = async (event) => {
    try {
      const res = await registrationService.registerForEvent(event.id);
      if (res.success) {
        addNotification({
          title: 'Registration Confirmed!',
          message: `You're registered for "${event.title}". Pass #${res.data.ticketCode}.`,
          type: 'REGISTRATION_SUCCESS',
        });
        alert(`Registered for ${event.title}! Ticket #${res.data.ticketCode}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Registration failed.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader
        title="Saved Favorite Events"
        subtitle="Bookmarked events and experiences you are interested in attending"
        breadcrumbs={['Dashboard', 'Saved Events']}
      />

      {loading ? (
        <div className="py-20 flex justify-center items-center text-brand-600">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : favoriteEvents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm">
          <Heart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">No Saved Events Yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Click the heart icon on any event card to save it here for quick access later.
          </p>
          <Link to="/discover" className="mt-4 inline-block">
            <Button size="sm">Explore Events</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoriteEvents.map((evt) => (
            <EventCard
              key={evt.id}
              event={evt}
              isFavorited={true}
              onToggleFavorite={handleToggleFavorite}
              onRegister={handleRegister}
            />
          ))}
        </div>
      )}
    </div>
  );
};
