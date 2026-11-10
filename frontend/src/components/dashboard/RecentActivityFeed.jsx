import React from 'react';
import { Clock, ArrowRight, History } from 'lucide-react';
import { formatRelativeTime } from '../../utils/formatters';
import { StatusBadge } from '../common/Badge';

export const RecentActivityFeed = ({ activities = [] }) => {
  return (
    <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Recent Activity Feed</h3>
          <p className="text-xs text-slate-500">Live timeline of status transitions</p>
        </div>
        <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
          <History className="w-4 h-4" />
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="py-10 flex flex-col items-center justify-center text-center">
          <p className="text-sm font-semibold text-slate-700">No Activity Recorded</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Status changes on your job applications will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {activities.map((act) => (
            <div key={act.id} className="py-3 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-900">{act.company_name}</span>
                  <span className="text-slate-400 text-xs">•</span>
                  <span className="text-xs text-slate-600 font-medium">{act.job_title}</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {act.previous_status ? (
                    <>
                      <StatusBadge status={act.previous_status} />
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    </>
                  ) : (
                    <span className="text-[11px] text-slate-500 font-medium italic">Created as:</span>
                  )}
                  <StatusBadge status={act.new_status} />
                </div>

                {act.description && (
                  <p className="text-[11px] text-slate-500 line-clamp-1 italic">{act.description}</p>
                )}
              </div>

              <span className="text-[11px] text-slate-400 shrink-0 font-medium">
                {formatRelativeTime(act.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

