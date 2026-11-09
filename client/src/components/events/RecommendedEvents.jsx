import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Calendar, MapPin, Users, ArrowRight } from 'lucide-react';
import { recommendationService } from '../../services/eventOperationsService';

export const RecommendedEvents = ({ title = 'Recommended For You', subtitle = 'AI-driven personalized picks based on your attendance, favorites, and location' }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadRecs = async () => {
      try {
        const res = await recommendationService.getRecommendations();
        if (isMounted) {
          setRecommendations(res.data || []);
        }
      } catch (err) {
        console.error('Failed to load recommendations:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadRecs();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="py-6 animate-pulse">
        <div className="h-6 w-48 bg-slate-200 rounded-lg mb-2" />
        <div className="h-4 w-72 bg-slate-100 rounded-lg mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-slate-100 rounded-3xl border border-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <section className="py-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-2">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200/80 text-brand-700 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Personalized Intelligence
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <Link
          to="/discover"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition"
        >
          Explore All Events <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommendations.slice(0, 3).map((event) => (
          <div
            key={event.id}
            className="group relative bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-brand-200 transition-all duration-300 overflow-hidden flex flex-col"
          >
            {/* Poster / Badge */}
            <div className="relative h-44 overflow-hidden bg-slate-100">
              <img
                src={
                  event.posterImage ||
                  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80'
                }
                alt={event.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />

              {/* Explainable AI Reason Badge */}
              {event.recommendationReason && (
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md text-[11px] font-bold text-brand-700 shadow-sm border border-brand-100">
                    <Sparkles className="w-3 h-3 text-brand-500" />
                    {event.recommendationReason}
                  </span>
                </div>
              )}

              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-900/70 backdrop-blur-sm">
                  {event.category || 'General'}
                </span>
                <span className="text-xs font-bold text-emerald-400">
                  {event.isFree ? 'FREE' : `$${event.price}`}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm group-hover:text-brand-600 transition-colors line-clamp-1 mb-2">
                  {event.title}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4">{event.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    {new Date(event.startDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{event.venueName || event.city}</span>
                </div>
                <div className="flex items-center justify-between pt-3 mt-2">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Users className="w-3.5 h-3.5" />
                    <span>
                      {event.registeredCount || 0} / {event.maxCapacity} booked
                    </span>
                  </div>
                  <Link
                    to={`/events/${event.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 transition"
                  >
                    View Event <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

