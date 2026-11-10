import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../../src/api/auth';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { formatDate } from '../utils/formatters';
import { User, Mail, Lock, ShieldCheck, Calendar, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const Profile = () => {
  const { user, updateProfile } = useAuth();

  // Profile form state
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password form state
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    new_password_confirm: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    if (passwordErrors[name]) {
      setPasswordErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    await updateProfile(profileData);
    setIsSavingProfile(false);
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!passwordData.old_password) {
      newErrors.old_password = 'Current password is required.';
    }
    if (!passwordData.new_password) {
      newErrors.new_password = 'New password is required.';
    } else if (passwordData.new_password.length < 8) {
      newErrors.new_password = 'New password must be at least 8 characters.';
    }
    if (passwordData.new_password !== passwordData.new_password_confirm) {
      newErrors.new_password_confirm = 'Passwords do not match.';
    }

    if (Object.keys(newErrors).length > 0) {
      setPasswordErrors(newErrors);
      return;
    }

    setIsSavingPassword(true);
    try {
      await authAPI.changePassword(passwordData);
      toast.success('Password changed successfully.');
      setPasswordData({
        old_password: '',
        new_password: '',
        new_password_confirm: '',
      });
      setPasswordErrors({});
    } catch (err) {
      const respData = err.response?.data || {};
      let msg = 'Failed to update password.';
      if (respData.old_password) msg = respData.old_password[0];
      else if (respData.new_password) msg = respData.new_password[0];
      toast.error(msg);
      setPasswordErrors({ form: msg });
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Account & Profile</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage your personal details and account credentials.
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
            {user?.first_name ? user.first_name[0].toUpperCase() : user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username}
            </h2>
            <p className="text-xs text-slate-500 font-medium">@{user?.username}</p>
            <div className="flex items-center space-x-3 mt-1.5 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                {user?.email}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Member since {formatDate(user?.date_joined?.slice(0, 10))}
              </span>
            </div>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold inline-flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Active Account</span>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Edit Personal Information Form */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-1">Personal Details</h3>
          <p className="text-xs text-slate-500 mb-5">Update your contact and display name</p>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                name="first_name"
                value={profileData.first_name}
                onChange={handleProfileChange}
                placeholder="First name"
              />
              <Input
                label="Last Name"
                name="last_name"
                value={profileData.last_name}
                onChange={handleProfileChange}
                placeholder="Last name"
              />
            </div>

            <Input
              label="Email Address"
              name="email"
              type="email"
              value={profileData.email}
              onChange={handleProfileChange}
              placeholder="Email address"
              icon={Mail}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Username (Immutable)
              </label>
              <input
                disabled
                value={user?.username || ''}
                className="block w-full rounded-xl text-sm bg-slate-50 border border-slate-200 py-2.5 px-3.5 text-slate-500 cursor-not-allowed select-none"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Usernames are permanently linked to your application database records.
              </p>
            </div>

            <div className="pt-3">
              <Button type="submit" variant="primary" isLoading={isSavingProfile}>
                Save Profile
              </Button>
            </div>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-1">Security & Password</h3>
          <p className="text-xs text-slate-500 mb-5">Change your account password securely</p>

          {passwordErrors.form && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center space-x-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{passwordErrors.form}</span>
            </div>
          )}

          <form onSubmit={handleSavePassword} className="space-y-4">
            <Input
              label="Current Password"
              name="old_password"
              type="password"
              value={passwordData.old_password}
              onChange={handlePasswordChange}
              placeholder="••••••••"
              error={passwordErrors.old_password}
              icon={Lock}
              required
            />

            <Input
              label="New Password"
              name="new_password"
              type="password"
              value={passwordData.new_password}
              onChange={handlePasswordChange}
              placeholder="Minimum 8 characters"
              error={passwordErrors.new_password}
              icon={Lock}
              required
            />

            <Input
              label="Confirm New Password"
              name="new_password_confirm"
              type="password"
              value={passwordData.new_password_confirm}
              onChange={handlePasswordChange}
              placeholder="Re-type new password"
              error={passwordErrors.new_password_confirm}
              icon={Lock}
              required
            />

            <div className="pt-3">
              <Button type="submit" variant="secondary" isLoading={isSavingPassword}>
                Update Password
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

