import React, { useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { CATEGORIES } from '../../utils/constants';
import { Filter, Calendar as CalendarIcon, Tag, Eye, MapPin, Users, Clock } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useNavigate } from 'react-router-dom';
import { formatDate, formatTime, formatCurrency } from '../../utils/constants';

export const EventCalendar = ({ events = [], onEventClick }) => {
  const calendarRef = useRef(null);
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [modalEvent, setModalEvent] = useState(null);

  // Map category color to events
  const calendarEvents = events
    .filter(evt => selectedCategory === 'ALL' || evt.categoryId === selectedCategory)
    .map(evt => {
      const cat = CATEGORIES.find(c => c.id === evt.categoryId);
      const color = cat ? cat.color : '#6366f1';
      return {
        id: evt.id,
        title: evt.title,
        start: evt.startDate,
        end: evt.endDate || evt.startDate,
        backgroundColor: color,
        borderColor: color,
        textColor: '#ffffff',
        extendedProps: evt,
      };
    });

  const handleEventClick = (info) => {
    const rawEvent = info.event.extendedProps;
    setModalEvent(rawEvent);
    if (onEventClick) {
      onEventClick(rawEvent);
    }
  };

  return (
    <div className="space-y-4">
      {/* Category Filter Pills Above Calendar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-2">
          <Filter className="w-3.5 h-3.5" />
          Filter:
        </div>
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
            selectedCategory === 'ALL'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Categories
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
              selectedCategory === cat.id
                ? 'text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            style={{
              backgroundColor: selectedCategory === cat.id ? cat.color : undefined
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: selectedCategory === cat.id ? '#ffffff' : cat.color }}
            />
            {cat.name}
          </button>
        ))}
      </div>

      {/* Main FullCalendar Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={calendarEvents}
          eventClick={handleEventClick}
          height="auto"
          dayMaxEvents={3}
          nowIndicator={true}
          buttonText={{
            today: 'Today',
            month: 'Month',
            week: 'Week',
            day: 'Day',
          }}
        />
      </div>

      {/* Event Details Quick Modal */}
      {modalEvent && (
        <Modal
          isOpen={!!modalEvent}
          onClose={() => setModalEvent(null)}
          title={modalEvent.title}
          subtitle={`${formatDate(modalEvent.startDate)} • ${modalEvent.venueName}`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4">
            <div className="h-44 w-full rounded-xl overflow-hidden bg-slate-100">
              <img
                src={modalEvent.posterImage || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80'}
                alt={modalEvent.title}
                className="w-full h-full object-cover"
              />
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {modalEvent.description}
            </p>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-600" />
                <span>{formatTime(modalEvent.startDate)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-600" />
                <span className="truncate">{modalEvent.venueName}, {modalEvent.city}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-600" />
                <span>{modalEvent.currentRegistered} / {modalEvent.maxCapacity} registered</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Tag className="w-4 h-4 text-brand-600" />
                <span>{modalEvent.isFree ? 'Free' : formatCurrency(modalEvent.price)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setModalEvent(null)}>
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setModalEvent(null);
                  navigate(`/events/${modalEvent.id}`);
                }}
              >
                Go to Event Page
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

