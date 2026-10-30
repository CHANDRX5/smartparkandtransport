import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  MapPin,
  Clock,
  Car,
  CheckCircle2,
  AlertCircle,
  X,
  Edit2
} from 'lucide-react';
import { parkingApi } from '../services/api';
import { ParkingFacility } from '../types';

export const AdminParkingPage: React.FC = () => {
  const [facilities, setFacilities] = useState<ParkingFacility[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newFacility, setNewFacility] = useState({
    name: '',
    address: '',
    city: 'Bengaluru',
    latitude: 12.9716,
    longitude: 77.5946,
    total_capacity: 100,
    available_spaces: 100,
    hourly_rate: 50.0,
    operating_hours: '24/7',
    amenities: 'EV Charging, CCTV, Covered',
  });

  useEffect(() => {
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    try {
      setLoading(true);
      const data = await parkingApi.getFacilities();
      setFacilities(data);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await parkingApi.createFacility(newFacility);
      setFacilities([created, ...facilities]);
      setShowAddModal(false);
      setNewFacility({
        name: '',
        address: '',
        city: 'Bengaluru',
        latitude: 12.9716,
        longitude: 77.5946,
        total_capacity: 100,
        available_spaces: 100,
        hourly_rate: 50.0,
        operating_hours: '24/7',
        amenities: 'EV Charging, CCTV, Covered',
      });
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create facility.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-950 flex items-center gap-2">
            <Layers className="w-6 h-6 text-brand-600" />
            Admin Parking Facilities Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure parking garages, dynamic pricing rules, total bay quotas, and smart amenity tags.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Parking Facility
        </button>
      </div>

      {/* Facilities Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading facilities...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Facility Name & City</th>
                  <th className="p-4">Capacity</th>
                  <th className="p-4">Available</th>
                  <th className="p-4">Rate</th>
                  <th className="p-4">Hours</th>
                  <th className="p-4">Amenities</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {facilities.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-navy-950">{f.name}</div>
                      <div className="text-[11px] text-slate-400">{f.address}, {f.city}</div>
                    </td>
                    <td className="p-4 font-semibold text-slate-700">{f.total_capacity} bays</td>
                    <td className="p-4 font-bold text-emerald-600">{f.available_spaces} free</td>
                    <td className="p-4 font-bold text-navy-950">₹{f.price_per_hour ?? f.hourly_rate ?? 0}/hr</td>
                    <td className="p-4 text-slate-600">
                      {typeof f.operating_hours === 'object' ? '24/7' : f.operating_hours || '24/7'}
                    </td>
                    <td className="p-4 text-slate-500 text-[11px] max-w-xs truncate">
                      {Array.isArray(f.amenities) ? f.amenities.join(', ') : f.amenities || '-'}
                    </td>
                    <td className="p-4 text-right">
                      <button className="px-2.5 py-1 rounded-lg text-slate-500 hover:bg-slate-100 font-semibold text-[11px]">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Facility Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-navy-950">
                Register New Smart Parking Facility
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFacility} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Facility Name *</label>
                <input
                  type="text"
                  required
                  value={newFacility.name}
                  onChange={(e) => setNewFacility({ ...newFacility, name: e.target.value })}
                  placeholder="e.g. Indiranagar Central Park Hub"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={newFacility.city}
                    onChange={(e) => setNewFacility({ ...newFacility, city: e.target.value })}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Operating Hours</label>
                  <input
                    type="text"
                    value={newFacility.operating_hours}
                    onChange={(e) =>
                      setNewFacility({ ...newFacility, operating_hours: e.target.value })
                    }
                    placeholder="24/7 or 06:00 - 23:00"
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Street Address *</label>
                <input
                  type="text"
                  required
                  value={newFacility.address}
                  onChange={(e) => setNewFacility({ ...newFacility, address: e.target.value })}
                  placeholder="Complete street address"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total Capacity</label>
                  <input
                    type="number"
                    min="10"
                    required
                    value={newFacility.total_capacity}
                    onChange={(e) =>
                      setNewFacility({
                        ...newFacility,
                        total_capacity: Number(e.target.value),
                        available_spaces: Number(e.target.value),
                      })
                    }
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hourly Rate (₹)</label>
                  <input
                    type="number"
                    step="5"
                    min="10"
                    required
                    value={newFacility.hourly_rate}
                    onChange={(e) =>
                      setNewFacility({ ...newFacility, hourly_rate: Number(e.target.value) })
                    }
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newFacility.latitude}
                    onChange={(e) =>
                      setNewFacility({ ...newFacility, latitude: Number(e.target.value) })
                    }
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Amenities (Comma separated)
                </label>
                <input
                  type="text"
                  value={newFacility.amenities}
                  onChange={(e) => setNewFacility({ ...newFacility, amenities: e.target.value })}
                  placeholder="EV Charging, CCTV, Covered, Valet"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md transition-all disabled:opacity-60"
                >
                  {submitting ? 'Creating...' : 'Register Facility'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
