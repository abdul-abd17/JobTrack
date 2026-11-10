import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { APPLICATION_STATUS } from '../../utils/constants';
import { PieChart as PieIcon } from 'lucide-react';

export const StatusPieChart = ({ statusBreakdown = {}, total = 0 }) => {
  const chartData = [
    { name: 'Applied', value: statusBreakdown.applied || 0, color: APPLICATION_STATUS.APPLIED.chartColor },
    { name: 'Under Review', value: statusBreakdown.under_review || 0, color: APPLICATION_STATUS.UNDER_REVIEW.chartColor },
    { name: 'Shortlisted', value: statusBreakdown.shortlisted || 0, color: APPLICATION_STATUS.SHORTLISTED.chartColor },
    { name: 'Interview', value: statusBreakdown.interview_scheduled || 0, color: APPLICATION_STATUS.INTERVIEW.chartColor },
    { name: 'Offered', value: statusBreakdown.offered || 0, color: APPLICATION_STATUS.OFFERED.chartColor },
    { name: 'Rejected', value: statusBreakdown.rejected || 0, color: APPLICATION_STATUS.REJECTED.chartColor },
  ].filter((item) => item.value > 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl border border-slate-700">
          <p className="font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.payload.color }} />
            {data.name}
          </p>
          <p className="text-slate-300 mt-1">
            <span className="font-bold text-white text-sm">{data.value}</span> applications ({percentage}%)
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
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Status Distribution</h3>
          <p className="text-xs text-slate-500">Breakdown of applications across pipeline stages</p>
        </div>
        <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
          <PieIcon className="w-4 h-4" />
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <PieIcon className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700">No Application Data Yet</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Add applications to visualize your pipeline stage breakdown in real-time.
          </p>
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={88}
                paddingAngle={4}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                formatter={(val) => <span className="text-xs text-slate-600 font-medium">{val}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

