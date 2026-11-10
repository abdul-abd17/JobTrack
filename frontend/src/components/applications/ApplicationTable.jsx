import React from 'react';
import { StatusBadge } from '../common/Badge';
import { formatDate } from '../../utils/formatters';
import { TableSkeleton } from '../common/LoadingSkeleton';
import { 
  Building2, 
  MapPin, 
  DollarSign, 
  Calendar, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  History, 
  ArrowUpDown,
  Briefcase
} from 'lucide-react';

export const ApplicationTable = ({
  applications = [],
  isLoading = false,
  onEdit,
  onDelete,
  onViewTimeline,
  sortBy,
  sortOrder,
  onSort,
  pagination = { page: 1, totalCount: 0, pageSize: 20 },
  onPageChange,
  onAddNew,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <TableSkeleton rows={6} />
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-12 text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
          <Briefcase className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 tracking-tight">No Applications Found</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          No job applications match your current search or filter criteria. Add a new application to keep tracking.
        </p>
        {onAddNew && (
          <button
            type="button"
            onClick={onAddNew}
            className="mt-5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-all shadow-sm"
          >
            + Add First Application
          </button>
        )}
      </div>
    );
  }

  const totalPages = Math.ceil((pagination.totalCount || 1) / pagination.pageSize);
  const startCount = (pagination.page - 1) * pagination.pageSize + 1;
  const endCount = Math.min(pagination.page * pagination.pageSize, pagination.totalCount);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
              <th
                className="py-3.5 px-6 cursor-pointer hover:text-slate-900 transition-colors"
                onClick={() => onSort('company_name')}
              >
                <div className="flex items-center space-x-1.5">
                  <span>Company & Role</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </th>
              <th className="py-3.5 px-4 hidden md:table-cell">Location</th>
              <th className="py-3.5 px-4 hidden lg:table-cell">Salary</th>
              <th
                className="py-3.5 px-4 cursor-pointer hover:text-slate-900 transition-colors"
                onClick={() => onSort('status')}
              >
                <div className="flex items-center space-x-1.5">
                  <span>Status</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </th>
              <th
                className="py-3.5 px-4 cursor-pointer hover:text-slate-900 transition-colors"
                onClick={() => onSort('application_date')}
              >
                <div className="flex items-center space-x-1.5">
                  <span>Date Applied</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </th>
              <th className="py-3.5 px-4 hidden sm:table-cell">Link</th>
              <th className="py-3.5 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {applications.map((app) => (
              <tr
                key={app.id}
                className="hover:bg-slate-50/70 transition-colors group"
              >
                {/* Company & Role */}
                <td className="py-4 px-6">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/60 text-slate-700 font-bold flex items-center justify-center shrink-0 text-sm uppercase shadow-2xs">
                      {app.company_name?.[0] || 'C'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 tracking-tight leading-snug">
                        {app.company_name}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        {app.job_title}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Location */}
                <td className="py-4 px-4 hidden md:table-cell text-xs text-slate-600 font-medium">
                  {app.job_location ? (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {app.job_location}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>

                {/* Salary */}
                <td className="py-4 px-4 hidden lg:table-cell text-xs text-slate-600 font-medium">
                  {app.salary ? (
                    <span className="inline-flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                      {app.salary}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>

                {/* Status Badge */}
                <td className="py-4 px-4">
                  <StatusBadge status={app.status} />
                </td>

                {/* Date */}
                <td className="py-4 px-4 text-xs text-slate-600 font-medium whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {formatDate(app.application_date)}
                  </span>
                </td>

                {/* URL */}
                <td className="py-4 px-4 hidden sm:table-cell text-xs">
                  {app.job_url ? (
                    <a
                      href={app.job_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                    >
                      <span>Post</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>

                {/* Actions */}
                <td className="py-4 px-6 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end space-x-1.5">
                    <button
                      type="button"
                      onClick={() => onViewTimeline(app)}
                      title="View Activity Timeline"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      <History className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(app)}
                      title="Edit Application"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(app)}
                      title="Delete Application"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination.totalCount > 0 && (
        <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 select-none">
          <p>
            Showing <span className="font-bold text-slate-800">{startCount}</span> to{' '}
            <span className="font-bold text-slate-800">{endCount}</span> of{' '}
            <span className="font-bold text-slate-800">{pagination.totalCount}</span> applications
          </p>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
            >
              Previous
            </button>
            <span className="px-2 font-semibold text-slate-700">
              Page {pagination.page} of {Math.max(totalPages, 1)}
            </span>
            <button
              type="button"
              disabled={pagination.page >= totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

