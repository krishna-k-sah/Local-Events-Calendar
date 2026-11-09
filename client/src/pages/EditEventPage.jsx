import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Input, Select } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { CATEGORIES } from '../utils/constants';
import eventService from '../services/eventService';
import { useNotifications } from '../context/NotificationContext';
import { Loader2, AlertCircle } from 'lucide-react';

export const EditEventPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoriesList, setCategoriesList] = useState(CATEGORIES);
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id);
  const [startDate, setStartDate] = useState('');
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('100');
  const [price, setPrice] = useState('0');
  const [isFree, setIsFree] = useState(true);
  const [posterImage, setPosterImage] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    eventService.getCategories().then((res) => {
      if (res.success && res.data?.length > 0) {
        setCategoriesList(res.data);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const loadEvent = async () => {
      try {
        const res = await eventService.getEventById(id);
        if (res.success) {
          const e = res.data;
          setTitle(e.title);
          setDescription(e.description);
          setCategoryId(e.categoryId);
          setStartDate(e.startDate ? e.startDate.substring(0, 10) : '');
          setVenueName(e.venueName || '');
          setAddress(e.address || '');
          setCity(e.city || '');
          setMaxCapacity(String(e.maxCapacity));
          setPrice(String(e.price));
          setIsFree(e.isFree);
          setPosterImage(e.posterImage || '');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load event.');
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await eventService.updateEvent(id, {
        title: title.trim(),
        description: description.trim(),
        categoryId,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        venueName: venueName.trim(),
        address: address.trim(),
        city: city.trim(),
        maxCapacity: parseInt(maxCapacity, 10) || 100,
        isFree: Boolean(isFree),
        price: isFree ? 0 : parseFloat(price) || 0,
        posterImage: posterImage?.trim() || null,
      });

      if (res.success) {
        addNotification({
          title: 'Event Updated',
          message: `Your changes to "${title}" were saved to the database.`,
          type: 'EVENT_APPROVAL',
        });
        navigate('/organizer/events');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update event.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center items-center text-brand-600">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader
        title={`Edit Event: ${title}`}
        subtitle="Update event dates, venue location, capacity, or ticketing settings"
        breadcrumbs={['Organizer', 'My Events', 'Edit']}
      />

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm">
        <Input
          label="Event Title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Event Description
          </label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="block w-full rounded-lg border border-slate-200 text-xs sm:text-sm text-slate-900 p-3 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            options={categoriesList.map((c) => ({ label: c.name, value: c.id }))}
          />
          <Input
            label="Start Date"
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Venue Name"
            required
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
          />
          <Input
            label="Address"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <Input
            label="City"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Maximum Capacity"
            type="number"
            min="1"
            required
            value={maxCapacity}
            onChange={(e) => setMaxCapacity(e.target.value)}
          />
          <Input
            label="Ticket Price ($)"
            type="number"
            min="0"
            step="0.01"
            required
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
              setIsFree(Number(e.target.value) === 0);
            }}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="secondary" onClick={() => navigate('/organizer/events')}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
};
