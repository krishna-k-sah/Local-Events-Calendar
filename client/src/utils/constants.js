export const ROLES = {
  ADMIN: 'ADMIN',
  ORGANIZER: 'ORGANIZER',
  USER: 'USER',
};

export const EVENT_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PUBLISHED: 'PUBLISHED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

export const CATEGORIES = [
  { id: 'cat-1', name: 'Technology & AI', slug: 'tech-ai', color: '#6366f1', icon: 'Cpu' },
  { id: 'cat-2', name: 'Music & Concerts', slug: 'music-concerts', color: '#ec4899', icon: 'Music' },
  { id: 'cat-3', name: 'Business & Networking', slug: 'business-networking', color: '#0ea5e9', icon: 'Briefcase' },
  { id: 'cat-4', name: 'Arts & Culture', slug: 'arts-culture', color: '#f59e0b', icon: 'Palette' },
  { id: 'cat-5', name: 'Sports & Fitness', slug: 'sports-fitness', color: '#10b981', icon: 'Activity' },
  { id: 'cat-6', name: 'Food & Culinary', slug: 'food-culinary', color: '#ef4444', icon: 'Utensils' },
  { id: 'cat-7', name: 'Community & Charity', slug: 'community-charity', color: '#8b5cf6', icon: 'Heart' },
  { id: 'cat-8', name: 'Workshops & Education', slug: 'workshops-education', color: '#14b8a6', icon: 'BookOpen' },
];

export const STATUS_COLORS = {
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  REJECTED: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  PUBLISHED: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  COMPLETED: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-500' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const formatCurrency = (amount) => {
  if (amount === 0 || amount === '0' || !amount) return 'Free';
  return `$${Number(amount).toFixed(2)}`;
};

