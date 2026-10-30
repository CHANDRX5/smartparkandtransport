import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin,
  Clock,
  Car,
  Sparkles,
  Zap,
  Shield,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ChevronLeft
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { parkingApi, predictionApi } from '../services/api';
import { ParkingFacility, ParkingSpace, AIPredictionResult } from '../types';
import { LeafletMap } from '../components/LeafletMap';

export const FacilityDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [facility, setFacility] = useState<ParkingFacility | null>(null);
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [prediction, setPrediction] = useState<AIPredictionResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadFacilityDetails(Number(id));
    }
  }, [id]);

  const loadFacilityDetails = async (facilityId: number) => {
    try {
      setLoading(true);
      const [facData, spacesData, predData] = await Promise.allSettled([
        parkingApi.getFacilityById(facilityId),
        parkingApi.getFacilitySpaces(facilityId),
        predictionApi.getParkingPrediction(facilityId),
      ]);

      if (facData.status === 'fulfilled') setFacility(facData.value);
      if (spacesData.status === 'fulfilled') setSpaces(spacesData.value);
      if (predData.status === 'fulfilled') setPrediction(predData.value);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
        Loading facility profile & predictive models...
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
        <h2 className="text-sm font-bold text-navy-950">Facility Not Found</h2>
        <Link to="/parking" className="inline-block text-xs text-brand-600 font-bold hover:underline">
          &larr; Back to Parking Discovery
        </Link>
      </div>
    );
  }

  const chartData = prediction?.hourly_predictions?.map((item) => ({
    time: item.time_label,
    occupancy: item.predicted_occupancy_pct,
    spotsLeft: item.predicted_available_spaces,
  })) || [];

  return (
    <div className="space-y-8 pb-12">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/parking"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-navy-950"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Parking Discovery
        </Link>

        <Link
          to={`/booking/${facility.id}`}
          className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-600/20 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Car className="w-4 h-4" />
          Advance Book Parking Spot
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Facility Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Verified Smart Facility &bull; Operational
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950">
              {facility.name}
            </h1>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              {facility.address}, {facility.city}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
            <div>
              <div className="text-xs text-slate-400 font-semibold">Hourly Rate</div>
              <div className="text-2xl font-extrabold text-navy-950">
                ₹{facility.price_per_hour ?? facility.hourly_rate ?? 0}
                <span className="text-xs text-slate-400 font-normal"> /hr</span>
              </div>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div>
              <div className="text-xs text-slate-400 font-semibold">Hours</div>
              <div className="text-sm font-bold text-navy-950 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-brand-600" />
                {typeof facility.operating_hours === 'object'
                  ? '24/7'
                  : facility.operating_hours || '24/7'}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Specs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
            <span className="text-[11px] text-slate-500 font-medium">Total Capacity</span>
            <div className="text-lg font-bold text-navy-950 mt-1">{facility.total_capacity} Spots</div>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
            <span className="text-[11px] text-emerald-700 font-medium">Currently Available</span>
            <div className="text-lg font-bold text-emerald-800 mt-1">{facility.available_spaces} Spots</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
            <span className="text-[11px] text-slate-500 font-medium">Current Occupancy</span>
            <div className="text-lg font-bold text-navy-950 mt-1">
              {Math.round(((facility.total_capacity - facility.available_spaces) / facility.total_capacity) * 100)}%
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100">
            <span className="text-[11px] text-brand-700 font-medium">AI Model State</span>
            <div className="text-lg font-bold text-brand-900 mt-1">Active / Low Risk</div>
          </div>
        </div>

        {/* Amenities List */}
        {facility.amenities && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Included Amenities & Security
            </h4>
            <div className="flex flex-wrap gap-2">
              {(Array.isArray(facility.amenities)
                ? facility.amenities
                : (facility.amenities || '').split(',')
              ).map((am: string, i: number) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium"
                >
                  {am.trim()}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Parking Availability Prediction Module */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-extrabold text-navy-950">
                AI Parking Availability Forecast
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Gradient Boosting ML algorithm trained on historical ingress/egress records.
            </p>
          </div>

          <div className="text-xs px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-brand-700 font-semibold self-start sm:self-auto">
            Model: Scikit-learn GradientBoost v1.2
          </div>
        </div>

        {/* Forecast Chart */}
        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="occupancyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 100]} stroke="#cbd5e1" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="p-3 bg-navy-950 text-white rounded-xl shadow-xl text-xs space-y-1">
                        <p className="font-bold">{label}</p>
                        <p className="text-blue-300">
                          Predicted Occupancy: <strong>{payload[0].value}%</strong>
                        </p>
                        <p className="text-emerald-300">
                          Est. Free Spots: <strong>{(payload[0].payload as any).spotsLeft}</strong>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="occupancy"
                stroke="#2563eb"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#occupancyGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Peak Hours & Recommendations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/60 space-y-2">
            <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              Predicted Peak Congestion Times
            </h4>
            <p className="text-xs text-amber-800 leading-relaxed">
              Expect highest congestion between <strong>09:00 AM - 11:30 AM</strong> and <strong>05:30 PM - 07:30 PM</strong>.
              Advance reservation is strongly recommended for seamless entry.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="text-xs font-bold text-navy-950 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Alternative Nearby Facilities
            </h4>
            <div className="text-xs text-slate-600 space-y-1">
              <div>&bull; Indiranagar 100ft Multi-Level (2.1 km &bull; 15 spots free)</div>
              <div>&bull; Koramangala 80ft Tech Park Haven (3.4 km &bull; 68 spots free)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Demarcated Spaces Layout Grid */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-navy-950">Demarcated Bay Status</h2>
            <p className="text-xs text-slate-500">
              Live status for Ground & Upper parking bays. Green = vacant, Red = reserved.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500" /> Vacant
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-red-500" /> Occupied
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {spaces.map((sp) => (
            <div
              key={sp.id}
              className={`p-3 rounded-xl border text-center transition-all ${
                sp.is_occupied
                  ? 'bg-red-50/60 border-red-200 text-red-700 opacity-60'
                  : 'bg-emerald-50/60 border-emerald-200 text-emerald-800 font-bold shadow-xs'
              }`}
            >
              <div className="text-xs font-mono">{sp.space_number}</div>
              <div className="text-[10px] uppercase font-semibold mt-0.5">
                {sp.space_type || sp.vehicle_type}
              </div>
              <div className="text-[9px] text-slate-400 mt-1">Floor {sp.floor || sp.floor_level || '1'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Map Location */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-4">
        <h2 className="text-lg font-extrabold text-navy-950">Facility Location & Directions</h2>
        <LeafletMap
          center={[facility.latitude, facility.longitude]}
          zoom={15}
          markers={[
            {
              id: facility.id,
              lat: facility.latitude,
              lng: facility.longitude,
              title: facility.name,
              availableSpaces: facility.available_spaces,
              totalCapacity: facility.total_capacity,
              hourlyRate: facility.hourly_rate,
              type: 'parking',
            },
          ]}
          height="380px"
        />
      </div>
    </div>
  );
};
