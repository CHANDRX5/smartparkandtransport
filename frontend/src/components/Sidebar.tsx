import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Compass,
  MapPin,
  Navigation,
  Bus,
  Search,
  CalendarCheck,
  CreditCard,
  User,
  ShieldAlert,
  BarChart3,
  Layers,
  FileCheck2,
  X,
  Sparkles,
  Building2,
  Wallet,
  MapPinned,
  Siren,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  const navItems = [
    { label: 'Overview Dashboard', path: '/dashboard', icon: Compass },
    { label: 'Smart Parking Discovery', path: '/parking', icon: MapPin },
    { label: 'GPS Facility Tracker', path: '/tracker', icon: Navigation },
    { label: 'Long-Distance Routes', path: '/routes', icon: Navigation },
    { label: 'AI Aerial Space Detection', path: '/ai-detection', icon: Sparkles },
    { label: 'Public Transit Crowd AI', path: '/transport', icon: Bus },
    { label: 'Lost & Found Vehicles', path: '/lost-found', icon: Search },
    { label: 'My Bookings', path: '/bookings', icon: CalendarCheck, requiresAuth: true },
    { label: 'Digital Wallet', path: '/wallet', icon: Wallet, requiresAuth: true },
    { label: 'Bus Booking', path: '/bus-booking', icon: Bus, requiresAuth: false },
    { label: 'Nearby Services', path: '/nearby', icon: MapPinned, requiresAuth: false },
    { label: 'Emergency Help', path: '/emergency', icon: Siren, requiresAuth: false },
    { label: 'Payment Ledger', path: '/payments', icon: CreditCard, requiresAuth: true },
    { label: 'Profile & Settings', path: '/profile', icon: User, requiresAuth: true },
  ];

  const operatorItems = [
    { label: 'Owner Dashboard & Slots', path: '/owner', icon: Building2 },
    { label: 'AI Aerial Space Detection', path: '/ai-detection', icon: Sparkles },
  ];

  const adminItems = [
    { label: 'Admin Analytics', path: '/admin', icon: BarChart3 },
    { label: 'Manage Facilities', path: '/admin/parking', icon: Layers },
    { label: 'Review Lost & Found', path: '/admin/lost-found', icon: ShieldAlert },
    { label: 'Bookings & Ledger', path: '/admin/bookings', icon: FileCheck2 },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy-950/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-navy-950 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } border-r border-navy-850 shadow-2xl lg:static lg:h-[calc(100vh-4rem)] lg:shadow-none`}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-navy-850 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold">
              SP
            </div>
            <span className="font-bold text-white text-base">SmartPark AI</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links Scrollable Area */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            <p className="px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Navigation
            </p>
            <div className="mt-2 space-y-1">
              {navItems.map((item) => {
                if (item.requiresAuth && !user) return null;
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => onClose()}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 font-bold'
                          : 'text-slate-300 hover:bg-navy-900 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Owner / Operator Management Section */}
          {(user?.role === 'operator' || user?.role === 'admin') && (
            <div>
              <p className="px-3 text-[11px] font-semibold tracking-wider text-emerald-400 uppercase flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Facility Owner
              </p>
              <div className="mt-2 space-y-1">
                {operatorItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => onClose()}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-bold'
                            : 'text-slate-300 hover:bg-navy-900 hover:text-white'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          )}

          {/* Admin Management Section */}
          {user?.role === 'admin' && (
            <div>
              <p className="px-3 text-[11px] font-semibold tracking-wider text-brand-400 uppercase flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                Admin Console
              </p>
              <div className="mt-2 space-y-1">
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => onClose()}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30 font-bold'
                            : 'text-slate-300 hover:bg-navy-900 hover:text-white'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer info */}
        <div className="p-4 border-t border-navy-850 bg-navy-900/40">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Server Mode: Live</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            OSRM & OpenStreetMap active
          </p>
        </div>
      </aside>
    </>
  );
};
