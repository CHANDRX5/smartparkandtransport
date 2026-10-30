import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  Car,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Navigation,
  Printer,
  ChevronRight
} from 'lucide-react';
import { bookingApi } from '../services/api';
import { Booking } from '../types';

export const MyBookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const data = await bookingApi.getMyBookings();
      setBookings(data);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (id: number) => {
    try {
      setActionLoading(id);
      const updated = await bookingApi.checkInBooking(id);
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Check-in failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this booking reservation?')) return;
    try {
      setActionLoading(id);
      const updated = await bookingApi.cancelBooking(id);
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Cancellation failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-950 flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-brand-600" />
            My Parking Bookings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View booking status, gate check-in passes, and cancel active reservations.
          </p>
        </div>

        <Link
          to="/parking"
          className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-sm self-start sm:self-auto flex items-center gap-1.5"
        >
          <Car className="w-4 h-4" />
          Book New Spot
        </Link>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
          Loading your reservations...
        </div>
      ) : bookings.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <Car className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-navy-950">No Bookings Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You don't have any parking reservations yet. Find an available facility and reserve your bay.
          </p>
          <Link
            to="/parking"
            className="inline-block mt-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold hover:bg-brand-700"
          >
            Explore Facilities
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const isConfirmed = booking.status === 'CONFIRMED';
            const isCheckedIn = booking.status === 'CHECKED_IN';
            const isCancelled = booking.status === 'CANCELLED';

            return (
              <div
                key={booking.id}
                className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 card-hover"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                        isConfirmed
                          ? 'bg-blue-100 text-brand-800'
                          : isCheckedIn
                          ? 'bg-emerald-100 text-emerald-800'
                          : isCancelled
                          ? 'bg-red-100 text-red-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {booking.status}
                    </span>
                    <span className="text-xs font-mono font-bold text-navy-950">
                      {booking.booking_reference}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-navy-950">
                    {booking.facility_name || 'Central Smart Parking Hub'}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span>
                      Vehicle: <strong className="text-navy-950">{booking.vehicle_number}</strong>
                    </span>
                    <span>
                      Duration: <strong>{new Date(booking.start_time).toLocaleDateString()}</strong>
                    </span>
                    <span>
                      Fee Paid: <strong className="text-emerald-600">₹{booking.total_amount}.00</strong>
                    </span>
                  </div>
                </div>

                {/* Status Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {isConfirmed && (
                    <>
                      <button
                        onClick={() => handleCheckIn(booking.id)}
                        disabled={actionLoading === booking.id}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Gate Check-In
                      </button>

                      <button
                        onClick={() => handleCancel(booking.id)}
                        disabled={actionLoading === booking.id}
                        className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                    </>
                  )}

                  <Link
                    to="/tracker"
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Navigation className="w-3.5 h-3.5 text-brand-600" />
                    Navigate
                  </Link>

                  <button
                    onClick={() => window.print()}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    title="Print Pass"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
