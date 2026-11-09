import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/layout/PageHeader';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { User, Mail, Phone, MapPin, Lock, Camera, CheckCircle2, Shield } from 'lucide-react';
import authService from '../services/authService';

export const UserProfilePage = () => {
  const { user, updateProfile } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [city, setCity] = useState(user?.city || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savedSuccess, setSavedSuccess] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setCity(user.city || '');
      if (user.avatarUrl) setAvatarUrl(user.avatarUrl);
    }
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({ fullName, phone, city, avatarUrl });
      setSavedSuccess('Profile details updated successfully in the database!');
      setTimeout(() => setSavedSuccess(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setUpdatingPassword(true);
    try {
      const res = await authService.changePassword({ currentPassword, newPassword });
      if (res.success) {
        setPasswordSuccess('Password successfully updated in database!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccess(''), 4000);
      }
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <PageHeader
        title="Account & Profile Settings"
        subtitle="Manage your personal information, contact credentials, and security preferences"
        breadcrumbs={['Dashboard', 'Profile Settings']}
      />

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{savedSuccess}</span>
        </div>
      )}

      {/* Main Profile Details Form */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-slate-900">Personal Information</h2>

        <div className="flex items-center gap-5">
          <div className="relative">
            <img
              src={avatarUrl}
              alt={fullName}
              className="w-20 h-20 rounded-full object-cover ring-4 ring-brand-50 shadow-md"
            />
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 p-1.5 rounded-full bg-brand-600 text-white shadow hover:bg-brand-700 cursor-pointer"
              title="Change Avatar"
            >
              <Camera className="w-3.5 h-3.5" />
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  const url = URL.createObjectURL(e.target.files[0]);
                  setAvatarUrl(url);
                }
              }}
            />
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">{fullName}</h3>
            <p className="text-xs text-slate-500">{email}</p>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
              <Shield className="w-3 h-3" />
              Role: {user?.role?.name || (typeof user?.role === 'string' ? user.role : 'USER')}
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 pt-4 border-t border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              icon={User}
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <Input
              label="Email Address"
              type="email"
              icon={Mail}
              required
              disabled
              value={email}
              helperText="Contact system admin to change email address."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              icon={Phone}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="City & State"
              icon={MapPin}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" loading={savingProfile}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Password & Security Section */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900">Change Password</h2>
          <p className="text-xs text-slate-500 mt-0.5">Ensure your account uses a secure password.</p>
        </div>

        {passwordError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {passwordError}
          </div>
        )}
        {passwordSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            icon={Lock}
            required
            placeholder="••••••••"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="New Password"
              type="password"
              icon={Lock}
              required
              placeholder="Minimum 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              label="Confirm New Password"
              type="password"
              icon={Lock}
              required
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="secondary" loading={updatingPassword}>
              Update Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
