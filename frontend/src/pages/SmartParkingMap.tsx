import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  MapPin,
  Car,
  Sparkles,
  Zap,
  Shield,
  Clock,
  List,
  Map as MapIcon,
  ChevronRight,
  SlidersHorizontal,
  Info,
  Locate
} from 'lucide-react';
import { LeafletMap, MapMarker } from '../components/LeafletMap';
import { parkingApi } from '../services/api';
import { ParkingFacility } from '../types';

export const SmartParkingMap: React.FC = () => {
  const [facilities, setFacilities] = useState<ParkingFacility[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAmenity, setSelectedAmenity] = useState<string>('all');
  const [maxPrice, setMaxPrice] = useState<number>(100);
  const [viewMode, setViewMode] = useState<'both' | 'map' | 'list'>('both');
  const [selectedFacility, setSelectedFacility] = useState<ParkingFacility | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  useEffect(() => {
    fetchFacilities();
    requestUserLocation();
  }, []);

  const requestUserLocation = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setGpsLoading(false);
      },
      () => { setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const fetchFacilities = async () => {
    try {
      setLoading(true);
      const data = await parkingApi.getFacilities();
      setFacilities(data);
      if (data.length > 0) {
        setSelectedFacility(data[0]);
      }
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  /** Normalise amenities: backend may return string[] or comma-string */
  const getAmenitiesStr = (f: ParkingFacility): string => {
    if (!f.amenities) return '';
    if (Array.isArray(f.amenities)) return f.amenities.join(', ');
    return f.amenities;
  };

  const getRate = (f: ParkingFacility): number => f.price_per_hour ?? f.hourly_rate ?? 0;

  const filteredFacilities = facilities.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.city.toLowerCase().includes(searchQuery.toLowerCase());

    const amenStr = getAmenitiesStr(f).toLowerCase();
    const matchesAmenity =
      selectedAmenity === 'all' ||
      amenStr.includes(selectedAmenity.toLowerCase());

    const matchesPrice = getRate(f) <= maxPrice;

    return matchesSearch && matchesAmenity && matchesPrice;
  });

  const mapMarkers: MapMarker[] = [
    ...(userLat && userLng ? [{
      id: 'my-location',
      lat: userLat,
      lng: userLng,
      title: 'Your Location',
      type: 'user' as const,
    }] : []),
    ...filteredFacilities.map((f) => ({
      id: f.id,
      lat: f.latitude,
      lng: f.longitude,
      title: f.name,
      subtitle: `${f.address} • ${typeof f.operating_hours === 'object' ? JSON.stringify(f.operating_hours) : f.operating_hours}`,
      availableSpaces: f.available_spaces,
      totalCapacity: f.total_capacity,
      hourlyRate: getRate(f),
      type: 'parking' as const,
      actionLabel: 'Reserve Spot',
    })),
  ];

  const mapCenter: [number, number] = userLat && userLng ? [userLat, userLng] : [12.9716, 77.5946];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-950 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-brand-600" />
            Smart Parking Discovery & Vacancy Radar
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time interactive parking bay locator with verified capacity and automated AI availability prediction.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setViewMode('both')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'both' ? 'bg-white text-navy-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Split View
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              viewMode === 'map' ? 'bg-white text-navy-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            Map
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              viewMode === 'list' ? 'bg-white text-navy-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            List
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by facility name, landmark, or street..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 px-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>Max Rate: ₹{maxPrice}/hr</span>
              <input
                type="range"
                min="20"
                max="100"
                step="5"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-24 accent-brand-600 cursor-pointer"
              />
            </div>

            <select
              value={selectedAmenity}
              onChange={(e) => setSelectedAmenity(e.target.value)}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">All Amenities</option>
              <option value="EV Charging">EV Charging</option>
              <option value="Covered">Covered Parking</option>
              <option value="CCTV">CCTV Surveillance</option>
              <option value="Valet">Valet Service</option>
            </select>

            <button
              type="button"
              onClick={requestUserLocation}
              disabled={gpsLoading}
              className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Locate className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
              {gpsLoading ? 'Locating...' : userLat ? 'Located ✓' : 'Locate Me'}
            </button>
          </div>
        </div>

        {/* Quick Simulated Data Notice */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-blue-50/60 p-2 rounded-xl border border-blue-100">
          <Info className="w-3.5 h-3.5 text-brand-600 shrink-0" />
          <span>
            Demonstration mode: Parking occupancy rates are realistically simulated based on central urban traffic patterns.
          </span>
        </div>
      </div>

      {/* Interactive Main Area */}
      <div
        className={`grid gap-6 ${
          viewMode === 'both' ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'
        }`}
      >
        {/* Map View */}
        {(viewMode === 'both' || viewMode === 'map') && (
          <div className={`${viewMode === 'both' ? 'lg:col-span-7' : 'w-full'}`}>
            <div className="sticky top-20">
              <LeafletMap
                center={mapCenter}
                zoom={12}
                markers={mapMarkers}
                height={viewMode === 'both' ? '600px' : '650px'}
                showLayerControl={true}
              />
            </div>
          </div>
        )}

        {/* List View */}
        {(viewMode === 'both' || viewMode === 'list') && (
          <div className={`${viewMode === 'both' ? 'lg:col-span-5' : 'w-full'} space-y-4`}>
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>Found <strong>{filteredFacilities.length}</strong> facilities</span>
              <span>Sorted by availability</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
                Loading smart parking facilities...
              </div>
            ) : filteredFacilities.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
                <Car className="w-8 h-8 text-slate-400 mx-auto" />
                <h3 className="text-xs font-bold text-navy-950">No Facilities Match Filter</h3>
                <p className="text-[11px] text-slate-500">
                  Try adjusting your search query, increasing maximum rate, or resetting amenity filters.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-1">
                {filteredFacilities.map((facility) => {
                  const occupancyRatio =
                    ((facility.total_capacity - facility.available_spaces) /
                      facility.total_capacity) *
                    100;
                  const isLow = facility.available_spaces <= 5;

                  return (
                    <div
                      key={facility.id}
                      className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-brand-300 transition-all card-hover space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-bold text-navy-950 line-clamp-1">
                            {facility.name}
                          </h3>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="line-clamp-1">{facility.address}</span>
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-base font-extrabold text-navy-950">
                            ₹{getRate(facility)}
                            <span className="text-[10px] font-normal text-slate-500">/hr</span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {typeof facility.operating_hours === 'object'
                              ? '24/7'
                              : facility.operating_hours || 'Open'}
                          </span>
                        </div>
                      </div>

                      {/* Capacity Meter Bar */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-600 text-[11px]">
                            Live Vacancy:
                          </span>
                          <span
                            className={`font-bold text-xs ${
                              isLow ? 'text-red-600' : 'text-emerald-600'
                            }`}
                          >
                            {facility.available_spaces} of {facility.total_capacity} spots free
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            style={{ width: `${occupancyRatio}%` }}
                            className={`h-full rounded-full ${
                              isLow ? 'bg-red-500' : occupancyRatio > 70 ? 'bg-amber-500' : 'bg-brand-500'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Amenities Pills */}
                      {getAmenitiesStr(facility) && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {getAmenitiesStr(facility)
                            .split(',')
                            .slice(0, 3)
                            .map((am, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium"
                              >
                                {am.trim()}
                              </span>
                            ))}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <Link
                          to={`/parking/${facility.id}`}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                          AI Prediction & Details
                        </Link>

                        <Link
                          to={`/booking/${facility.id}`}
                          className="px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                        >
                          Reserve Bay
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
