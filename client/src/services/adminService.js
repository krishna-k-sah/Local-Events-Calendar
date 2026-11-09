import api from './api';

export const adminService = {
  async getDashboardMetrics() {
    const res = await api.get('/admin/dashboard');
    return res.data;
  },

  async getUsers(params = {}) {
    const res = await api.get('/admin/users', { params });
    return res.data;
  },

  async updateUserRole(id, role) {
    const res = await api.put(`/admin/users/${id}/role`, { role });
    return res.data;
  },

  async deleteUser(id) {
    const res = await api.delete(`/admin/users/${id}`);
    return res.data;
  },

  async getPendingEvents() {
    const res = await api.get('/admin/events/pending');
    return res.data;
  },

  async approveEvent(id) {
    const res = await api.put(`/admin/events/${id}/approve`);
    return res.data;
  },

  async rejectEvent(id, reason) {
    const res = await api.put(`/admin/events/${id}/reject`, { reason });
    return res.data;
  },

  async getCategories() {
    const res = await api.get('/admin/categories');
    return res.data;
  },

  async createCategory(data) {
    const res = await api.post('/admin/categories', data);
    return res.data;
  },

  async updateCategory(id, data) {
    const res = await api.put(`/admin/categories/${id}`, data);
    return res.data;
  },

  async deleteCategory(id) {
    const res = await api.delete(`/admin/categories/${id}`);
    return res.data;
  },

  async getReports(type = 'EVENTS') {
    const res = await api.get('/admin/reports', { params: { type } });
    return res.data;
  },
};

export default adminService;

