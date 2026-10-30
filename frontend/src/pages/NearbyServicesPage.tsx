
import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Hospital,
  Hotel,
  UtensilsCrossed,
  Trees,
  Wrench,
  Phone,
  Navigation,
  Search,
  Star,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  ExternalLink,
  Locate,
  ShieldCheck,
} from 'lucide-react';
import { nearbyApi } from '../services/api';
import { NearbyPlace } from '../types';
import { LeafletMap, MapMarker } from '../components/LeafletMap';

const CATEGORIES = [
  { key: 'all', label: 'All Places', icon: MapPin, color: 'text-brand-600' },
  { key: 'hospital', label: 'Hospitals', icon: Hospital, color: 'text-red-600' },
  { key: 'hotel', label: 'Hotels', icon: Hotel, color: 'text-indigo-600' },
  { key: 'restaurant', label: 'Restaurants', icon: UtensilsCrossed, color: 'text-orange-600' },
  { key: 'park', label: 'Parks', icon: Trees, color: 'text-emerald-600' },
  { key: 'mechanic', label: 'Mechanics', icon: Wrench, color: 'text-slate-600' },
];

const categoryIcon = (cat: string) => {
  switch (cat) {
    case 'hospital': return '🏥';
    case 'hotel': return '🏨';
    case 'restaurant': return '🍽️';
    case 'park': return '🌳';
    case 'mechanic': return '🔧';
    default: return '📍';
  }
};

const categoryMapType = (cat: string): 'hospital' | 'parking' | 'fuel' | 'ev' | 'user' | 'destination' => {
  switch (cat) {
    case 'hospital': return 'hospital';
    case 'mechanic': return 'fuel';
    default: return 'destination';
  }
};

export const NearbyServicesPage: React.FC = () => {
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<NearbyPlace | null>(null);

  useEffect(() => {
    loadPlaces();
  }, [category]);

  useEffect(() => {
    // Try to get user location on mount
    requestLocation();
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setGpsLoading(false);
        loadPlaces(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Location permission denied. Showing all nearby places without distance.');
        } else {
          setGpsError('Unable to get location. Showing all places.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const loadPlaces = async (lat?: number, lng?: number) => {
    try {
      setLoading(true);
      const params: any = { radius_km: 50 };
      if (category !== 'all') params.category = category;
      if (searchQuery) params.query = searchQuery;
      if (lat && lng) { params.lat = lat; params.lng = lng; }
      else if (userLat && userLng) { params.lat = userLat; params.lng = userLng; }
      const data = await nearbyApi.getPlaces(params);
      setPlaces(data as NearbyPlace[]);
    } catch { /* handled */ } finally { setLoading(false); }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadPlaces();
  };

  const mapCenter: [number, number] = userLat && userLng
    ? [userLat, userLng]
    : places.length > 0
      ? [places[0].latitude, places[0].longitude]
      : [12.9716, 77.5946];

  const mapMarkers: MapMarker[] = [
    ...(userLat && userLng ? [{
      id: 'user-location',
      lat: userLat,
      lng: userLng,
      title: 'Your Location',
      type: 'user' as const,
    }] : []),
    ...places.map(p => ({
      id: p.id,
      lat: p.latitude,
      lng: p.longitude,
      title: `${categoryIcon(p.category)} ${p.name}`,
      subtitle: `${p.address} • ${p.opening_hours || ''}`,
      type: categoryMapType(p.category),
      onClick: () => setSelectedPlace(p),
    })),
  ];

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-3 h-3 ${i < Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-navy-950 flex items-center gap-2">
          <MapPin className="w-6 h-6 text-brand-600" />
          Nearby Services & Facilities
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Find hospitals, hotels, restaurants, parks, and vehicle mechanic shops near your location.
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          return (
            <button key={cat.key} onClick={() => setCategory(cat.key)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                category === cat.key
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}>
              <Icon className={`w-3.5 h-3.5 ${category === cat.key ? 'text-white' : cat.color}`} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Search + Location */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name or address..."
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:bg-white" />
          </div>
          <button type="button" onClick={requestLocation} disabled={gpsLoading}
            className="px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold transition-all flex items-center gap-1.5">
            <Locate className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
            {gpsLoading ? 'Locating...' : 'Use My Location'}
          </button>
          <button type="submit" className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md transition-all">
            Search
          </button>
        </form>
        {gpsError && (
          <p className="mt-2 text-[11px] text-amber-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {gpsError}
          </p>
        )}
      </div>

      {/* Map + List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Map */}
        <div className="lg:col-span-7">
          <LeafletMap
            center={mapCenter}
            zoom={13}
            markers={mapMarkers}
            height="550px"
            showLayerControl={true}
          />
        </div>

        {/* List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Found <strong>{places.length}</strong> places</span>
            {userLat && <span className="text-emerald-600 flex items-center gap-1"><Locate className="w-3 h-3" /> Sorted by distance</span>}
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border">Loading nearby places...</div>
          ) : places.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border space-y-2">
              <MapPin className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-500">No places found for this category.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
              {places.map(place => (
                <div key={place.id}
                  className={`p-4 rounded-2xl border transition-all card-hover cursor-pointer ${
                    selectedPlace?.id === place.id ? 'border-brand-400 bg-blue-50/40 shadow-md' : 'border-slate-200 bg-white hover:border-brand-300'
                  }`}
                  onClick={() => setSelectedPlace(place)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{categoryIcon(place.category)}</span>
                        <h4 className="text-xs font-bold text-navy-950 truncate">{place.name}</h4>
                        {place.is_verified && <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{place.address}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        {place.distance_km !== undefined && place.distance_km !== null && (
                          <span className="font-semibold text-brand-600">{place.distance_km} km away</span>
                        )}
                        {place.opening_hours && (
                          <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {place.opening_hours}</span>
                        )}
                      </div>
                      {place.rating && (
                        <div className="flex items-center gap-1">{renderStars(place.rating)} <span className="text-[10px] text-slate-400">{place.rating}</span></div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {place.phone && (
                        <a href={`tel:${place.phone}`} onClick={e => e.stopPropagation()}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-bold flex items-center gap-1 transition-all">
                          <Phone className="w-3 h-3" /> Call
                        </a>
                      )}
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`}
                        target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        className="px-2.5 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 text-[10px] font-bold flex items-center gap-1 transition-all">
                        <Navigation className="w-3 h-3" /> Go
                      </a>
                    </div>
                  </div>
                  {place.description && selectedPlace?.id === place.id && (
                    <p className="mt-2 text-[11px] text-slate-600 leading-relaxed border-t border-slate-100 pt-2">{place.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Data Freshness */}
      <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>Places data sourced from SmartPark verified directory. Verified places are marked with <ShieldCheck className="w-3 h-3 text-emerald-500 inline" />. Contact details shown are from verified records only.</span>
      </div>
    </div>
  );
};
