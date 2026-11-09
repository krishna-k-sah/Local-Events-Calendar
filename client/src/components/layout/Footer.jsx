import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Heart, Shield, Sparkles, Mail, Github } from 'lucide-react';
import { CATEGORIES } from '../../utils/constants';

export const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Column */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                Event<span className="text-brand-400">Hub</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              The premier SaaS platform for discovering, organizing, and experiencing vibrant local events, workshops, and community gatherings.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Explore</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/discover" className="hover:text-white transition">Discover Events</Link></li>
              <li><Link to="/calendar" className="hover:text-white transition">Interactive Calendar</Link></li>
              <li><Link to="/events/create" className="hover:text-white transition">Host an Event</Link></li>
              <li><Link to="/login" className="hover:text-white transition">Organizer Sign-in</Link></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Popular Categories</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              {CATEGORIES.slice(0, 4).map((cat) => (
                <li key={cat.id}>
                  <Link to={`/discover?category=${cat.id}`} className="hover:text-white transition">
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter / Updates */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Stay Connected</h4>
            <p className="text-xs text-slate-400 mb-3">
              Subscribe for weekly curated local event digests in your neighborhood.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); alert('Subscribed to event digest!'); }} className="flex gap-2">
              <input
                type="email"
                placeholder="your.email@domain.com"
                required
                className="bg-slate-800 text-xs px-3 py-2 rounded-lg text-white placeholder-slate-500 border border-slate-700 focus:outline-none focus:border-brand-500 flex-1"
              />
              <button
                type="submit"
                className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
              >
                Join
              </button>
            </form>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} EventHub Local Event Calendar Management System. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/settings" className="hover:text-slate-400 transition">Privacy Policy</Link>
            <Link to="/settings" className="hover:text-slate-400 transition">Terms of Service</Link>
            <Link to="/settings" className="hover:text-slate-400 transition">Security Guidelines</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

