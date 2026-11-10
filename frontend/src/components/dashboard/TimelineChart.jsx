import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Calendar } from 'lucide-react';

export const TimelineChart = ({ monthlyTrend = [] }) => {
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl border border-slate-700">
          <p className="font-semibold text-indigo-300">{label}</p>
          <p className="text-slate-200 mt-1">
            <span className="font-bold text-white text-sm">{payload[0].value}</span> applications submitted
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Application Activity</h3>
          <p className="text-xs text-slate-500">Monthly submissions cadence</p>
        </div>
        <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
          <Calendar className="w-4 h-4" />
        </div>
      </div>

      {monthlyTrend.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700">No Monthly Timeline Activity</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Applications will be aggregated chronologically here as you record dates.
          </p>
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={45} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

