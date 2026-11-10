import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { applicationsAPI } from '../../src/api/applications';
import { StatCard } from '../components/common/StatCard';
import { StatusPieChart } from '../components/dashboard/StatusPieChart';
import { TimelineChart } from '../components/dashboard/TimelineChart';
import { RecentActivityFeed } from '../components/dashboard/RecentActivityFeed';
import { ApplicationModal } from '../components/applications/ApplicationModal';
import { ActivityTimelineModal } from '../components/applications/ActivityTimelineModal';
import { StatusBadge } from '../components/common/Badge';
import { formatDate } from '../utils/formatters';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Clock,
  CalendarCheck,
  Award,
  XCircle,
  Plus,
  ArrowRight,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Dashboard = () => {
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [recentApplications, setRecentApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAppForTimeline, setSelectedAppForTimeline] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsData, appsData] = await Promise.all([
        applicationsAPI.getDashboardStats(),
        applicationsAPI.getApplications({ ordering: '-created_at', page_size: 5 }),
      ]);
      setStats(statsData);
      setRecentApplications(appsData.results || appsData || []);
    } catch (error) {
      console.error('Failed to load dashboard metrics:', error);
      toast.error('Failed to load dashboard metrics.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleApplicationCreated = () => {
    fetchDashboardData();
  };

  const statusBreakdown = stats?.status_breakdown || {};
  const rates = stats?.rates || {};
  const totalCount = stats?.total_applications || 0;
  const inProgressCount = stats?.in_progress || 0;

  return (
    <div className="space-y-8">
      {/* Top Welcome & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Real-Time Pipeline Stats</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.first_name || user?.username}!
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            You have <strong className="text-white font-semibold">{totalCount}</strong> total applications and <strong className="text-indigo-400 font-semibold">{inProgressCount}</strong> active opportunities in progress.
          </p>
        </div>

        <div className="relative z-10 shrink-0">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Application</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Applied"
          value={totalCount}
          subtitle="All submitted roles"
          icon={Briefcase}
          iconColor="text-blue-600 bg-blue-50 border-blue-100"
          isLoading={isLoading}
        />
        <StatCard
          title="In Progress"
          value={inProgressCount}
          subtitle="Under review & active"
          icon={Clock}
          iconColor="text-purple-600 bg-purple-50 border-purple-100"
          badgeText="Active"
          badgeVariant="primary"
          isLoading={isLoading}
        />
        <StatCard
          title="Interviews"
          value={statusBreakdown.interview_scheduled || 0}
          subtitle="Screens & rounds"
          icon={CalendarCheck}
          iconColor="text-emerald-600 bg-emerald-50 border-emerald-100"
          badgeText={`${rates.interview_rate || 0}% Rate`}
          badgeVariant="success"
          isLoading={isLoading}
        />
        <StatCard
          title="Offers Received"
          value={statusBreakdown.offered || 0}
          subtitle="Job offers extended"
          icon={Award}
          iconColor="text-teal-600 bg-teal-50 border-teal-100"
          badgeText={`${rates.offer_rate || 0}% Offer`}
          badgeVariant="success"
          isLoading={isLoading}
        />
        <StatCard
          title="Rejections"
          value={statusBreakdown.rejected || 0}
          subtitle="Archived roles"
          icon={XCircle}
          iconColor="text-rose-600 bg-rose-50 border-rose-100"
          badgeText="Archived"
          badgeVariant="danger"
          isLoading={isLoading}
        />
      </div>

      {/* Visual Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusPieChart statusBreakdown={statusBreakdown} total={totalCount} />
        <TimelineChart monthlyTrend={stats?.monthly_trend || []} />
      </div>

      {/* Recent Applications & Activity Feed Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Applications Preview (2 cols on lg) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Recent Applications</h3>
                <p className="text-xs text-slate-500">Your latest opportunities</p>
              </div>
              <Link
                to="/applications"
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentApplications.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No applications added yet. Click &quot;Add Application&quot; to begin.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentApplications.slice(0, 5).map((app) => (
                  <div
                    key={app.id}
                    className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors rounded-xl px-2 -mx-2"
                  >
                    <div className="flex items-center space-x-3.5 overflow-hidden">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/60 text-slate-700 font-bold flex items-center justify-center shrink-0 text-sm uppercase">
                        {app.company_name?.[0] || 'C'}
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-sm text-slate-900 truncate">
                          {app.company_name}
                        </h4>
                        <p className="text-xs text-slate-500 truncate font-medium">
                          {app.job_title}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <StatusBadge status={app.status} />
                      <button
                        type="button"
                        onClick={() => setSelectedAppForTimeline(app)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hidden sm:inline"
                      >
                        Timeline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Showing up to 5 most recent records</span>
            <Link to="/applications" className="font-semibold text-indigo-600 hover:underline">
              Go to Applications Table →
            </Link>
          </div>
        </div>

        {/* Live Status Transitions Feed (1 col on lg) */}
        <div className="lg:col-span-1">
          <RecentActivityFeed activities={stats?.recent_activities || []} />
        </div>
      </div>

      {/* Add Application Modal */}
      <ApplicationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleApplicationCreated}
      />

      {/* Activity Timeline Modal */}
      <ActivityTimelineModal
        isOpen={Boolean(selectedAppForTimeline)}
        onClose={() => setSelectedAppForTimeline(null)}
        application={selectedAppForTimeline}
      />
    </div>
  );
};

