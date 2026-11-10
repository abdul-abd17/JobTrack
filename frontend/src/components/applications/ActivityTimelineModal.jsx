import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/Badge';
import { formatDateTime } from '../../utils/formatters';
import { applicationsAPI } from '../../api/applications';
import { History, ArrowRight, Loader2, Sparkles } from 'lucide-react';

export const ActivityTimelineModal = ({ isOpen, onClose, application }) => {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && application?.id) {
      setIsLoading(true);
      applicationsAPI
        .getApplicationActivities(application.id)
        .then((data) => {
          setActivities(data || []);
        })
        .catch((err) => {
          // Fallback to application's nested activities if endpoint errors
          setActivities(application.activities || []);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, application]);

  if (!application) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Application Activity Timeline"
      subtitle={`${application.job_title} at ${application.company_name}`}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <p className="text-xs">Loading activity audit trail...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No activity records found for this application.
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {activities.map((act, index) => {
              const isInitial = !act.previous_status;
              return (
                <div key={act.id || index} className="relative group">
                  {/* Timeline dot */}
                  <div
                    className={`absolute -left-6 top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-xs ${
                      isInitial ? 'bg-indigo-600 ring-4 ring-indigo-50' : 'bg-slate-700'
                    }`}
                  />

                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-semibold text-slate-700">
                        {isInitial ? 'Application Created' : 'Status Advanced'}
                      </span>
                      <span>{formatDateTime(act.created_at)}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {act.previous_status ? (
                        <>
                          <StatusBadge status={act.previous_status} />
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        </>
                      ) : null}
                      <StatusBadge status={act.new_status} />
                    </div>

                    {act.description && (
                      <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/60 leading-relaxed italic">
                        &quot;{act.description}&quot;
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

