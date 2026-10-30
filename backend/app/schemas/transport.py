"""SmartPark AI - Pydantic Schemas for Transport, Route, Notifications."""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# --- Transport ---
class TransportRouteOut(BaseModel):
    id: int
    route_number: str
    route_name: str
    route_type: str
    origin: str
    destination: str
    frequency_minutes: Optional[int] = None
    operating_hours: Optional[dict] = None
    is_demo_data: bool

    class Config:
        from_attributes = True


class TransportStopOut(BaseModel):
    id: int
    route_id: int
    stop_name: str
    stop_order: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    scheduled_arrival: Optional[str] = None

    class Config:
        from_attributes = True


class CrowdPredictionRequest(BaseModel):
    route_id: int
    day_of_week: Optional[int] = None  # 0-6
    hour_of_day: Optional[int] = None  # 0-23


class CrowdPredictionOut(BaseModel):
    route_id: int
    route_name: str
    day_of_week: int
    hour_of_day: int
    crowd_level: str
    crowd_percentage: float
    confidence: Optional[float] = None
    peak_hours: List[int] = []
    alternative_times: List[int] = []
    is_demo_prediction: bool = True
    explanation: str = ""


# --- Route Planner ---
class RoutePlanRequest(BaseModel):
    origin_lat: float = Field(..., ge=-90, le=90)
    origin_lng: float = Field(..., ge=-180, le=180)
    destination_lat: float = Field(..., ge=-90, le=90)
    destination_lng: float = Field(..., ge=-180, le=180)
    origin_name: Optional[str] = "Origin"
    destination_name: Optional[str] = "Destination"
    route_type: str = Field(default="shortest", pattern="^(shortest|toll_free|weather_aware|toll|road_clearance)$")


class RouteOut(BaseModel):
    distance_km: float
    duration_minutes: float
    route_type: str
    geometry: Optional[list] = None  # Polyline coordinates
    instructions: Optional[List[str]] = None
    toll_info: Optional[str] = None
    weather_info: Optional[list] = None
    road_clearance_info: Optional[str] = None
    data_source: str = "OSRM"
    last_updated: Optional[str] = None


class WeatherPointOut(BaseModel):
    location: Optional[str] = "Location"
    lat: float
    lng: float
    temp_c: float
    feels_like_c: Optional[float] = None
    description: str
    humidity: Optional[int] = None
    wind_speed: Optional[float] = None
    pressure: Optional[int] = None
    visibility_km: Optional[float] = None
    icon: Optional[str] = None
    source: str
    status: str = "ok"
    warning: Optional[str] = None


class WeatherVerifyOut(BaseModel):
    configured: bool
    key_present: bool
    key_masked: Optional[str] = None
    endpoint: str
    api_status: str
    http_code: Optional[int] = None
    fallback_active: bool
    fallback_provider: str
    message: str


class WeatherForecastItem(BaseModel):
    datetime: str
    temp_c: float
    description: str
    humidity: Optional[int] = None
    wind_speed: Optional[float] = None
    rain_prob: Optional[float] = None


class WeatherForecastOut(BaseModel):
    location: str
    lat: float
    lng: float
    source: str
    forecasts: List[WeatherForecastItem]



class RouteHistoryOut(BaseModel):
    id: int
    origin_name: str
    destination_name: str
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    distance_km: Optional[float] = None
    duration_minutes: Optional[float] = None
    route_type: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- GPS Nearby ---
class NearbySearchRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius_km: float = Field(default=5.0, ge=0.1, le=50)
    facility_type: str = Field(default="parking")  # parking, hospital, fuel, ev_charging


class NearbyFacilityOut(BaseModel):
    id: Optional[int] = None
    name: str
    address: Optional[str] = None
    latitude: float
    longitude: float
    distance_km: float
    facility_type: str
    details: Optional[dict] = None


# --- Notifications ---
class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    notification_type: str
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    is_read: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Admin Analytics ---
class AdminAnalytics(BaseModel):
    total_users: int
    total_facilities: int
    total_available_spaces: int
    active_bookings: int
    completed_bookings: int
    total_revenue: float
    open_lost_reports: int
    open_found_reports: int
    potential_matches: int
    is_demo_data: bool = True


# --- Saved Location ---
class SavedLocationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    location_type: str = "parking"
    facility_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None


class SavedLocationOut(BaseModel):
    id: int
    name: str
    location_type: str
    facility_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Bus Services & Seat Booking ---
class BusServiceCreate(BaseModel):
    operator_name: str
    bus_number: str
    service_type: Optional[str] = "AC Executive"
    route_name: str
    departure_point: str
    destination_point: str
    intermediate_stops: Optional[list] = []
    departure_time: str
    arrival_time: str
    fare: float
    total_seats: Optional[int] = 28
    seat_layout: Optional[dict] = {"rows": 7, "cols": 4, "type": "2x2"}


class BusServiceOut(BaseModel):
    id: int
    operator_name: str
    bus_number: str
    service_type: str
    route_name: str
    departure_point: str
    destination_point: str
    intermediate_stops: Optional[list] = []
    departure_time: str
    arrival_time: str
    fare: float
    total_seats: int
    seat_layout: Optional[dict] = None
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BusSeatStatus(BaseModel):
    seat_number: str
    row: int
    col: int
    status: str  # available, booked, held
    passenger_name: Optional[str] = None


class BusSeatMapOut(BaseModel):
    trip_id: int
    bus_service_id: int
    operator_name: str
    bus_number: str
    route_name: str
    trip_date: str
    departure_time: str
    arrival_time: str
    fare: float
    total_seats: int
    available_seats: int
    seats: List[BusSeatStatus]


class BusBookingCreate(BaseModel):
    trip_id: int
    seat_number: str
    passenger_name: str
    passenger_phone: str
    payment_method: Optional[str] = "wallet"


class BusBookingOut(BaseModel):
    id: int
    booking_ref: str
    trip_id: int
    user_id: int
    passenger_name: str
    passenger_phone: str
    seat_number: str
    fare: float
    status: str
    payment_method: str
    payment_ref: Optional[str] = None
    created_at: Optional[datetime] = None
    bus_number: Optional[str] = None
    operator_name: Optional[str] = None
    route_name: Optional[str] = None
    trip_date: Optional[str] = None
    departure_time: Optional[str] = None

    class Config:
        from_attributes = True


# --- Nearby Places ---
class NearbyPlaceCreate(BaseModel):
    name: str
    category: str
    address: str
    latitude: float
    longitude: float
    phone: Optional[str] = None
    opening_hours: Optional[str] = "24 Hours"
    description: Optional[str] = None
    rating: Optional[float] = 4.5
    is_verified: Optional[bool] = True


class NearbyPlaceOut(BaseModel):
    id: int
    name: str
    category: str
    address: str
    latitude: float
    longitude: float
    phone: Optional[str] = None
    opening_hours: Optional[str] = None
    description: Optional[str] = None
    rating: Optional[float] = None
    is_verified: bool
    distance_km: Optional[float] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Complaints & Emergency ---
class ComplaintCreate(BaseModel):
    category: str
    subject: str
    description: str
    linked_reference: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None


class ComplaintStatusUpdate(BaseModel):
    status: str
    resolution_notes: Optional[str] = None


class ComplaintOut(BaseModel):
    id: int
    complaint_ref: str
    user_id: int
    category: str
    subject: str
    description: str
    linked_reference: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    status: str
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EmergencyContactOut(BaseModel):
    service_name: str
    category: str
    number: str
    description: str
    badge: Optional[str] = None
    is_toll_free: bool = True

