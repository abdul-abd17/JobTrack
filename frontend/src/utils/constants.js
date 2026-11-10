// Status definitions, badges, labels, and color palettes
export const APPLICATION_STATUS = {
  APPLIED: {
    value: 'APPLIED',
    label: 'Applied',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-600/20',
    dotClass: 'bg-blue-500',
    chartColor: '#3b82f6',
  },
  UNDER_REVIEW: {
    value: 'UNDER_REVIEW',
    label: 'Under Review',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 ring-purple-600/20',
    dotClass: 'bg-purple-500',
    chartColor: '#a855f7',
  },
  SHORTLISTED: {
    value: 'SHORTLISTED',
    label: 'Shortlisted',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/20',
    dotClass: 'bg-amber-500',
    chartColor: '#f59e0b',
  },
  INTERVIEW: {
    value: 'INTERVIEW',
    label: 'Interview Scheduled',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/20',
    dotClass: 'bg-emerald-500',
    chartColor: '#10b981',
  },
  OFFERED: {
    value: 'OFFERED',
    label: 'Offered',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-300 ring-teal-600/20 font-bold',
    dotClass: 'bg-teal-500',
    chartColor: '#14b8a6',
  },
  REJECTED: {
    value: 'REJECTED',
    label: 'Rejected',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-600/20',
    dotClass: 'bg-rose-500',
    chartColor: '#f43f5e',
  },
};

export const STATUS_OPTIONS = Object.values(APPLICATION_STATUS);

export const getStatusConfig = (status) => {
  return (
    APPLICATION_STATUS[status] || {
      value: status || 'UNKNOWN',
      label: status || 'Unknown',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      dotClass: 'bg-slate-400',
      chartColor: '#94a3b8',
    }
  );
};

