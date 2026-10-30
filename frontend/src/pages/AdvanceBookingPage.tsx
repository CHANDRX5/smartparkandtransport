import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Car,
  Clock,
  Calendar,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Printer,
  ChevronLeft,
  QrCode
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { parkingApi, bookingApi, paymentApi } from '../services/api';
import { ParkingFacility, Booking, Payment } from '../types';

export const AdvanceBookingPage: React.FC = () => {
  const { facilityId } = useParams<{ facilityId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [facility, setFacility] = useState<ParkingFacility | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [vehicleNumber, setVehicleNumber] = useState('KA-01-MJ-5421');
  const [vehicleType, setVehicleType] = useState('car');
  const [bookingDate, setBookingDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [startTimeStr, setStartTimeStr] = useState('14:00');
  const [durationHours, setDurationHours] = useState(3);
  const [paymentMethod, setPaymentMethod] = useState('UPI_SANDBOX');

  // Completed Booking State
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [paymentResult, setPaymentResult] = useState<Payment | null>(null);

  useEffect(() => {
    if (facilityId) {
      loadFacility(Number(facilityId));
    }
  }, [facilityId]);

  const loadFacility = async (id: number) => {
    try {
      setLoading(true);
      const data = await parkingApi.getFacilityById(id);
      setFacility(data);
    } catch {
      setError('Failed to load facility information.');
    } finally {
      setLoading(false);
    }
  };

  const calculatedRate = facility
    ? (facility.price_per_hour ?? facility.hourly_rate ?? 0) * durationHours
    : 0;

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login', { state: { from: window.location } });
      return;
    }

    if (!facility) return;

    setError(null);
    setSubmitting(true);

    try {
      const startIso = new Date(`${bookingDate}T${startTimeStr}:00`).toISOString();
      const endDateTime = new Date(`${bookingDate}T${startTimeStr}:00`);
      endDateTime.setHours(endDateTime.getHours() + durationHours);
      const endIso = endDateTime.toISOString();

      // 1. Create advance booking on backend
      const booking = await bookingApi.createBooking({
        facility_id: facility.id,
        vehicle_reg_number: vehicleNumber.toUpperCase().trim(),
        vehicle_type: vehicleType,
        booking_date: new Date(`${bookingDate}T00:00:00`).toISOString(),
        start_time: startIso,
        end_time: endIso,
        duration_hours: durationHours,
      });

      // 2. Process sandbox payment
      const payment = await paymentApi.processDemoPayment({
        booking_id: booking.id,
        payment_method: paymentMethod,
      });

      setConfirmedBooking(booking);
      setPaymentResult(payment);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Failed to complete booking. Spot may have been reserved or inputs are invalid.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
        Loading booking reservation engine...
      </div>
    );
  }

  // --- Confirmation Receipt View ---
  if (confirmedBooking) {
    return (
      <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
        <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-xl space-y-6 print:border-none print:shadow-none">
          {/* Header Banner */}
          <div className="text-center space-y-2 pb-6 border-b border-slate-100">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold text-navy-950">
              Parking Reservation Confirmed!
            </h1>
            <p className="text-xs text-slate-500">
              Your parking spot has been locked and payment settled in Sandbox.
            </p>
          </div>

          {/* Reference & QR Code representation */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Booking Reference
              </span>
              <div className="text-xl font-extrabold text-brand-700 font-mono">
                {confirmedBooking.booking_reference}
              </div>
              <p className="text-xs text-slate-500">Present this reference code or QR at gate</p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col items-center">
              <QrCode className="w-20 h-20 text-navy-950" />
              <span className="text-[9px] font-mono text-slate-400 mt-1">SMARTPARK-GATE-PASS</span>
            </div>
          </div>

          {/* Details Breakdown Table */}
          <div className="space-y-3 text-xs">
            <h3 className="font-bold text-navy-950 uppercase tracking-wider text-[11px]">
              Reservation Summary
            </h3>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="p-3 flex justify-between bg-slate-50/50">
                <span className="text-slate-500">Facility Name:</span>
                <strong className="text-navy-950">{facility?.name}</strong>
              </div>
              <div className="p-3 flex justify-between">
                <span className="text-slate-500">Address:</span>
                <span className="text-slate-700">{facility?.address}</span>
              </div>
              <div className="p-3 flex justify-between bg-slate-50/50">
                <span className="text-slate-500">Vehicle Plate:</span>
                <strong className="font-mono text-navy-950">{confirmedBooking.vehicle_number}</strong>
              </div>
              <div className="p-3 flex justify-between">
                <span className="text-slate-500">Date & Duration:</span>
                <span className="text-slate-700">
                  {bookingDate} &bull; {durationHours} Hour(s) ({startTimeStr} onwards)
                </span>
              </div>
              <div className="p-3 flex justify-between bg-slate-50/50">
                <span className="text-slate-500">Payment Status:</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  SUCCESS ({paymentResult?.transaction_reference})
                </span>
              </div>
              <div className="p-3 flex justify-between text-sm font-extrabold bg-blue-50/60 text-brand-900">
                <span>Total Amount Paid:</span>
                <span>₹{confirmedBooking.total_amount}.00</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print Receipt
            </button>

            <div className="flex items-center gap-2">
              <Link
                to="/tracker"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all"
              >
                GPS Directions
              </Link>
              <Link
                to="/bookings"
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all"
              >
                Go to My Bookings &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Booking Form View ---
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        to="/parking"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-navy-950"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Facilities
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Form: Inputs */}
        <div className="md:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-6">
          <div>
            <h1 className="text-xl font-extrabold text-navy-950">
              Advance Parking Reservation
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Lock your parking bay in advance with real-time capacity validation.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleBookingSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vehicle Registration Number
              </label>
              <div className="relative">
                <Car className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. KA-01-AB-1234"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vehicle Type
                </label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="car">Standard Sedan/Hatchback</option>
                  <option value="suv">SUV / MUV</option>
                  <option value="ev">Electric Vehicle (EV)</option>
                  <option value="two_wheeler">Two-Wheeler / Bike</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Arrival Date
                </label>
                <input
                  type="date"
                  required
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expected Arrival Time
                </label>
                <input
                  type="time"
                  required
                  value={startTimeStr}
                  onChange={(e) => setStartTimeStr(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Duration: {durationHours} Hour(s)
                </label>
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  className="w-full accent-brand-600 mt-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI_SANDBOX')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === 'UPI_SANDBOX'
                      ? 'border-brand-600 bg-blue-50 text-brand-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-brand-600" />
                  UPI / Card (Sandbox)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('RAZORPAY_TEST')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === 'RAZORPAY_TEST'
                      ? 'border-brand-600 bg-blue-50 text-brand-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Razorpay Test Mode
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? 'Confirming Bay & Payment...' : `Confirm & Pay ₹${calculatedRate}.00`}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right Summary Card */}
        <div className="md:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider">
              Selected Facility
            </h3>

            {facility && (
              <div className="space-y-3">
                <h4 className="text-base font-bold text-navy-950">{facility.name}</h4>
                <p className="text-xs text-slate-500">{facility.address}</p>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Base Hourly Rate:</span>
                    <strong className="text-navy-950">₹{facility.hourly_rate}/hr</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Duration:</span>
                    <strong className="text-navy-950">{durationHours} hours</strong>
                  </div>
                  <div className="w-full h-px bg-slate-200" />
                  <div className="flex justify-between text-sm font-bold text-brand-700">
                    <span>Estimated Total:</span>
                    <span>₹{calculatedRate}.00</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>
                    <strong>{facility.available_spaces}</strong> spots currently free at this facility.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
