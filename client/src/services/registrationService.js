import api from './api';

export const registrationService = {
  async registerForEvent(eventId) {
    const res = await api.post(`/events/${eventId}/register`);
    return res.data;
  },

  async cancelRegistration(eventId) {
    const res = await api.delete(`/events/${eventId}/register`);
    return res.data;
  },

  async getUserRegistrations() {
    const res = await api.get('/registrations/my');
    return res.data;
  },
};

export default registrationService;

