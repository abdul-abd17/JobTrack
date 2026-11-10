import React from 'react';

export const TableSkeleton = ({ rows = 5, cols = 6 }) => {
  return (
    <div className="w-full animate-pulse divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="px-6 py-4 flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-3 w-1/4">
            <div className="w-9 h-9 rounded-xl bg-slate-200 shrink-0"></div>
            <div className="space-y-1.5 w-full">
              <div className="h-4 bg-slate-200 rounded-md w-3/4"></div>
              <div className="h-3 bg-slate-100 rounded-md w-1/2"></div>
            </div>
          </div>
          <div className="h-4 bg-slate-100 rounded-md w-24 hidden sm:block"></div>
          <div className="h-4 bg-slate-100 rounded-md w-20 hidden md:block"></div>
          <div className="h-6 bg-slate-200 rounded-full w-24"></div>
          <div className="h-4 bg-slate-100 rounded-md w-20 hidden lg:block"></div>
          <div className="h-8 bg-slate-100 rounded-lg w-16"></div>
        </div>
      ))}
    </div>
  );
};

export const ChartSkeleton = () => {
  return (
    <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-5 bg-slate-200 rounded-md w-36"></div>
          <div className="h-3 bg-slate-100 rounded-md w-48"></div>
        </div>
        <div className="w-8 h-8 rounded-xl bg-slate-100"></div>
      </div>
      <div className="h-64 bg-slate-50 rounded-2xl flex items-center justify-center">
        <div className="w-32 h-32 rounded-full border-4 border-slate-200 border-t-indigo-400 animate-spin opacity-50"></div>
      </div>
    </div>
  );
};

