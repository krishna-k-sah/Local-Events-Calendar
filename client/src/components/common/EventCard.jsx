import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Heart, ArrowRight } from 'lucide-react';
import { formatDate, formatTime, formatCurrency } from '../../utils/constants';
import { Badge } from './Badge';

export const EventCard = ({
  event,
  onRegister,
  onToggleFavorite,
  isFavorited = false,
  showActions = true,
}) => {
  const {
    id,
    title,
    description,
    category,
    startDate,
    venueName,
    city,
    price,
    isFree,
    maxCapacity,
    currentRegistered = 0,
    posterImage,
    status,
  } = event;

  const percentFilled = Math.min(100, Math.round((currentRegistered / (maxCapacity || 100)) * 100));
  const isSoldOut = currentRegistered >= maxCapacity;

  return (
    <div className="group relative flex flex-col rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden hover:-translate-y-1">
      {/* Poster Image & Badges */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-100">
        <img
          src={posterImage || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80'}
          alt={title}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-md text-slate-800 shadow-sm">
            {category}
          </span>
          {status && status !== 'PUBLISHED' && (
            <Badge status={status} size="sm" />
          )}
        </div>

        {/* Favorite Heart Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFavorite?.(id);
          }}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition ${
            isFavorited
              ? 'bg-rose-500 text-white shadow-md'
              : 'bg-white/80 text-slate-700 hover:bg-white hover:text-rose-500'
          }`}
          title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
        </button>

        {/* Price & Date Tag on bottom of image */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-900/80 backdrop-blur-sm">
            {formatDate(startDate)} • {formatTime(startDate)}
          </span>
          <span className="font-bold text-sm bg-brand-600/90 backdrop-blur-sm px-2.5 py-0.5 rounded-full shadow">
            {isFree || price === 0 ? 'FREE' : formatCurrency(price)}
          </span>
        </div>
      </div>

      {/* Event Content */}
      <div className="flex flex-1 flex-col p-5">
        <Link to={`/events/${id}`} className="group-hover:text-brand-600 transition">
          <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-1 mb-1.5">
            {title}
          </h3>
        </Link>
        <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
          {description}
        </p>

        {/* Venue & Location */}
        <div className="mt-auto space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate font-medium">{venueName}, {city}</span>
          </div>

          {/* Capacity Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3 text-slate-400" />
                Capacity
              </span>
              <span className={`font-semibold ${isSoldOut ? 'text-rose-600' : 'text-slate-700'}`}>
                {currentRegistered} / {maxCapacity} {isSoldOut && '(Sold Out)'}
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  percentFilled > 90
                    ? 'bg-rose-500'
                    : percentFilled > 70
                    ? 'bg-amber-500'
                    : 'bg-brand-500'
                }`}
                style={{ width: `${percentFilled}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        {showActions && (
          <div className="mt-4 pt-3 flex items-center gap-2">
            <Link
              to={`/events/${id}`}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition"
            >
              Details
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={() => onRegister?.(event)}
              disabled={isSoldOut}
              className={`inline-flex items-center justify-center text-xs font-semibold py-2 px-4 rounded-lg transition shadow-sm ${
                isSoldOut
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-brand-600 hover:bg-brand-700 text-white'
              }`}
            >
              {isSoldOut ? 'Sold Out' : 'RSVP Now'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

