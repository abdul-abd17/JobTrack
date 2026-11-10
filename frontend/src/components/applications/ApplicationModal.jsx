import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { STATUS_OPTIONS } from '../../utils/constants';
import { applicationsAPI } from '../../api/applications';
import toast from 'react-hot-toast';
import { Building2, Briefcase, MapPin, DollarSign, Calendar, Link2, AlertCircle } from 'lucide-react';

export const ApplicationModal = ({
  isOpen,
  onClose,
  onSuccess,
  application = null, // null for create mode, or existing object for edit mode
}) => {
  const isEditMode = Boolean(application);

  const getInitialForm = () => {
    if (application) {
      return {
        company_name: application.company_name || '',
        job_title: application.job_title || '',
        job_location: application.job_location || '',
        salary: application.salary || '',
        status: application.status || 'APPLIED',
        application_date: application.application_date || new Date().toISOString().split('T')[0],
        job_url: application.job_url || '',
        notes: application.notes || '',
        activity_description: '',
      };
    }
    return {
      company_name: '',
      job_title: '',
      job_location: '',
      salary: '',
      status: 'APPLIED',
      application_date: new Date().toISOString().split('T')[0],
      job_url: '',
      notes: '',
      activity_description: '',
    };
  };

  const [formData, setFormData] = useState(getInitialForm());
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialForm());
      setErrors({});
      setServerError('');
    }
  }, [isOpen, application]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) setServerError('');
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required.';
    }
    if (!formData.job_title.trim()) {
      newErrors.job_title = 'Job title is required.';
    }
    if (!formData.application_date) {
      newErrors.application_date = 'Application date is required.';
    }
    if (formData.job_url.trim()) {
      try {
        const url = new URL(formData.job_url.trim());
        if (!['http:', 'https:'].includes(url.protocol)) {
          newErrors.job_url = 'URL must start with http:// or https://';
        }
      } catch (e) {
        newErrors.job_url = 'Please enter a valid URL (e.g. https://company.com/job)';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setServerError('');

    const payload = {
      company_name: formData.company_name.trim(),
      job_title: formData.job_title.trim(),
      job_location: formData.job_location.trim(),
      salary: formData.salary.trim(),
      status: formData.status,
      application_date: formData.application_date,
      job_url: formData.job_url.trim(),
      notes: formData.notes.trim(),
    };

    if (isEditMode && formData.activity_description.trim()) {
      payload.activity_description = formData.activity_description.trim();
    }

    try {
      if (isEditMode) {
        const updated = await applicationsAPI.updateApplication(application.id, payload);
        toast.success(`Updated application for ${updated.company_name}`);
        onSuccess(updated);
      } else {
        const created = await applicationsAPI.createApplication(payload);
        toast.success(`Added application for ${created.company_name}`);
        onSuccess(created);
      }
      onClose();
    } catch (err) {
      const respData = err.response?.data || {};
      let firstMsg = 'Failed to save application. Please verify the form.';

      if (typeof respData === 'object') {
        const backendErrors = {};
        for (const [key, val] of Object.entries(respData)) {
          backendErrors[key] = Array.isArray(val) ? val[0] : val;
        }
        setErrors(backendErrors);
        const firstVal = Object.values(backendErrors)[0];
        if (firstVal) firstMsg = firstVal;
      }

      setServerError(firstMsg);
      toast.error(firstMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusChanged = isEditMode && application?.status !== formData.status;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Job Application' : 'Add New Job Application'}
      subtitle={
        isEditMode
          ? 'Update details or advance the status of your application'
          : 'Track a new opportunity in your job hunt pipeline'
      }
      maxWidth="max-w-2xl"
    >
      {serverError && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center space-x-2 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Company Name & Job Title */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Company Name"
            name="company_name"
            value={formData.company_name}
            onChange={handleChange}
            placeholder="e.g. Stripe, Google, Spotify"
            error={errors.company_name}
            icon={Building2}
            required
          />

          <Input
            label="Job Title"
            name="job_title"
            value={formData.job_title}
            onChange={handleChange}
            placeholder="e.g. Software Engineer Intern"
            error={errors.job_title}
            icon={Briefcase}
            required
          />
        </div>

        {/* Row 2: Location & Salary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Job Location"
            name="job_location"
            value={formData.job_location}
            onChange={handleChange}
            placeholder="e.g. Remote, New York, NY"
            error={errors.job_location}
            icon={MapPin}
          />

          <Input
            label="Salary / Compensation"
            name="salary"
            value={formData.salary}
            onChange={handleChange}
            placeholder="e.g. $95,000, $50/hr, Competitive"
            error={errors.salary}
            icon={DollarSign}
          />
        </div>

        {/* Row 3: Status & Application Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Application Status <span className="text-rose-500">*</span>
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="block w-full rounded-xl text-sm transition-all bg-white border border-slate-300 py-2.5 px-3 text-slate-900 focus:ring-indigo-500 focus:border-indigo-500 shadow-xs"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.status && (
              <p className="mt-1 text-xs text-rose-600 font-medium">{errors.status}</p>
            )}
          </div>

          <Input
            label="Application Date"
            name="application_date"
            type="date"
            value={formData.application_date}
            onChange={handleChange}
            error={errors.application_date}
            icon={Calendar}
            required
          />
        </div>

        {/* If editing status: Optional activity note */}
        {statusChanged && (
          <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-100 space-y-1.5">
            <label className="block text-xs font-bold text-indigo-900">
              Activity Timeline Note (Optional)
            </label>
            <input
              type="text"
              name="activity_description"
              value={formData.activity_description}
              onChange={handleChange}
              placeholder={`e.g. Completed recruiter phone screen, scheduled technical interview`}
              className="block w-full rounded-xl text-xs bg-white border border-indigo-200 py-2 px-3 text-slate-800 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="text-[11px] text-indigo-700">
              This note will be recorded in the application's timestamped activity timeline.
            </p>
          </div>
        )}

        {/* Row 4: Job Posting URL */}
        <Input
          label="Job Posting URL"
          name="job_url"
          type="url"
          value={formData.job_url}
          onChange={handleChange}
          placeholder="https://company.com/careers/job-id"
          error={errors.job_url}
          icon={Link2}
        />

        {/* Row 5: Notes Textarea */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Notes & Comments
          </label>
          <textarea
            name="notes"
            rows={3}
            value={formData.notes}
            onChange={handleChange}
            placeholder="Recruiter contact info, interview dates, referral name, preparation tips..."
            className="block w-full rounded-xl text-sm transition-all bg-white border border-slate-300 py-2.5 px-3 text-slate-900 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 shadow-xs"
          />
          {errors.notes && (
            <p className="mt-1 text-xs text-rose-600 font-medium">{errors.notes}</p>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {isEditMode ? 'Save Changes' : 'Create Application'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

