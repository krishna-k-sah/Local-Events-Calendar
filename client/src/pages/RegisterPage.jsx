import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar, Mail, Lock, User, Phone, MapPin, AlertCircle, Shield, Briefcase } from 'lucide-react';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { ROLES } from '../utils/constants';

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(ROLES.USER);
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('San Francisco, CA');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!fullName || !email || !password) {
      setError('Please fill in all mandatory fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await register({ fullName, email, password, role, city, phone });
      if (res.success) {
        const userRole = res.user?.role?.name || res.user?.role || role;
        if (userRole === ROLES.ADMIN) navigate('/admin');
        else if (userRole === ROLES.ORGANIZER) navigate('/organizer/events');
        else navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-6 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xl">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Event<span className="text-brand-600">Hub</span>
            </span>
          </Link>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Create your account</h2>
          <p className="mt-1 text-xs text-slate-500">
            Join our community to discover or organize memorable local gatherings
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Role Selection Tabs */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Select Account Type <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole(ROLES.USER)}
              className={`p-3.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                role === ROLES.USER
                  ? 'border-brand-600 bg-brand-50/70 ring-2 ring-brand-500/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <User className={`w-4 h-4 ${role === ROLES.USER ? 'text-brand-600' : 'text-slate-400'}`} />
                <span className="text-xs font-bold text-slate-900">Normal User / Attendee</span>
              </div>
              <p className="text-[11px] text-slate-500">Browse events, register, RSVP, and bookmark favorites.</p>
            </button>

            <button
              type="button"
              onClick={() => setRole(ROLES.ORGANIZER)}
              className={`p-3.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                role === ROLES.ORGANIZER
                  ? 'border-brand-600 bg-brand-50/70 ring-2 ring-brand-500/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Briefcase className={`w-4 h-4 ${role === ROLES.ORGANIZER ? 'text-brand-600' : 'text-slate-400'}`} />
                <span className="text-xs font-bold text-slate-900">Event Organizer</span>
              </div>
              <p className="text-[11px] text-slate-500">Publish events, manage venue capacities, and track attendees.</p>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            required
            icon={User}
            placeholder="Jane Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <Input
            label="Email Address"
            type="email"
            required
            icon={Mail}
            placeholder="jane@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Phone Number"
              icon={Phone}
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="City / Location"
              icon={MapPin}
              placeholder="San Francisco, CA"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <Input
            label="Password"
            type="password"
            required
            icon={Lock}
            placeholder="Minimum 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
            Create {role === ROLES.ORGANIZER ? 'Organizer' : 'User'} Account
          </Button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-brand-600 hover:text-brand-700">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

