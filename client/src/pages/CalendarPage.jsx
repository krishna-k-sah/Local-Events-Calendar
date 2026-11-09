import React, { useState, useEffect } from 'react';
import { EventCalendar } from '../components/calendar/EventCalendar';
import { PageHeader } from '../components/layout/PageHeader';
import eventService from '../services/eventService';
import { Link } from 'react-router-dom';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const CalendarPage = () => {
  const { isAdmin, isOrganizer } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCalendar = async () => {
      try {
        const res = await eventService.getEvents({ limit: 100 });
        if (res.success) {
          setEvents(res.data);
        }
      } catch (err) {
        console.error('Failed to load calendar events:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCalendar();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader
        title="Interactive Community Calendar"
        subtitle="Explore upcoming local gatherings across monthly, weekly, and daily schedules"
        breadcrumbs={['Home', 'Calendar']}
        actions={
          (isAdmin || isOrganizer) && (
            <Link
              to="/events/create"
              className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition"
            >
              <PlusCircle className="w-4 h-4" />
              Schedule Event
            </Link>
          )
        }
      />

      {loading ? (
        <div className="py-20 flex justify-center items-center text-brand-600">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <EventCalendar events={events} />
      )}
    </div>
  );
};
