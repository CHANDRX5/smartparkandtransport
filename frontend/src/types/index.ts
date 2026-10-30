// SmartPark AI - TypeScript Types and Data Contracts

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone?: string;
  role: 'citizen' | 'operator' | 'admin';
  is_active: boolean;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ParkingFacility {
  id: number;
  name: string;
  address: string;
  city: string;
  state?: string;
  latitude: number;
  longitude: number;
  total_capacity: number;
  available_spaces: number;
  /** Backend field — prefer price_per_hour */
  price_per_hour: number;
  /** Frontend alias kept for backward compat */
  hourly_rate?: number;
  price_per_day?: number;
  operator_id?: number;
  operating_hours: string | Record<string, string>;
  amenities: string | string[];
  vehicle_types?: string[];
  distance_km?: number;
  rating?: number;
  is_active?: boolean;
  is_demo_data?: boolean;
  contact_phone?: string;
  contact_email?: string;
  description?: string;
  image_url?: string;
}

export interface ParkingSpace {
  id: number;
  facility_id: number;
  space_number: string;
  vehicle_type: string;
  space_type?: string;
  floor?: string;
  floor_level?: string;
  is_covered?: boolean;
  is_ev_charging?: boolean;
  is_handicap?: boolean;
  is_occupied: boolean;
  is_active?: boolean;
  /** Extended status for owner management */
  slot_status?: 'available' | 'occupied' | 'reserved' | 'out_of_service';
  updated_at?: string;
  updated_by?: number;
  status_note?: string;
}

export interface SlotStatusUpdate {
  slot_status: 'available' | 'occupied' | 'reserved' | 'out_of_service';
  status_note?: string;
}



export interface Booking {
  id: number;
  booking_reference: string;
  user_id: number;
  facility_id: number;
  space_id?: number;
  vehicle_number: string;
  vehicle_type: string;
  start_time: string;
  end_time: string;
  total_amount: number;
  status: 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  facility_name?: string;
  facility_address?: string;
  space_number?: string;
}

export interface Payment {
  id: number;
  booking_id: number;
  user_id: number;
  amount: number;
  currency: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  payment_method: string;
  transaction_reference: string;
  is_simulated: boolean;
  created_at: string;
}

export interface LostVehicleReport {
  id: number;
  user_id: number;
  report_reference: string;
  license_plate: string;
  vehicle_type: string;
  make: string;
  model: string;
  color: string;
  last_seen_location: string;
  last_seen_latitude?: number;
  last_seen_longitude?: number;
  last_seen_datetime: string;
  description?: string;
  contact_name: string;
  contact_phone: string;
  hide_contact_details: boolean;
  status: 'OPEN' | 'POTENTIAL_MATCH' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED';
  created_at: string;
  images?: string[];
}

export interface FoundVehicleReport {
  id: number;
  reporter_id: number;
  report_reference: string;
  license_plate?: string;
  vehicle_type: string;
  make: string;
  model: string;
  color: string;
  found_location: string;
  found_latitude?: number;
  found_longitude?: number;
  found_datetime: string;
  description?: string;
  contact_name: string;
  contact_phone: string;
  status: 'OPEN' | 'POTENTIAL_MATCH' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED';
  created_at: string;
  images?: string[];
}

export interface SuggestedMatch {
  id: number;
  lost_report_id: number;
  found_report_id: number;
  match_score: number;
  match_reasons: string;
  is_verified: boolean;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  created_at: string;
  lost_report?: LostVehicleReport;
  found_report?: FoundVehicleReport;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link_url?: string;
  created_at: string;
}

export interface AIPredictionResult {
  facility_id: number;
  facility_name: string;
  hourly_predictions: {
    hour: number;
    time_label: string;
    predicted_occupancy_pct: number;
    predicted_available_spaces: number;
    busy_status: 'Low' | 'Moderate' | 'High' | 'Peak';
  }[];
  peak_hours: string[];
  suggested_alternatives: {
    facility_id: number;
    name: string;
    distance_km: number;
    available_spaces: number;
  }[];
  is_synthetic_model: boolean;
  model_name: string;
}

export interface TransitCrowdResult {
  route_id: number;
  route_name: string;
  route_number: string;
  transport_type: string;
  current_crowd_level: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  crowd_score: number;
  estimated_occupancy_pct: number;
  peak_hours: string[];
  next_arrival_time: string;
  stops: {
    name: string;
    sequence: number;
    scheduled_arrival: string;
  }[];
  is_simulated: boolean;
}

export interface RouteOption {
  type: 'shortest' | 'road_clearance' | 'weather_aware' | 'toll' | 'toll_free';
  title: string;
  distance_km: number;
  duration_mins: number;
  summary: string;
  toll_amount_est?: number;
  weather_status?: string;
  road_clearance_status?: string;
  data_source: string;
  coordinates: [number, number][];
}

export interface AdminAnalytics {
  total_users: number;
  total_facilities: number;
  total_capacity: number;
  total_available_spaces: number;
  active_bookings: number;
  total_revenue: number;
  open_lost_reports: number;
  potential_matches: number;
  occupancy_trend: {
    time: string;
    occupancy_pct: number;
  }[];
  revenue_by_facility: {
    name: string;
    revenue: number;
  }[];
}

// ─── WALLET ──────────────────────────────────────────────────────────────────
export interface WalletInfo {
  id: number;
  user_id: number;
  balance: number;
  currency: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WalletTransaction {
  id: number;
  wallet_id: number;
  user_id: number;
  amount: number;
  transaction_type: 'CREDIT' | 'DEBIT' | 'WITHDRAWAL' | 'REFUND' | 'REVERSAL';
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REVERSED';
  transaction_ref: string;
  reference_id?: string;
  description: string;
  payout_destination?: string;
  created_at?: string;
}

// ─── BUS SERVICES & BOOKING ─────────────────────────────────────────────────
export interface BusService {
  id: number;
  operator_name: string;
  bus_number: string;
  service_type: string;
  route_name: string;
  departure_point: string;
  destination_point: string;
  intermediate_stops: string[];
  departure_time: string;
  arrival_time: string;
  fare: number;
  total_seats: number;
  seat_layout?: { rows: number; cols: number; type: string };
  is_active: boolean;
  created_at?: string;
}

export interface BusSeatStatus {
  seat_number: string;
  row: number;
  col: number;
  status: 'available' | 'booked' | 'held' | 'selected';
  passenger_name?: string;
}

export interface BusSeatMap {
  trip_id: number;
  bus_service_id: number;
  operator_name: string;
  bus_number: string;
  route_name: string;
  trip_date: string;
  departure_time: string;
  arrival_time: string;
  fare: number;
  total_seats: number;
  available_seats: number;
  seats: BusSeatStatus[];
}

export interface BusBooking {
  id: number;
  booking_ref: string;
  trip_id: number;
  user_id: number;
  passenger_name: string;
  passenger_phone: string;
  seat_number: string;
  fare: number;
  status: string;
  payment_method: string;
  payment_ref?: string;
  created_at?: string;
  bus_number?: string;
  operator_name?: string;
  route_name?: string;
  trip_date?: string;
  departure_time?: string;
}

// ─── NEARBY PLACES ──────────────────────────────────────────────────────────
export interface NearbyPlace {
  id: number;
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  opening_hours?: string;
  description?: string;
  rating?: number;
  is_verified: boolean;
  distance_km?: number;
  created_at?: string;
}

// ─── COMPLAINTS & EMERGENCY ─────────────────────────────────────────────────
export interface Complaint {
  id: number;
  complaint_ref: string;
  user_id: number;
  category: string;
  subject: string;
  description: string;
  linked_reference?: string;
  contact_email?: string;
  contact_phone?: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED';
  resolution_notes?: string;
  resolved_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EmergencyContact {
  service_name: string;
  category: string;
  number: string;
  description: string;
  badge?: string;
  is_toll_free: boolean;
}

// ─── WEATHER ────────────────────────────────────────────────────────────────
export interface WeatherPoint {
  location?: string;
  lat: number;
  lng: number;
  temp_c: number;
  feels_like_c?: number;
  description: string;
  humidity?: number;
  wind_speed?: number;
  pressure?: number;
  visibility_km?: number;
  icon?: string;
  source: string;
  status: string;
  warning?: string;
}

export interface WeatherForecastItem {
  datetime: string;
  temp_c: number;
  description: string;
  humidity?: number;
  wind_speed?: number;
  rain_prob?: number;
}

export interface WeatherForecast {
  location: string;
  lat: number;
  lng: number;
  source: string;
  forecasts: WeatherForecastItem[];
}

export interface WeatherVerifyStatus {
  configured: boolean;
  key_present: boolean;
  key_masked?: string;
  endpoint: string;
  api_status: string;
  http_code?: number;
  fallback_active: boolean;
  fallback_provider: string;
  message: string;
}

