import api from './api';

export const eventService = {
  async getEvents(params = {}) {
    const res = await api.get('/events', { params });
    return res.data;
  },

  async getAllEvents(params = {}) {
    return this.getEvents(params);
  },

  async getCalendarEvents(params = {}) {
    const res = await api.get('/events/calendar', { params });
    return res.data;
  },

  async getFeaturedEvents() {
    const res = await api.get('/events/featured');
    return res.data;
  },

  async getEventById(id) {
    const res = await api.get(`/events/${id}`);
    return res.data;
  },

  async createEvent(data) {
    const res = await api.post('/events', data);
    return res.data;
  },

  async updateEvent(id, data) {
    const res = await api.put(`/events/${id}`, data);
    return res.data;
  },

  async deleteEvent(id) {
    const res = await api.delete(`/events/${id}`);
    return res.data;
  },

  async getOrganizerEvents() {
    const res = await api.get('/events/organizer/my');
    return res.data;
  },

  async getEventAttendees(id) {
    const res = await api.get(`/events/${id}/attendees`);
    return res.data;
  },
};

export default eventService;

