import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { AlertTriangle } from 'lucide-react';
import { applicationsAPI } from '../../api/applications';
import toast from 'react-hot-toast';

export const DeleteConfirmModal = ({ isOpen, onClose, onSuccess, application }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!application) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await applicationsAPI.deleteApplication(application.id);
      toast.success(`Deleted application for ${application.company_name}`);
      onSuccess(application.id);
      onClose();
    } catch (err) {
      toast.error('Failed to delete application. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Job Application"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-800 text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-900">Are you sure?</p>
            <p className="text-xs text-rose-700 mt-1">
              You are about to delete your application for{' '}
              <strong className="font-bold">{application.job_title}</strong> at{' '}
              <strong className="font-bold">{application.company_name}</strong>. All associated timeline activity records will also be removed permanently.
            </p>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            isLoading={isDeleting}
            onClick={handleDelete}
          >
            Confirm Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
};

