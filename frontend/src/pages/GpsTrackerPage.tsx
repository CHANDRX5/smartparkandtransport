import React, { useState, useEffect, useRef } from 'react';
import {
  Navigation,
  MapPin,
  Car,
  Zap,
  Shield,
  Locate,
  AlertCircle,
  Compass,
  StopCircle,
  WifiOff,
  Search,
  X,
} from 'lucide-react';
import { LeafletMap, MapMarker } from '../components/LeafletMap';
import { transportApi, parkingApi } from '../services/api';

export const GpsTrackerPage: React.FC = () => {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [defaultLocation] = useState<[number, number]>([12.9716, 77.5946]); // Bangalore – only used when GPS is unavailable
  const [gpsActive, setGpsActive] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [facilityType, setFacilityType] = useState<string>('parking');
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDest, setSelectedDest] = useState<any | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [manualSearch, setManualSearch] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const watchIdRef = useRef<number | null>(null);

  // Clean up watcher on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  // Fetch when facility type changes — use current or default location
  useEffect(() => {
    const loc = userLocation || defaultLocation;
    fetchNearbyFacilities(loc[0], loc[1], facilityType);
  }, [facilityType]);

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
  };

  const requestGps = () => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      setShowManualInput(true);
      return;
    }

    // Single one-shot lookup first
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        setAccuracy(pos.coords.accuracy);
        setGpsActive(true);
        fetchNearbyFacilities(coords[0], coords[1], facilityType);
      },
      (err) => {
        let message = 'GPS unavailable.';
        if (err.code === err.PERMISSION_DENIED) {
          message = 'GPS permission denied. Please allow location access in your browser settings, or use manual search.';
        } else if (err.code === err.TIMEOUT) {
          message = 'GPS timed out. Check your GPS signal and try again.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          message = 'GPS signal unavailable. Are you indoors? Try manual search.';
        }
        setGpsError(message);
        setGpsActive(false);
        setShowManualInput(true);
      },
      { timeout: 12000, enableHighAccuracy: true }
    );
  };

  const startContinuousTracking = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }
    setGpsError(null);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        setAccuracy(pos.coords.accuracy);
        setGpsActive(true);
      },
      (err) => {
        setGpsError(`Tracking error: ${err.message}`);
        stopTracking();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
    );

    watchIdRef.current = watchId;
    setTracking(true);
  };

  const handleStopTracking = () => {
    stopTracking();
    setGpsActive(false);
  };

  const handleManualSearch = async () => {
    // Naive city-name based lat/lng via Nominatim (OpenStreetMap geocoding)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(manualSearch)}&format=json&limit=1`
      );
      const data = await res.json();
      if (data.length > 0) {
        const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        setUserLocation(coords);
        setGpsActive(false);
        fetchNearbyFacilities(coords[0], coords[1], facilityType);
        setShowManualInput(false);
      } else {
        setGpsError('Location not found. Please try a different search term.');
      }
    } catch {
      setGpsError('Could not search location. Check your internet connection.');
    }
  };

  const fetchNearbyFacilities = async (lat: number, lng: number, type: string) => {
    try {
      setLoading(true);
      const data = await transportApi.getNearbyFacilities(lat, lng, type);
      setFacilities(data);
    } catch {
      try {
        const parkings = await parkingApi.getFacilities();
        setFacilities(parkings);
      } catch {
        setFacilities([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDestination = async (dest: any) => {
    setSelectedDest(dest);
    const origin = userLocation || defaultLocation;
    try {
      const plan = await transportApi.planRoute(origin, [dest.latitude, dest.longitude]);
      if (plan && plan.coordinates) {
        setRouteCoords(plan.coordinates);
      }
    } catch {
      setRouteCoords([origin, [dest.latitude, dest.longitude]]);
    }
  };

  const displayLocation = userLocation || defaultLocation;

  const mapMarkers: MapMarker[] = [
    {
      id: 'user_pos',
      lat: displayLocation[0],
      lng: displayLocation[1],
      title: gpsActive ? 'Your GPS Location' : (userLocation ? 'Searched Location' : 'Default Location (Bangalore)'),
      subtitle: gpsActive
        ? `GPS Active${accuracy ? ` • Accuracy: ±${Math.round(accuracy)}m` : ''}`
        : userLocation
        ? 'Manual search result'
        : 'Enable GPS for your real location',
      type: 'user',
    },
    ...facilities.map((f, i) => ({
      id: f.id || `fac_${i}`,
      lat: f.latitude,
      lng: f.longitude,
      title: f.name,
      subtitle: `${f.address || ''} • ${f.distance_km ? `${f.distance_km} km away` : ''}`,
      availableSpaces: f.available_spaces,
      totalCapacity: f.total_capacity,
      hourlyRate: f.price_per_hour ?? f.hourly_rate,
      type: (f.type || 'parking') as any,
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-950 flex items-center gap-2">
            <Compass className="w-6 h-6 text-brand-600" />
            GPS Facility Radar &amp; Live Tracker
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Discover nearby parking, EV chargers, fuel stations, and emergency healthcare with OSRM routing.
          </p>
        </div>

        {/* GPS Controls */}
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          {!tracking ? (
            <>
              <button
                onClick={requestGps}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs ${
                  gpsActive
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Locate className={`w-4 h-4 ${gpsActive ? 'animate-pulse' : ''}`} />
                {gpsActive ? 'Refresh GPS' : 'Get My Location'}
              </button>
              <button
                onClick={startContinuousTracking}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white flex items-center gap-2 shadow-xs transition-all"
              >
                <Navigation className="w-4 h-4" />
                Start Live Tracking
              </button>
            </>
          ) : (
            <button
              onClick={handleStopTracking}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 shadow-xs transition-all"
            >
              <StopCircle className="w-4 h-4" />
              Stop Tracking
            </button>
          )}

          <button
            onClick={() => setShowManualInput(!showManualInput)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Manual Search
          </button>
        </div>
      </div>

      {/* Tracking Status */}
      {tracking && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <Navigation className="w-4 h-4 shrink-0 animate-pulse" />
          <span>
            Live GPS tracking active.{' '}
            {accuracy !== null && `Location accuracy: ±${Math.round(accuracy)}m. `}
            Your marker updates automatically as you move.
          </span>
        </div>
      )}

      {/* GPS Error */}
      {gpsError && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <span>{gpsError}</span>
            {!userLocation && (
              <p className="mt-1 text-amber-700">
                Showing Bangalore metropolitan area as default. Use manual search to set your location.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Manual Location Search */}
      {showManualInput && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={manualSearch}
              onChange={(e) => setManualSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
              placeholder="Search city or address (e.g. MG Road, Bangalore)..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button
            onClick={handleManualSearch}
            disabled={!manualSearch.trim()}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold disabled:opacity-40 transition-all"
          >
            Search
          </button>
          <button
            onClick={() => setShowManualInput(false)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Location Status Banner */}
      {!gpsActive && !userLocation && (
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0 text-blue-500" />
          <span>
            GPS not enabled. Facilities shown are from the database. Click "Get My Location" to see nearby facilities based on your actual position.
          </span>
        </div>
      )}

      {/* Facility Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'parking', label: 'Smart Parking Bays', icon: Car },
          { id: 'ev', label: 'EV Fast Chargers', icon: Zap },
          { id: 'hospital', label: 'Emergency Hospitals', icon: Shield },
          { id: 'fuel', label: 'Fuel / Gas Pumps', icon: Compass },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = facilityType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFacilityType(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30 font-bold'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <LeafletMap
            center={displayLocation}
            zoom={13}
            markers={mapMarkers}
            routeCoordinates={routeCoords}
            height="560px"
            showLayerControl={true}
          />
        </div>

        {/* Nearby Facilities List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider mb-2">
              Nearby {facilityType.toUpperCase()} Facilities
            </h3>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Scanning area...</div>
            ) : facilities.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No facilities found in current area.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {facilities.map((fac, idx) => (
                  <div
                    key={fac.id || idx}
                    onClick={() => handleSelectDestination(fac)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      selectedDest?.id === fac.id
                        ? 'border-brand-500 bg-blue-50/70 shadow-xs'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-navy-950 line-clamp-1">{fac.name}</h4>
                      {fac.distance_km && (
                        <span className="text-[10px] font-bold text-brand-600 shrink-0">
                          {fac.distance_km} km
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {fac.address || 'City Zone'}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      {fac.available_spaces !== undefined && (
                        <span className="text-emerald-600 font-semibold">
                          {fac.available_spaces} spaces left
                        </span>
                      )}
                      <span className="text-brand-600 font-bold flex items-center gap-1 hover:underline">
                        Get Directions &rarr;
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
