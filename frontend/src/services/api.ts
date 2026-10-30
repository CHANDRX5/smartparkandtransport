import axios from 'axios';
import {
  AuthResponse,
  User,
  ParkingFacility,
  ParkingSpace,
  Booking,
  Payment,
  LostVehicleReport,
  FoundVehicleReport,
  SuggestedMatch,
  NotificationItem,
  AIPredictionResult,
  TransitCrowdResult,
  AdminAnalytics,
  SlotStatusUpdate,
  WeatherPoint,
  WeatherForecast,
  WeatherVerifyStatus,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('smartpark_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 (session expiry)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('smartpark_token');
      localStorage.removeItem('smartpark_user');
    }
    return Promise.reject(error);
  }
);

/** Unwrap paginated response or plain array safely */
function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as any).items)) {
    return (data as any).items as T[];
  }
  return [];
}

// ─── AUTH ────────────────────────────────────────────────────────────────────
export const authApi = {
  login: async (credentials: { email: string; password: string }): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return res.data;
  },
  register: async (userData: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    role?: string;
  }): Promise<User> => {
    const res = await apiClient.post<User>('/auth/register', userData);
    return res.data;
  },
  getProfile: async (): Promise<User> => {
    const res = await apiClient.get<User>('/auth/me');
    return res.data;
  },
  updateProfile: async (data: Partial<User>): Promise<User> => {
    const res = await apiClient.put<User>('/auth/me', data);
    return res.data;
  },
};

// ─── PARKING ─────────────────────────────────────────────────────────────────
export const parkingApi = {
  getFacilities: async (params?: {
    city?: string;
    lat?: number;
    lng?: number;
    radius_km?: number;
    search?: string;
    query?: string;
    max_price?: number;
    available_only?: boolean;
  }): Promise<ParkingFacility[]> => {
    const res = await apiClient.get('/parking/facilities', { params });
    return unwrapList<ParkingFacility>(res.data);
  },
  getFacilityById: async (id: number): Promise<ParkingFacility> => {
    const res = await apiClient.get<ParkingFacility>(`/parking/facilities/${id}`);
    return res.data;
  },
  getFacilitySpaces: async (id: number): Promise<ParkingSpace[]> => {
    const res = await apiClient.get(`/parking/facilities/${id}/spaces`);
    return unwrapList<ParkingSpace>(res.data);
  },
  createFacility: async (facility: Partial<ParkingFacility>): Promise<ParkingFacility> => {
    const res = await apiClient.post<ParkingFacility>('/parking/facilities', facility);
    return res.data;
  },
  updateFacility: async (id: number, facility: Partial<ParkingFacility>): Promise<ParkingFacility> => {
    const res = await apiClient.put<ParkingFacility>(`/parking/facilities/${id}`, facility);
    return res.data;
  },
};

// ─── BOOKINGS ─────────────────────────────────────────────────────────────────
export const bookingApi = {
  createBooking: async (bookingData: {
    facility_id: number;
    vehicle_reg_number: string;
    vehicle_type: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    duration_hours: number;
  }): Promise<Booking> => {
    const res = await apiClient.post<Booking>('/bookings/', bookingData);
    return res.data;
  },
  getMyBookings: async (): Promise<Booking[]> => {
    const res = await apiClient.get('/bookings/');
    return unwrapList<Booking>(res.data);
  },
  getBookingById: async (id: number): Promise<Booking> => {
    const res = await apiClient.get<Booking>(`/bookings/${id}`);
    return res.data;
  },
  checkInBooking: async (id: number): Promise<Booking> => {
    const res = await apiClient.post<Booking>(`/bookings/${id}/checkin`);
    return res.data;
  },
  checkOutBooking: async (id: number): Promise<Booking> => {
    const res = await apiClient.post<Booking>(`/bookings/${id}/checkout`);
    return res.data;
  },
  cancelBooking: async (id: number, reason?: string): Promise<Booking> => {
    const res = await apiClient.post<Booking>(`/bookings/${id}/cancel`, {
      reason: reason || 'User cancelled',
    });
    return res.data;
  },
  getAllBookingsAdmin: async (): Promise<Booking[]> => {
    const res = await apiClient.get('/bookings/');
    return unwrapList<Booking>(res.data);
  },
  getFacilityBookings: async (facilityId: number): Promise<Booking[]> => {
    const res = await apiClient.get(`/bookings/facility/${facilityId}`);
    return unwrapList<Booking>(res.data);
  },
};

// ─── PAYMENTS ────────────────────────────────────────────────────────────────
export const paymentApi = {
  processDemoPayment: async (data: {
    booking_id: number;
    payment_method: string;
  }): Promise<Payment> => {
    const res = await apiClient.post<Payment>('/payments/process-demo', data);
    return res.data;
  },
  getPaymentHistory: async (): Promise<Payment[]> => {
    const res = await apiClient.get('/payments/history');
    return unwrapList<Payment>(res.data);
  },
};

// ─── LOST & FOUND ────────────────────────────────────────────────────────────
export const lostFoundApi = {
  reportLost: async (report: Partial<LostVehicleReport>): Promise<LostVehicleReport> => {
    const res = await apiClient.post<LostVehicleReport>('/lost-found/lost-reports', report);
    return res.data;
  },
  getLostReports: async (): Promise<LostVehicleReport[]> => {
    const res = await apiClient.get('/lost-found/lost-reports');
    return unwrapList<LostVehicleReport>(res.data);
  },
  reportFound: async (report: Partial<FoundVehicleReport>): Promise<FoundVehicleReport> => {
    const res = await apiClient.post<FoundVehicleReport>('/lost-found/found-reports', report);
    return res.data;
  },
  getFoundReports: async (): Promise<FoundVehicleReport[]> => {
    const res = await apiClient.get('/lost-found/found-reports');
    return unwrapList<FoundVehicleReport>(res.data);
  },
  getMatchesForLost: async (lostId: number): Promise<SuggestedMatch[]> => {
    const res = await apiClient.get<SuggestedMatch[]>(`/lost-found/lost-reports/${lostId}/matches`);
    return Array.isArray(res.data) ? res.data : [];
  },
  reviewMatch: async (matchId: number, status: 'CONFIRMED' | 'REJECTED'): Promise<SuggestedMatch> => {
    const res = await apiClient.post<SuggestedMatch>(`/lost-found/matches/${matchId}/review`, { status });
    return res.data;
  },
  uploadPhoto: async (formData: FormData): Promise<{ file_path: string; url: string }> => {
    const res = await apiClient.post<{ file_path: string; url: string }>(
      '/lost-found/upload-photo',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data;
  },
};

// ─── TRANSPORT ───────────────────────────────────────────────────────────────
export const transportApi = {
  getNearbyFacilities: async (lat: number, lng: number, type?: string) => {
    const res = await apiClient.get('/transport/nearby', { params: { lat, lng, type } });
    return unwrapList(res.data);
  },
  planRoute: async (origin: [number, number], destination: [number, number], options?: any) => {
    const res = await apiClient.post('/transport/routes', { origin, destination, options });
    return res.data;
  },
  getCrowdPrediction: async (routeId?: number): Promise<TransitCrowdResult[]> => {
    const res = await apiClient.get('/transport/crowd-prediction', {
      params: { route_id: routeId },
    });
    return unwrapList<TransitCrowdResult>(res.data);
  },
};

// ─── PREDICTIONS / NOTIFICATIONS ─────────────────────────────────────────────
export const predictionApi = {
  getParkingPrediction: async (facilityId: number): Promise<AIPredictionResult> => {
    const res = await apiClient.get<AIPredictionResult>(`/predictions/parking/${facilityId}`);
    return res.data;
  },
  getNotifications: async (): Promise<NotificationItem[]> => {
    const res = await apiClient.get('/predictions/notifications');
    return unwrapList<NotificationItem>(res.data);
  },
  markNotificationRead: async (id: number): Promise<void> => {
    await apiClient.patch(`/predictions/notifications/${id}/read`);
  },
  getAdminAnalytics: async (): Promise<AdminAnalytics> => {
    const res = await apiClient.get<AdminAnalytics>('/predictions/admin-analytics');
    return res.data;
  },
};

// ─── OWNER / OPERATOR ────────────────────────────────────────────────────────
export const ownerApi = {
  getMyFacilities: async (): Promise<ParkingFacility[]> => {
    const res = await apiClient.get('/parking/my-facilities');
    return unwrapList<ParkingFacility>(res.data);
  },
  getSlots: async (facilityId: number): Promise<ParkingSpace[]> => {
    const res = await apiClient.get(`/parking/facilities/${facilityId}/spaces`);
    return unwrapList<ParkingSpace>(res.data);
  },
  createSlot: async (facilityId: number, data: Partial<ParkingSpace>): Promise<ParkingSpace> => {
    const res = await apiClient.post<ParkingSpace>(
      `/parking/facilities/${facilityId}/spaces`,
      data
    );
    return res.data;
  },
  updateSlotStatus: async (
    facilityId: number,
    spaceId: number,
    data: SlotStatusUpdate
  ): Promise<ParkingSpace> => {
    const res = await apiClient.patch<ParkingSpace>(
      `/parking/facilities/${facilityId}/spaces/${spaceId}/status`,
      data
    );
    return res.data;
  },
  getOwnerBookings: async (facilityId: number): Promise<Booking[]> => {
    const res = await apiClient.get(`/bookings/facility/${facilityId}`);
    return unwrapList<Booking>(res.data);
  },
  getOwnerRevenue: async (facilityId: number) => {
    const res = await apiClient.get(`/parking/facilities/${facilityId}/revenue`);
    return res.data;
  },
};

// ─── AI SPACE DETECTION ───────────────────────────────────────────────────────
export const aiDetectionApi = {
  analyzeImage: async (formData: FormData) => {
    const res = await apiClient.post('/ai/parking-detection', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  getAnalyses: async () => {
    const res = await apiClient.get('/ai/parking-detection/history');
    return unwrapList(res.data);
  },
  getAnalysisById: async (id: number) => {
    const res = await apiClient.get(`/ai/parking-detection/${id}`);
    return res.data;
  },
  reviewAnalysis: async (
    id: number,
    payload: { detected_spaces?: any[]; review_notes?: string }
  ) => {
    const res = await apiClient.patch(`/ai/parking-detection/${id}/review`, payload);
    return res.data;
  },
  applyAnalysis: async (id: number) => {
    const res = await apiClient.post(`/ai/parking-detection/${id}/apply`);
    return res.data;
  },
};

// ─── WALLET ──────────────────────────────────────────────────────────────────
export const walletApi = {
  getWallet: async () => {
    const res = await apiClient.get('/wallet/me');
    return res.data;
  },
  topup: async (amount: number, payment_method: string = 'demo_sandbox') => {
    const res = await apiClient.post('/wallet/topup', { amount, payment_method });
    return res.data;
  },
  debit: async (data: { amount: number; service_type: string; reference_id?: string; description: string }) => {
    const res = await apiClient.post('/wallet/debit', data);
    return res.data;
  },
  withdraw: async (data: { amount: number; payout_destination: string }) => {
    const res = await apiClient.post('/wallet/withdraw', data);
    return res.data;
  },
  getTransactions: async (tx_type?: string, status?: string, limit?: number) => {
    const res = await apiClient.get('/wallet/transactions', { params: { tx_type, status, limit } });
    return unwrapList(res.data);
  },
};

// ─── BUS SERVICES & SEAT BOOKING ────────────────────────────────────────────
export const busApi = {
  listBuses: async (params?: { origin?: string; destination?: string; operator?: string }) => {
    const res = await apiClient.get('/transport/buses', { params });
    return unwrapList(res.data);
  },
  getSeatMap: async (serviceId: number, tripDate: string) => {
    const res = await apiClient.get(`/transport/buses/${serviceId}/trips/${tripDate}/seats`);
    return res.data;
  },
  bookSeat: async (data: { trip_id: number; seat_number: string; passenger_name: string; passenger_phone: string; payment_method?: string }) => {
    const res = await apiClient.post('/transport/buses/book-seat', data);
    return res.data;
  },
  getMyBookings: async () => {
    const res = await apiClient.get('/transport/buses/my-bookings');
    return unwrapList(res.data);
  },
  cancelBooking: async (bookingId: number) => {
    const res = await apiClient.post(`/transport/buses/bookings/${bookingId}/cancel`);
    return res.data;
  },
};

// ─── NEARBY PLACES ──────────────────────────────────────────────────────────
export const nearbyApi = {
  getPlaces: async (params?: { category?: string; query?: string; lat?: number; lng?: number; radius_km?: number }) => {
    const res = await apiClient.get('/transport/nearby-places', { params });
    return unwrapList(res.data);
  },
  createPlace: async (data: any) => {
    const res = await apiClient.post('/transport/nearby-places', data);
    return res.data;
  },
};

// ─── COMPLAINTS & EMERGENCY ─────────────────────────────────────────────────
export const emergencyApi = {
  getContacts: async () => {
    const res = await apiClient.get('/transport/emergency-contacts');
    return unwrapList(res.data);
  },
  submitComplaint: async (data: { category: string; subject: string; description: string; linked_reference?: string; contact_email?: string; contact_phone?: string }) => {
    const res = await apiClient.post('/transport/complaints', data);
    return res.data;
  },
  getMyComplaints: async () => {
    const res = await apiClient.get('/transport/complaints/my');
    return unwrapList(res.data);
  },
};

// ─── WEATHER (SECURE BACKEND PROXY) ──────────────────────────────────────────
export const weatherApi = {
  getCurrentWeather: async (lat: number, lng: number, location?: string): Promise<WeatherPoint> => {
    const res = await apiClient.get<WeatherPoint>('/transport/weather', {
      params: { lat, lng, location },
    });
    return res.data;
  },
  getForecast: async (lat: number, lng: number, location?: string, days: number = 3): Promise<WeatherForecast> => {
    const res = await apiClient.get<WeatherForecast>('/transport/weather/forecast', {
      params: { lat, lng, location, days },
    });
    return res.data;
  },
  verifyConnection: async (): Promise<WeatherVerifyStatus> => {
    const res = await apiClient.get<WeatherVerifyStatus>('/transport/weather/verify');
    return res.data;
  },
};
