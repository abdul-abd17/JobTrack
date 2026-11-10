import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { applicationsAPI } from '../../src/api/applications';
import { ApplicationTable } from '../components/applications/ApplicationTable';
import { ApplicationModal } from '../components/applications/ApplicationModal';
import { DeleteConfirmModal } from '../components/applications/DeleteConfirmModal';
import { ActivityTimelineModal } from '../components/applications/ActivityTimelineModal';
import { StatusFilterTabs } from '../components/applications/StatusFilterTabs';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Search, Plus, RotateCcw, Filter, ArrowUpDown } from 'lucide-react';
import toast from 'react-hot-toast';

export const Applications = () => {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState(null);

  // Filter & Search & Sorting State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ordering, setOrdering] = useState('-application_date');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [deletingApp, setDeletingApp] = useState(null);
  const [timelineApp, setTimelineApp] = useState(null);

  // Fetch applications list
  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page,
        ordering,
      };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (statusFilter) {
        params.status = statusFilter;
      }

      const [data, statsData] = await Promise.all([
        applicationsAPI.getApplications(params),
        applicationsAPI.getDashboardStats(),
      ]);

      setApplications(data.results || data || []);
      setTotalCount(data.count ?? (data.results ? data.results.length : (data.length || 0)));
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching applications:', err);
      toast.error('Failed to load applications.');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, searchQuery, ordering]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Handlers
  const handleSort = (field) => {
    if (ordering === field) {
      setOrdering(`-${field}`);
    } else if (ordering === `-${field}`) {
      setOrdering(field);
    } else {
      setOrdering(field);
    }
    setPage(1);
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setOrdering('-application_date');
    setPage(1);
  };

  const handleOpenAdd = () => {
    setEditingApp(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (app) => {
    setEditingApp(app);
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    fetchApplications();
  };

  const handleDeleteSuccess = () => {
    fetchApplications();
  };

  const statusCounts = stats?.status_breakdown || {};
  const hasActiveFilters = Boolean(searchQuery.trim() || statusFilter || ordering !== '-application_date');

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span>Job Applications</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-bold">
              {totalCount} Total
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage, filter, and track all your active and past job applications.
          </p>
        </div>

        <div className="shrink-0">
          <Button variant="primary" icon={Plus} onClick={handleOpenAdd}>
            New Application
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="space-y-3">
        {/* Status Filter Tabs */}
        <StatusFilterTabs
          currentStatus={statusFilter}
          onSelectStatus={handleStatusFilterChange}
          counts={{
            total: stats?.total_applications,
            ...statusCounts,
          }}
        />

        {/* Search & Sort Bar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="w-full md:w-80">
            <Input
              name="search"
              placeholder="Search company, title, notes..."
              value={searchQuery}
              onChange={handleSearchChange}
              icon={Search}
              className="w-full"
            />
          </div>

          {/* Ordering Dropdown & Reset */}
          <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-semibold">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Sort:</span>
              <select
                value={ordering}
                onChange={(e) => {
                  setOrdering(e.target.value);
                  setPage(1);
                }}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-2 px-2.5 font-medium text-slate-700 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="-application_date">Newest Date Applied</option>
                <option value="application_date">Oldest Date Applied</option>
                <option value="company_name">Company (A-Z)</option>
                <option value="-company_name">Company (Z-A)</option>
                <option value="status">Status</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <ApplicationTable
        applications={applications}
        isLoading={isLoading}
        onEdit={handleOpenEdit}
        onDelete={(app) => setDeletingApp(app)}
        onViewTimeline={(app) => setTimelineApp(app)}
        sortBy={ordering.replace('-', '')}
        sortOrder={ordering.startsWith('-') ? 'desc' : 'asc'}
        onSort={handleSort}
        pagination={{
          page,
          totalCount,
          pageSize,
        }}
        onPageChange={(newPage) => setPage(newPage)}
        onAddNew={handleOpenAdd}
      />

      {/* Add / Edit Modal */}
      <ApplicationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        application={editingApp}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingApp)}
        onClose={() => setDeletingApp(null)}
        onSuccess={handleDeleteSuccess}
        application={deletingApp}
      />

      {/* Activity Timeline Modal */}
      <ActivityTimelineModal
        isOpen={Boolean(timelineApp)}
        onClose={() => setTimelineApp(null)}
        application={timelineApp}
      />
    </div>
  );
};

