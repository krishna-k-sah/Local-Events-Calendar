import React from 'react';
import { STATUS_COLORS } from '../../utils/constants';

export const Badge = ({
  status,
  label,
  variant,
  size = 'md',
  dot = true,
  className = ''
}) => {
  let style = { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-400' };

  if (status && STATUS_COLORS[status]) {
    style = STATUS_COLORS[status];
  } else if (variant === 'primary') {
    style = { bg: 'bg-brand-50', text: 'text-brand-700', border: 'border-brand-200', dot: 'bg-brand-500' };
  } else if (variant === 'success') {
    style = { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' };
  } else if (variant === 'warning') {
    style = { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' };
  } else if (variant === 'danger') {
    style = { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' };
  }

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${style.bg} ${style.text} ${style.border} ${sizeClass} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />}
      {label || status}
    </span>
  );
};

