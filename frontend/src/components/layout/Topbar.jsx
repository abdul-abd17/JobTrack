import React, { useState, useEffect } from 'react';
import { Menu, LogOut, User, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const Topbar = ({ onOpenSidebar }) => {
  const { user, logout } = useAuth();
  const [apiHealthy, setApiHealthy] = useState(true);

  useEffect(() => {
    const checkApi = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/health/`);
        setApiHealthy(res.ok);
      } catch (e) {
        setApiHealthy(false);
      }
    };
    checkApi();
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      {/* Left: Mobile hamburger & breadcrumb */}
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center space-x-2 text-sm">
          <span className="font-semibold text-slate-800">Workspace</span>
          <span className="text-slate-400">/</span>
          <span className="text-slate-600">Application Pipeline</span>
        </div>
      </div>

      {/* Right: API Health Indicator, User chip, Sign out */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Backend health status badge */}
        <div className="hidden md:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600">
          <span className={`w-2 h-2 rounded-full ${apiHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <span>API: {apiHealthy ? 'Connected' : 'Offline'}</span>
        </div>

        {/* User Profile Pill */}
        <Link
          to="/profile"
          className="flex items-center space-x-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-full hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all text-slate-700"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
            {user?.first_name ? user.first_name[0].toUpperCase() : user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <span className="hidden sm:inline text-xs font-semibold text-slate-800">
            {user?.first_name || user?.username}
          </span>
        </Link>

        {/* Sign Out Shortcut */}
        <button
          type="button"
          onClick={logout}
          title="Sign out"
          className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
