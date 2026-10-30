import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Car,
  MapPin,
  Navigation,
  Bus,
  Search,
  CalendarCheck,
  CreditCard,
  Bell,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  MapPinned,
  Siren,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { bookingApi, parkingApi, predictionApi } from '../services/api';
import { Booking, ParkingFacility, NotificationItem } from '../types';

export const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [facilities, setFacilities] = useState<ParkingFacility[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [bookingsData, facilitiesData, notifsData] = await Promise.allSettled([
        bookingApi.getMyBookings(),
        parkingApi.getFacilities(),
        predictionApi.getNotifications(),
      ]);

      if (bookingsData.status === 'fulfilled') setBookings(bookingsData.value);
      if (facilitiesData.status === 'fulfilled') setFacilities(facilitiesData.value);
      if (notifsData.status === 'fulfilled') setNotifications(notifsData.value);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  const activeBookings = bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'CHECKED_IN');

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-navy-950 via-navy-900 to-brand-900 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Active Session &bull; Role: <span className="capitalize">{user?.role || 'Citizen'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Hello, {user?.full_name || 'Traveler'}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Welcome to your intelligent mobility console. Discover guaranteed parking,
            monitor transit occupancy, and review recovery status.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 relative z-10 shrink-0">
          <Link
            to="/parking"
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            Book a Bay
          </Link>
          <Link
            to="/lost-found"
            className="px-4 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-750 border border-slate-700 text-white text-xs font-semibold transition-all flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Report Vehicle
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs card-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Bookings</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand-600 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-navy-950 mt-2">
            {activeBookings.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Ready for check-in</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs card-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Nearby Facilities</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-navy-950 mt-2">
            {facilities.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Monitored parking hubs</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs card-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Completed Trips</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-navy-950 mt-2">
            {bookings.filter((b) => b.status === 'COMPLETED').length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Total reservations completed</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs card-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Unread Alerts</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-navy-950 mt-2">
            {notifications.filter((n) => !n.is_read).length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">System & match updates</p>
        </div>
      </div>

      {/* Main Grid: Active Reservations & Quick Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Active Bookings */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-navy-950 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-brand-600" />
              Active & Upcoming Bookings
            </h2>
            <Link
              to="/bookings"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              View All History &rarr;
            </Link>
          </div>

          {loading ? (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
              Loading active bookings...
            </div>
          ) : activeBookings.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl border border-slate-200/80 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Car className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-navy-950">No Active Reservations</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                You have no upcoming parking reservations. Explore live facilities to reserve your guaranteed bay.
              </p>
              <Link
                to="/parking"
                className="inline-block mt-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 shadow-sm transition-all"
              >
                Find & Reserve Spot
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeBookings.map((b) => (
                <div
                  key={b.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-hover"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        {b.status}
                      </span>
                      <span className="text-xs font-bold text-navy-950 font-mono">
                        {b.booking_reference}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-navy-950">
                      {b.facility_name || 'Smart Parking Hub'}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-3">
                      <span>Vehicle: <strong>{b.vehicle_number}</strong></span>
                      <span>Total: <strong>₹{b.total_amount}</strong></span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={`/bookings`}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                    >
                      Receipt & QR
                    </Link>
                    <Link
                      to="/tracker"
                      className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      Navigate
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Action Cards Grid */}
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/tracker"
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-brand-300 transition-all card-hover flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-brand-600 flex items-center justify-center shrink-0">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-navy-950">GPS Facility Radar</h4>
                <p className="text-[11px] text-slate-500">Scan nearest EV & parking hubs</p>
              </div>
            </Link>

            <Link
              to="/routes"
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-brand-300 transition-all card-hover flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-navy-950">Long-Distance Routes</h4>
                <p className="text-[11px] text-slate-500">Toll, clearance & weather comparison</p>
              </div>
            </Link>

            <Link
              to="/wallet"
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 transition-all card-hover flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-navy-950">Digital Wallet</h4>
                <p className="text-[11px] text-slate-500">Top-up, withdraw & transaction history</p>
              </div>
            </Link>

            <Link
              to="/bus-booking"
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-brand-300 transition-all card-hover flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Bus className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-navy-950">Bus Seat Booking</h4>
                <p className="text-[11px] text-slate-500">Search buses, pick seats & book with wallet</p>
              </div>
            </Link>

            <Link
              to="/nearby"
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-brand-300 transition-all card-hover flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <MapPinned className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-navy-950">Nearby Services</h4>
                <p className="text-[11px] text-slate-500">Hospitals, hotels, mechanics & more</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Right Col: Monitored Hubs & Notifications Preview */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider">
                Top Parking Facilities
              </h3>
              <Link to="/parking" className="text-xs text-brand-600 font-semibold hover:underline">
                View All
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {facilities.slice(0, 4).map((f) => (
                <div key={f.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-navy-950 line-clamp-1">{f.name}</h4>
                    <p className="text-[11px] text-slate-400">
                      {typeof f.operating_hours === 'object' ? '24/7' : f.operating_hours || '24/7'} &bull; ₹{f.price_per_hour ?? f.hourly_rate ?? 0}/hr
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-bold ${
                        f.available_spaces > 10 ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {f.available_spaces} left
                    </span>
                    <Link
                      to={`/booking/${f.id}`}
                      className="block text-[11px] text-brand-600 font-semibold hover:underline"
                    >
                      Book &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lost & Found Quick Alert Callout */}
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <h4 className="text-xs font-bold">Vehicle Recovery Engine</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Reported a lost vehicle or spotted an abandoned car? Our rule-based AI continuously correlates license plates, make, model and GPS locations.
            </p>
            <Link
              to="/lost-found"
              className="inline-block px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              Open Recovery Portal
            </Link>
          </div>

          {/* Emergency Quick Access */}
          <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-3">
            <div className="flex items-center gap-2 text-red-700">
              <Siren className="w-4 h-4 shrink-0" />
              <h4 className="text-xs font-bold">Emergency & Support</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Immediate access to verified emergency contacts, SmartPark helpdesk, and customer issue reporting.
            </p>
            <Link
              to="/emergency"
              className="inline-block px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              Emergency Help & Tickets
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
