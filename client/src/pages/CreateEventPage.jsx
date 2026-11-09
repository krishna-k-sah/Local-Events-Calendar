import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Input, Select } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { CATEGORIES } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import eventService from '../services/eventService';
import { AlertCircle } from 'lucide-react';

export const CreateEventPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotifications();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('17:00');
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('San Francisco');
  const [maxCapacity, setMaxCapacity] = useState('100');
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState('0');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [posterPreview, setPosterPreview] = useState('https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title || !description || !startDate || !venueName || !address) {
      setError('Please provide all required fields.');
      return;
    }

    setLoading(true);
    try {
      const startDateTime = new Date(`${startDate}T${startTime}:00`).toISOString();
      const endDateTime = endDate ? new Date(`${endDate}T${endTime}:00`).toISOString() : null;
      const regDeadlineDateTime = registrationDeadline ? new Date(`${registrationDeadline}T23:59:59`).toISOString() : null;

      const res = await eventService.createEvent({
        title,
        description,
        categoryId,
        startDate: startDateTime,
        endDate: endDateTime,
        registrationDeadline: regDeadlineDateTime,
        venueName,
        address,
        city,
        maxCapacity: parseInt(maxCapacity, 10),
        isFree,
        price: isFree ? 0 : parseFloat(price) || 0,
        contactEmail,
        contactPhone,
        posterImage: posterPreview,
      });

      if (res.success) {
        addNotification({
          title: 'Event Created Successfully',
          message: res.message,
          type: 'EVENT_APPROVAL',
        });
        navigate('/organizer/events');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create event.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader
        title="Host a New Community Event"
        subtitle="Fill in the event details, venue logistics, ticketing parameters, and media poster"
        breadcrumbs={['Organizer', 'Create Event']}
      />

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm">
        {/* Section 1: Basic Information */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-brand-600">
            1. Basic Information
          </h2>

          <Input
            label="Event Title"
            required
            placeholder="e.g. Bay Area AI Hackathon & Networking"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Event Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="Describe the schedule, speakers, target audience, prerequisites, and what attendees will experience..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="block w-full rounded-lg border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 p-3 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Category"
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={CATEGORIES.map((c) => ({ label: c.name, value: c.id }))}
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Poster Image URL / Preview
              </label>
              <input
                type="text"
                placeholder="https://images.unsplash.com/..."
                value={posterPreview}
                onChange={(e) => setPosterPreview(e.target.value)}
                className="block w-full rounded-lg border border-slate-200 bg-white text-xs text-slate-900 px-3 py-2.5 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Date & Schedule */}
        <div className="space-y-4 pt-6 border-t border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-brand-600">
            2. Date & Schedule
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="Start Time"
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <Input
              label="End Time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          <Input
            label="Registration Deadline"
            type="date"
            helperText="Last day attendees are allowed to RSVP or book tickets."
            value={registrationDeadline}
            onChange={(e) => setRegistrationDeadline(e.target.value)}
          />
        </div>

        {/* Section 3: Venue & Logistics */}
        <div className="space-y-4 pt-6 border-t border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-brand-600">
            3. Venue & Logistics
          </h2>

          <Input
            label="Venue Name"
            required
            placeholder="e.g. Fort Mason Center Festival Pavilion"
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Full Address"
                required
                placeholder="2 Marina Blvd, Building A"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div>
              <Input
                label="City"
                required
                placeholder="San Francisco"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Capacity & Ticketing */}
        <div className="space-y-4 pt-6 border-t border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-brand-600">
            4. Capacity & Ticketing
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Max Participant Capacity"
              type="number"
              min="1"
              required
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(e.target.value)}
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Pricing Structure
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setIsFree(true); setPrice('0'); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition ${
                    isFree ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Free Event
                </button>
                <button
                  type="button"
                  onClick={() => setIsFree(false)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition ${
                    !isFree ? 'bg-brand-50 border-brand-500 text-brand-700' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Paid Admission
                </button>
              </div>
            </div>

            {!isFree && (
              <Input
                label="Price Per Ticket ($)"
                type="number"
                min="1"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            )}
          </div>
        </div>

        {/* Section 5: Organizer Contact */}
        <div className="space-y-4 pt-6 border-t border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-brand-600">
            5. Contact Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Email"
              type="email"
              required
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
            <Input
              label="Contact Phone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
          <Button variant="secondary" onClick={() => navigate('/organizer/events')}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} size="lg">
            Submit Event
          </Button>
        </div>
      </form>
    </div>
  );
};
