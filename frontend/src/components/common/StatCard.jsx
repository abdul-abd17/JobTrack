import React from 'react';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badgeText,
  badgeVariant = 'neutral',
  iconColor = 'text-indigo-600 bg-indigo-50 border-indigo-100',
  isLoading = false,
}) => {
  const badgeStyles = {
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    primary: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  if (isLoading) {
    return (
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 bg-slate-200 rounded-md w-24"></div>
          <div className="w-10 h-10 rounded-xl bg-slate-100"></div>
        </div>
        <div className="h-8 bg-slate-200 rounded-md w-16 mb-2"></div>
        <div className="h-3 bg-slate-100 rounded-md w-32"></div>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
          {value ?? 0}
        </span>
        {badgeText && (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${badgeStyles[badgeVariant] || badgeStyles.neutral}`}>
            {badgeText}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-2 text-xs text-slate-500 font-medium">
          {subtitle}
        </p>
      )}
    </div>
  );
};

