import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  MapPin,
  Car,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Plus,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Users,
  Layers,
  Edit2,
  Zap,
  Accessibility,
  Shield,
} from 'lucide-react';
import { ownerApi, parkingApi } from '../services/api';
import { ParkingFacility, ParkingSpace, Booking } from '../types';
import { useAuth } from '../context/AuthContext';

type SlotStatus = 'available' | 'occupied' | 'reserved' | 'out_of_service';

const STATUS_CONFIG: Record<SlotStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  available: { label: 'Available', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  occupied: { label: 'Occupied', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: Car },
  reserved: { label: 'Reserved', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock },
  out_of_service: { label: 'Out of Service', color: 'text-slate-600', bg: 'bg-slate-100 border-slate-300', icon: XCircle },
};

export const OwnerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [facilities, setFacilities] = useState<ParkingFacility[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<ParkingFacility | null>(null);
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [revenue, setRevenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'slots' | 'bookings' | 'revenue'>('slots');
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [newSlot, setNewSlot] = useState({
    space_number: '',
    vehicle_type: 'car',
    floor_level: 'G',
    is_covered: false,
    is_ev_charging: false,
    is_handicap: false,
  });
  const [updatingSlot, setUpdatingSlot] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFacilities();
  }, []);

  const loadFacilities = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ownerApi.getMyFacilities();
      setFacilities(data);
      if (data.length > 0) {
        selectFacility(data[0]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load your facilities.');
    } finally {
      setLoading(false);
    }
  };

  const selectFacility = async (facility: ParkingFacility) => {
    setSelectedFacility(facility);
    setSpacesLoading(true);
    try {
      const [slotData, bookingData, revData] = await Promise.all([
        ownerApi.getSlots(facility.id),
        ownerApi.getOwnerBookings(facility.id),
        ownerApi.getOwnerRevenue(facility.id),
      ]);
      setSpaces(slotData);
      setBookings(bookingData);
      setRevenue(revData);
    } catch {
      setSpaces([]);
      setBookings([]);
      setRevenue(null);
    } finally {
      setSpacesLoading(false);
    }
  };

  const handleStatusChange = async (space: ParkingSpace, newStatus: SlotStatus) => {
    if (!selectedFacility) return;
    setUpdatingSlot(space.id);
    try {
      await ownerApi.updateSlotStatus(selectedFacility.id, space.id, { slot_status: newStatus });
      // Refresh spaces
      const updated = await ownerApi.getSlots(selectedFacility.id);
      setSpaces(updated);
      // Refresh revenue (available_spaces may have changed)
      const revData = await ownerApi.getOwnerRevenue(selectedFacility.id);
      setRevenue(revData);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to update slot status.');
    } finally {
      setUpdatingSlot(null);
    }
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacility) return;
    try {
      await ownerApi.createSlot(selectedFacility.id, newSlot);
      const updated = await ownerApi.getSlots(selectedFacility.id);
      setSpaces(updated);
      setShowAddSlot(false);
      setNewSlot({ space_number: '', vehicle_type: 'car', floor_level: 'G', is_covered: false, is_ev_charging: false, is_handicap: false });
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to create slot.');
    }
  };

  const getStatusBadge = (space: ParkingSpace) => {
    const status: SlotStatus = (space.slot_status as SlotStatus) || (space.is_occupied ? 'occupied' : 'available');
    const cfg = STATUS_CONFIG[status];
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.color}`}>
        <Icon className="w-3 h-3" />
        {cfg.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Loading your facilities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-950 flex items-center gap-2">
            <Layers className="w-6 h-6 text-brand-600" />
            Facility Owner Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your parking facilities, slots, bookings and revenue.
          </p>
        </div>
        <button
          onClick={loadFacilities}
          className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-1.5 self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          {error}
        </div>
      )}

      {facilities.length === 0 ? (
        <div className="p-10 rounded-3xl bg-white border border-slate-200 text-center space-y-3">
          <Layers className="w-10 h-10 text-slate-300 mx-auto" />
          <h2 className="text-base font-bold text-navy-950">No facilities assigned</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You don't have any parking facilities assigned to your account. Contact an administrator to get facilities assigned.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Facility Selector */}
          <div className="lg:col-span-3 space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
              My Facilities
            </h2>
            {facilities.map((f) => (
              <button
                key={f.id}
                onClick={() => selectFacility(f)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selectedFacility?.id === f.id
                    ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-600/20'
                    : 'bg-white border-slate-200 hover:border-brand-300 text-navy-950'
                }`}
              >
                <div className="flex items-start gap-2">
                  <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${selectedFacility?.id === f.id ? 'text-white/80' : 'text-brand-500'}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{f.name}</p>
                    <p className={`text-[10px] mt-0.5 truncate ${selectedFacility?.id === f.id ? 'text-white/70' : 'text-slate-500'}`}>
                      {f.city}
                    </p>
                    <p className={`text-[10px] mt-1 font-semibold ${selectedFacility?.id === f.id ? 'text-white/90' : 'text-emerald-600'}`}>
                      {f.available_spaces} / {f.total_capacity} free
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Right: Details Panel */}
          <div className="lg:col-span-9 space-y-4">
            {selectedFacility && (
              <>
                {/* Summary Stats */}
                {revenue && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Total Revenue', value: `₹${revenue.total_revenue?.toLocaleString() || 0}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                      { label: 'Total Bookings', value: revenue.total_bookings || 0, icon: Users, color: 'text-brand-600', bg: 'bg-blue-50' },
                      { label: 'Active Bookings', value: revenue.active_bookings || 0, icon: Car, color: 'text-amber-600', bg: 'bg-amber-50' },
                      { label: 'Occupancy', value: `${revenue.occupancy_pct || 0}%`, icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50' },
                    ].map((stat) => {
                      const Icon = stat.icon;
                      return (
                        <div key={stat.label} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                          <div className={`w-8 h-8 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center mb-2`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="text-xl font-extrabold text-navy-950">{stat.value}</div>
                          <div className="text-[10px] text-slate-500 font-medium">{stat.label}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                  {(['slots', 'bookings', 'revenue'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                        activeTab === tab ? 'bg-white text-navy-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab === 'slots' ? 'Slot Management' : tab === 'bookings' ? 'Bookings' : 'Revenue Details'}
                    </button>
                  ))}
                </div>

                {spacesLoading ? (
                  <div className="p-8 text-center text-xs text-slate-400">Loading data...</div>
                ) : (
                  <>
                    {/* SLOTS TAB */}
                    {activeTab === 'slots' && (
                      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100">
                          <h3 className="text-sm font-bold text-navy-950">
                            {selectedFacility.name} — {spaces.length} Slots
                          </h3>
                          <button
                            onClick={() => setShowAddSlot(true)}
                            className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Slot
                          </button>
                        </div>

                        {spaces.length === 0 ? (
                          <div className="p-8 text-center text-xs text-slate-400">
                            No slots configured for this facility. Add slots to start managing availability.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-500">
                                <tr>
                                  <th className="p-3">Slot #</th>
                                  <th className="p-3">Vehicle</th>
                                  <th className="p-3">Floor</th>
                                  <th className="p-3">Features</th>
                                  <th className="p-3">Status</th>
                                  <th className="p-3 text-right">Change Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {spaces.map((space) => {
                                  const currentStatus: SlotStatus =
                                    (space.slot_status as SlotStatus) || (space.is_occupied ? 'occupied' : 'available');
                                  return (
                                    <tr key={space.id} className="hover:bg-slate-50 transition-colors">
                                      <td className="p-3 font-bold text-navy-950">{space.space_number}</td>
                                      <td className="p-3 capitalize text-slate-600">{space.vehicle_type}</td>
                                      <td className="p-3 text-slate-500">{space.floor_level || 'G'}</td>
                                      <td className="p-3">
                                        <div className="flex gap-1 flex-wrap">
                                          {space.is_covered && (
                                            <span className="px-1.5 py-0.5 text-[9px] bg-slate-100 rounded font-medium text-slate-600 flex items-center gap-0.5">
                                              <Shield className="w-2.5 h-2.5" /> Covered
                                            </span>
                                          )}
                                          {space.is_ev_charging && (
                                            <span className="px-1.5 py-0.5 text-[9px] bg-emerald-100 rounded font-medium text-emerald-700 flex items-center gap-0.5">
                                              <Zap className="w-2.5 h-2.5" /> EV
                                            </span>
                                          )}
                                          {space.is_handicap && (
                                            <span className="px-1.5 py-0.5 text-[9px] bg-blue-100 rounded font-medium text-blue-700 flex items-center gap-0.5">
                                              <Accessibility className="w-2.5 h-2.5" /> Accessible
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="p-3">{getStatusBadge(space)}</td>
                                      <td className="p-3 text-right">
                                        <select
                                          value={currentStatus}
                                          disabled={updatingSlot === space.id}
                                          onChange={(e) => handleStatusChange(space, e.target.value as SlotStatus)}
                                          className="text-[10px] py-1 px-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                                        >
                                          <option value="available">Available</option>
                                          <option value="occupied">Occupied</option>
                                          <option value="reserved">Reserved</option>
                                          <option value="out_of_service">Out of Service</option>
                                        </select>
                                        {updatingSlot === space.id && (
                                          <span className="ml-1 text-[10px] text-slate-400">Saving...</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* BOOKINGS TAB */}
                    {activeTab === 'bookings' && (
                      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                        <div className="p-4 border-b border-slate-100">
                          <h3 className="text-sm font-bold text-navy-950">
                            Bookings — {bookings.length} records
                          </h3>
                        </div>
                        {bookings.length === 0 ? (
                          <div className="p-8 text-center text-xs text-slate-400">No bookings yet for this facility.</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-500">
                                <tr>
                                  <th className="p-3">Ref</th>
                                  <th className="p-3">Vehicle</th>
                                  <th className="p-3">Start</th>
                                  <th className="p-3">Duration</th>
                                  <th className="p-3">Amount</th>
                                  <th className="p-3">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {bookings.map((b: any) => (
                                  <tr key={b.id} className="hover:bg-slate-50">
                                    <td className="p-3 font-mono font-bold text-brand-700">{b.booking_ref}</td>
                                    <td className="p-3 text-slate-700">{b.vehicle_reg_number}</td>
                                    <td className="p-3 text-slate-600">{new Date(b.start_time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                                    <td className="p-3 text-slate-600">{b.duration_hours}h</td>
                                    <td className="p-3 font-bold text-navy-950">₹{b.total_amount}</td>
                                    <td className="p-3">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                        b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                                        b.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                        b.status === 'completed' ? 'bg-slate-100 text-slate-600' :
                                        'bg-amber-100 text-amber-700'
                                      }`}>
                                        {b.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* REVENUE TAB */}
                    {activeTab === 'revenue' && revenue && (
                      <div className="space-y-4">
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
                          <h3 className="text-sm font-bold text-navy-950">{revenue.facility_name} — Revenue Summary</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                              { label: 'Total Revenue (All-time)', value: `₹${revenue.total_revenue?.toLocaleString()}`, note: 'From confirmed & completed bookings' },
                              { label: 'Occupancy Rate', value: `${revenue.occupancy_pct}%`, note: `${revenue.available_spaces} of ${revenue.total_capacity} spaces free` },
                              { label: 'All-time Bookings', value: revenue.total_bookings, note: `${revenue.active_bookings} currently active` },
                            ].map((item) => (
                              <div key={item.label} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                                <div className="text-2xl font-extrabold text-navy-950">{item.value}</div>
                                <div className="text-xs font-semibold text-slate-700 mt-1">{item.label}</div>
                                <div className="text-[11px] text-slate-500 mt-0.5">{item.note}</div>
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                            Revenue figures are derived directly from booking records in the database. Only bookings with status confirmed, checked_in, or completed are counted.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Slot Modal */}
      {showAddSlot && selectedFacility && (
        <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-navy-950">Add Parking Slot</h3>
              <button onClick={() => setShowAddSlot(false)} className="text-slate-400 hover:text-slate-700">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSlot} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Slot Number *</label>
                  <input
                    required
                    value={newSlot.space_number}
                    onChange={(e) => setNewSlot({ ...newSlot, space_number: e.target.value })}
                    placeholder="e.g. A-01"
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Floor Level</label>
                  <input
                    value={newSlot.floor_level}
                    onChange={(e) => setNewSlot({ ...newSlot, floor_level: e.target.value })}
                    placeholder="G, 1, 2..."
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vehicle Type</label>
                <select
                  value={newSlot.vehicle_type}
                  onChange={(e) => setNewSlot({ ...newSlot, vehicle_type: e.target.value })}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="car">Car</option>
                  <option value="motorcycle">Motorcycle</option>
                  <option value="bicycle">Bicycle</option>
                  <option value="truck">Truck / SUV</option>
                </select>
              </div>
              <div className="flex gap-4">
                {[
                  { key: 'is_covered', label: 'Covered' },
                  { key: 'is_ev_charging', label: 'EV Charging' },
                  { key: 'is_handicap', label: 'Accessible' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={(newSlot as any)[key]}
                      onChange={(e) => setNewSlot({ ...newSlot, [key]: e.target.checked })}
                      className="w-3.5 h-3.5 accent-brand-600"
                    />
                    <span className="text-slate-700 font-medium">{label}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddSlot(false)} className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-xs">
                  Add Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
