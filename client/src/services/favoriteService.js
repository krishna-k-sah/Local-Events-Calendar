import api from './api';

export const favoriteService = {
  async getFavorites() {
    const res = await api.get('/favorites');
    return res.data;
  },

  async toggleFavorite(eventId) {
    const res = await api.post(`/events/${eventId}/favorite`);
    return res.data;
  },
};

export default favoriteService;

