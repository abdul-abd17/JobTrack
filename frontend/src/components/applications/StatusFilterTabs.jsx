import React from 'react';
import { STATUS_OPTIONS } from '../../utils/constants';

export const StatusFilterTabs = ({ currentStatus, onSelectStatus, counts = {} }) => {
  const allTabs = [
    { value: '', label: 'All Applications', countKey: 'total' },
    ...STATUS_OPTIONS.map((opt) => ({
      value: opt.value,
      label: opt.label,
      countKey: opt.value.toLowerCase(),
    })),
  ];

  return (
    <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
      {allTabs.map((tab) => {
        const isActive = currentStatus === tab.value;
        let count = tab.countKey === 'total' ? counts.total : counts[tab.countKey];
        if (count === undefined && tab.countKey === 'interview') {
          count = counts.interview_scheduled;
        }

        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onSelectStatus(tab.value)}
            className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 shrink-0 ${
              isActive
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <span>{tab.label}</span>
            {count !== undefined && count !== null && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-slate-800 text-indigo-300' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
