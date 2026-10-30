import React, { useState, useEffect } from 'react';
import {
  Bus,
  Search,
  MapPin,
  Clock,
  ArrowRight,
  Users,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  Armchair,
  CalendarDays,
  Ticket,
  Phone,
  User,
} from 'lucide-react';
import { busApi, walletApi } from '../services/api';
import { BusService, BusSeatMap, BusSeatStatus, BusBooking as BusBookingType } from '../types';
import { useAuth } from '../context/AuthContext';

type ViewState = 'search' | 'seats' | 'confirm' | 'bookings';

export const BusBookingPage: React.FC = () => {
  const { user } = useAuth();
  const [view, setView] = useState<ViewState>('search');
  const [buses, setBuses] = useState<BusService[]>([]);
  const [myBookings, setMyBookings] = useState<BusBookingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOrigin, setSearchOrigin] = useState('');
  const [searchDest, setSearchDest] = useState('');
  const [tripDate, setTripDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });

  // Seat selection state
  const [selectedBus, setSelectedBus] = useState<BusService | null>(null);
  const [seatMap, setSeatMap] = useState<BusSeatMap | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [seatLoading, setSeatLoading] = useState(false);

  // Booking form state
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  useEffect(() => {
    loadBuses();
    if (user) {
      loadMyBookings();
      loadWallet();
    }
  }, []);

  const loadBuses = async () => {
    try {
      setLoading(true);
      const data = await busApi.listBuses({ origin: searchOrigin || undefined, destination: searchDest || undefined });
      setBuses(data as BusService[]);
    } catch { /* handled */ } finally { setLoading(false); }
  };

  const loadMyBookings = async () => {
    try {
      const data = await busApi.getMyBookings();
      setMyBookings(data as BusBookingType[]);
    } catch { /* handled */ }
  };

  const loadWallet = async () => {
    try {
      const w = await walletApi.getWallet();
      setWalletBalance(w.balance || 0);
    } catch { /* handled */ }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadBuses();
  };

  const handleSelectBus = async (bus: BusService) => {
    setSelectedBus(bus);
    setSelectedSeat(null);
    setSeatLoading(true);
    setMessage(null);
    try {
      const map = await busApi.getSeatMap(bus.id, tripDate);
      setSeatMap(map);
      setView('seats');
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.detail || 'Failed to load seat map.' });
    } finally {
      setSeatLoading(false);
    }
  };

  const handleSeatClick = (seat: BusSeatStatus) => {
    if (seat.status === 'booked' || seat.status === 'held') return;
    setSelectedSeat(selectedSeat === seat.seat_number ? null : seat.seat_number);
  };

  const handleProceedToConfirm = () => {
    if (!selectedSeat || !seatMap) return;
    setPassengerName(user?.full_name || '');
    setPassengerPhone('');
    setView('confirm');
    setMessage(null);
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seatMap || !selectedSeat) return;
    if (!passengerName.trim() || !passengerPhone.trim()) {
      setMessage({ type: 'error', text: 'Please enter passenger name and phone number.' });
      return;
    }
    setBookingLoading(true);
    setMessage(null);
    try {
      const result = await busApi.bookSeat({
        trip_id: seatMap.trip_id,
        seat_number: selectedSeat,
        passenger_name: passengerName.trim(),
        passenger_phone: passengerPhone.trim(),
        payment_method: 'wallet',
      });
      setMessage({ type: 'success', text: `Booking confirmed! Ref: ${result.booking_ref}. Seat ${selectedSeat} on ${selectedBus?.operator_name}.` });
      setView('search');
      setSelectedSeat(null);
      setSelectedBus(null);
      setSeatMap(null);
      await loadMyBookings();
      await loadWallet();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.detail || 'Booking failed. The seat may have been taken.' });
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm('Cancel this bus booking? Wallet refund will be processed automatically.')) return;
    try {
      await busApi.cancelBooking(bookingId);
      setMessage({ type: 'success', text: 'Booking cancelled. Refund credited to wallet.' });
      await loadMyBookings();
      await loadWallet();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.detail || 'Cancellation failed.' });
    }
  };

  const seatColor = (seat: BusSeatStatus) => {
    if (seat.seat_number === selectedSeat) return 'bg-brand-600 text-white border-brand-700 shadow-lg shadow-brand-600/30 scale-105';
    if (seat.status === 'booked') return 'bg-red-100 text-red-400 border-red-200 cursor-not-allowed';
    if (seat.status === 'held') return 'bg-amber-100 text-amber-400 border-amber-200 cursor-not-allowed';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-400 cursor-pointer';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-950 flex items-center gap-2">
            <Bus className="w-6 h-6 text-brand-600" />
            Bus Services & Seat Booking
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Search buses, select your seat, and book with wallet payment. Double-booking protection enabled.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setView('search'); setMessage(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${view === 'search' || view === 'seats' || view === 'confirm' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            Search Buses
          </button>
          <button
            onClick={() => { setView('bookings'); setMessage(null); loadMyBookings(); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${view === 'bookings' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            <Ticket className="w-3.5 h-3.5 inline mr-1" /> My Bookings
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 ${
          message.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* SEARCH VIEW */}
      {view === 'search' && (
        <>
          <form onSubmit={handleSearch} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative">
                <MapPin className="w-4 h-4 text-brand-600 absolute left-3 top-3 pointer-events-none" />
                <input type="text" value={searchOrigin} onChange={e => setSearchOrigin(e.target.value)}
                  placeholder="From (e.g. Bengaluru)"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:bg-white" />
              </div>
              <div className="relative">
                <MapPin className="w-4 h-4 text-emerald-600 absolute left-3 top-3 pointer-events-none" />
                <input type="text" value={searchDest} onChange={e => setSearchDest(e.target.value)}
                  placeholder="To (e.g. Mysuru)"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:bg-white" />
              </div>
              <div className="relative">
                <CalendarDays className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input type="date" value={tripDate} onChange={e => setTripDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:bg-white" />
              </div>
              <button type="submit" disabled={loading}
                className="py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5">
                <Search className="w-3.5 h-3.5" /> {loading ? 'Searching...' : 'Search Buses'}
              </button>
            </div>
          </form>

          {/* Bus Results */}
          {loading ? (
            <div className="p-8 bg-white rounded-2xl border text-center text-xs text-slate-400">Loading bus services...</div>
          ) : buses.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
              <Bus className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-500">No bus services found. Try adjusting your search.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {buses.map(bus => (
                <div key={bus.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-brand-300 transition-all card-hover">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-brand-100 text-brand-800 text-[10px] font-bold">{bus.service_type}</span>
                        <span className="text-xs font-bold text-navy-950">{bus.operator_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{bus.bus_number}</span>
                      </div>
                      <h3 className="text-sm font-bold text-navy-950">{bus.route_name}</h3>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {bus.departure_point}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {bus.destination_point}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {bus.departure_time} — {bus.arrival_time}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {bus.total_seats} seats</span>
                      </div>
                      {bus.intermediate_stops && bus.intermediate_stops.length > 0 && (
                        <p className="text-[10px] text-slate-400">Stops: {
                          (typeof bus.intermediate_stops === 'string'
                            ? JSON.parse(bus.intermediate_stops as string)
                            : bus.intermediate_stops
                          ).join(' → ')
                        }</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="text-xl font-extrabold text-navy-950">₹{bus.fare}</div>
                      <button onClick={() => handleSelectBus(bus)}
                        className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5">
                        <Armchair className="w-3.5 h-3.5" /> Select Seats
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* SEAT MAP VIEW */}
      {view === 'seats' && seatMap && selectedBus && (
        <div className="space-y-4">
          <button onClick={() => { setView('search'); setSelectedSeat(null); }} className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
            ← Back to Search
          </button>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-navy-950">{seatMap.operator_name} — {seatMap.bus_number}</h3>
                <p className="text-xs text-slate-500">{seatMap.route_name} • {seatMap.trip_date} • {seatMap.departure_time} — {seatMap.arrival_time}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">{seatMap.available_seats} of {seatMap.total_seats} available</p>
                <p className="text-base font-extrabold text-navy-950">₹{seatMap.fare}/seat</p>
              </div>
            </div>

            {/* Seat Legend */}
            <div className="flex flex-wrap gap-4 mb-4 text-[11px]">
              <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-emerald-50 border border-emerald-200" /> Available</span>
              <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-brand-600 border border-brand-700" /> Selected</span>
              <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-red-100 border border-red-200" /> Booked</span>
            </div>

            {/* Seat Grid */}
            <div className="flex justify-center">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 inline-block">
                <div className="text-center text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-wider">Front of Bus ▲</div>
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)', maxWidth: '220px' }}>
                  {seatMap.seats.map((seat, idx) => {
                    const isAisle = seat.col === 2;
                    return (
                      <React.Fragment key={seat.seat_number}>
                        <button
                          onClick={() => handleSeatClick(seat)}
                          disabled={seat.status === 'booked' || seat.status === 'held'}
                          className={`w-12 h-12 rounded-lg border-2 text-xs font-bold transition-all ${seatColor(seat)}`}
                          title={seat.status === 'booked' ? `Booked by ${seat.passenger_name || 'another passenger'}` : `Seat ${seat.seat_number}`}
                        >
                          {seat.seat_number}
                        </button>
                        {isAisle && <div className="w-2" />}
                      </React.Fragment>
                    );
                  })}
                </div>
                <div className="text-center text-[10px] font-bold text-slate-400 mt-3 uppercase tracking-wider">▼ Rear of Bus</div>
              </div>
            </div>

            {/* Continue Button */}
            {selectedSeat && (
              <div className="mt-5 flex items-center justify-between p-4 bg-brand-50 rounded-xl border border-brand-200">
                <div>
                  <p className="text-xs font-bold text-navy-950">Selected: Seat {selectedSeat}</p>
                  <p className="text-xs text-slate-500">Fare: ₹{seatMap.fare} • Wallet Balance: ₹{walletBalance.toFixed(2)}</p>
                </div>
                <button onClick={handleProceedToConfirm}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md transition-all">
                  Continue to Book <ArrowRight className="w-3.5 h-3.5 inline ml-1" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRM VIEW */}
      {view === 'confirm' && seatMap && selectedBus && selectedSeat && (
        <div className="space-y-4">
          <button onClick={() => setView('seats')} className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
            ← Back to Seat Selection
          </button>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-navy-950">Confirm Booking Details</h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-500">Bus:</span> <strong>{selectedBus.operator_name}</strong></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-500">Route:</span> <strong>{selectedBus.route_name}</strong></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-500">Date:</span> <strong>{tripDate}</strong></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-500">Seat:</span> <strong>{selectedSeat}</strong></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-500">Departure:</span> <strong>{selectedBus.departure_time}</strong></div>
              <div className="p-3 bg-brand-50 rounded-xl border border-brand-200"><span className="text-slate-500">Fare:</span> <strong className="text-brand-700">₹{seatMap.fare}</strong></div>
            </div>

            <form onSubmit={handleConfirmBooking} className="space-y-3">
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input type="text" value={passengerName} onChange={e => setPassengerName(e.target.value)} placeholder="Passenger Full Name" required
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:bg-white" />
              </div>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input type="tel" value={passengerPhone} onChange={e => setPassengerPhone(e.target.value)} placeholder="Mobile Number" required
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:bg-white" />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-xs">
                <span className="text-slate-500">Payment Method</span>
                <span className="font-bold text-navy-950 flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" /> Wallet (₹{walletBalance.toFixed(2)})</span>
              </div>

              {walletBalance < (seatMap?.fare || 0) && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Insufficient wallet balance. Please top up your wallet first.
                </div>
              )}

              <button type="submit" disabled={bookingLoading || walletBalance < (seatMap?.fare || 0)}
                className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {bookingLoading ? 'Confirming Booking...' : `Confirm & Pay ₹${seatMap.fare} from Wallet`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MY BOOKINGS VIEW */}
      {view === 'bookings' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-navy-950 flex items-center gap-2">
            <Ticket className="w-4 h-4 text-brand-600" /> My Bus Bookings
          </h3>
          {myBookings.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl border text-center space-y-2">
              <Ticket className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-500">No bus bookings yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myBookings.map(b => (
                <div key={b.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>{b.status.toUpperCase()}</span>
                      <span className="text-xs font-bold text-navy-950 font-mono">{b.booking_ref}</span>
                    </div>
                    <p className="text-xs text-slate-600"><strong>{b.operator_name || 'Bus'}</strong> — {b.route_name || 'Route'}</p>
                    <div className="flex items-center gap-4 text-[11px] text-slate-500">
                      <span>Seat: <strong>{b.seat_number}</strong></span>
                      <span>Date: <strong>{b.trip_date || '—'}</strong></span>
                      <span>Fare: <strong>₹{b.fare}</strong></span>
                    </div>
                    <p className="text-[10px] text-slate-400">Passenger: {b.passenger_name} • {b.passenger_phone}</p>
                  </div>
                  {b.status === 'confirmed' && (
                    <button onClick={() => handleCancelBooking(b.id)}
                      className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200 transition-all flex items-center gap-1 shrink-0">
                      <X className="w-3 h-3" /> Cancel
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
