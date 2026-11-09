import api from './api';

export const ticketService = {
  getTicketDetails: async (ticketCode) => {
    const res = await api.get(`/tickets/${ticketCode}`);
    return res.data;
  },
};

export const attendanceService = {
  scanTicket: async ({ ticketCodeOrToken, eventId, method = 'QR', notes }) => {
    const res = await api.post('/attendance/scan', {
      ticketCodeOrToken,
      eventId,
      method,
      notes,
    });
    return res.data;
  },
  getEventAttendance: async (eventId) => {
    const res = await api.get(`/attendance/events/${eventId}`);
    return res.data;
  },
  getExportCsvUrl: (eventId) => {
    return `/api/attendance/events/${eventId}/export`;
  },
};

export const waitlistService = {
  joinWaitlist: async (eventId) => {
    const res = await api.post(`/events/${eventId}/waitlist`);
    return res.data;
  },
  leaveWaitlist: async (eventId) => {
    const res = await api.delete(`/events/${eventId}/waitlist`);
    return res.data;
  },
  getWaitlistStatus: async (eventId) => {
    const res = await api.get(`/events/${eventId}/waitlist/status`);
    return res.data;
  },
  getEventWaitlist: async (eventId) => {
    const res = await api.get(`/events/${eventId}/waitlist`);
    return res.data;
  },
};

export const recommendationService = {
  getRecommendations: async () => {
    const res = await api.get('/recommendations');
    return res.data;
  },
};

export const analyticsService = {
  getOrganizerAnalytics: async () => {
    const res = await api.get('/organizer/analytics');
    return res.data;
  },
};

export const reminderService = {
  triggerReminders: async () => {
    const res = await api.post('/reminders/trigger');
    return res.data;
  },
};

export default {
  ticketService,
  attendanceService,
  waitlistService,
  recommendationService,
  analyticsService,
  reminderService,
};

