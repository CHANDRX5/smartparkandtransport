"""SmartPark AI - Transport, Route, Location, Notification, AI, Audit Models."""
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base


class TransportRoute(Base):
    __tablename__ = "transport_routes"

    id = Column(Integer, primary_key=True, index=True)
    route_number = Column(String(50), nullable=False, index=True)
    route_name = Column(String(255), nullable=False)
    route_type = Column(String(50), default="bus")  # bus, metro, train
    origin = Column(String(255), nullable=False)
    destination = Column(String(255), nullable=False)
    frequency_minutes = Column(Integer, nullable=True)
    operating_hours = Column(JSON, default={"start": "06:00", "end": "22:00"})
    is_active = Column(Boolean, default=True)
    is_demo_data = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    stops = relationship("TransportStop", back_populates="route", lazy="dynamic")
    observations = relationship("TransportObservation", back_populates="route", lazy="dynamic")


class TransportStop(Base):
    __tablename__ = "transport_stops"

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("transport_routes.id"), nullable=False, index=True)
    stop_name = Column(String(255), nullable=False)
    stop_order = Column(Integer, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    scheduled_arrival = Column(String(10), nullable=True)  # HH:MM format
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    route = relationship("TransportRoute", back_populates="stops")


class TransportObservation(Base):
    __tablename__ = "transport_observations"

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("transport_routes.id"), nullable=False, index=True)
    stop_id = Column(Integer, ForeignKey("transport_stops.id"), nullable=True)
    timestamp = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    day_of_week = Column(Integer, nullable=False)
    hour_of_day = Column(Integer, nullable=False)
    crowd_level = Column(String(20), nullable=False)  # low, moderate, high, very_high
    crowd_percentage = Column(Float, nullable=True)
    reported_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_demo_data = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    route = relationship("TransportRoute", back_populates="observations")


class SavedLocation(Base):
    __tablename__ = "saved_locations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    location_type = Column(String(50), default="parking")  # parking, general
    facility_id = Column(Integer, ForeignKey("parking_facilities.id"), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    address = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="saved_locations")


class RouteHistory(Base):
    __tablename__ = "route_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    origin_name = Column(String(255), nullable=False)
    origin_lat = Column(Float, nullable=False)
    origin_lng = Column(Float, nullable=False)
    destination_name = Column(String(255), nullable=False)
    destination_lat = Column(Float, nullable=False)
    destination_lng = Column(Float, nullable=False)
    distance_km = Column(Float, nullable=True)
    duration_minutes = Column(Float, nullable=True)
    route_type = Column(String(50), default="shortest")  # shortest, toll_free, weather_aware
    route_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="route_history")


class AIPrediction(Base):
    __tablename__ = "ai_predictions"

    id = Column(Integer, primary_key=True, index=True)
    prediction_type = Column(String(50), nullable=False, index=True)  # parking, transport
    facility_id = Column(Integer, ForeignKey("parking_facilities.id"), nullable=True, index=True)
    route_id = Column(Integer, ForeignKey("transport_routes.id"), nullable=True)
    target_datetime = Column(DateTime, nullable=False)
    day_of_week = Column(Integer, nullable=False)
    hour_of_day = Column(Integer, nullable=False)
    predicted_occupancy = Column(Float, nullable=True)
    predicted_available = Column(Integer, nullable=True)
    predicted_crowd_level = Column(String(20), nullable=True)
    confidence = Column(Float, nullable=True)
    model_version = Column(String(50), nullable=True)
    is_demo_prediction = Column(Boolean, default=False)
    actual_value = Column(Float, nullable=True)  # For evaluation
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    facility = relationship("ParkingFacility", back_populates="predictions")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), nullable=False)
    # booking, payment, parking, lost_found, system
    reference_type = Column(String(50), nullable=True)
    reference_id = Column(Integer, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="notifications")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(Integer, nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="audit_logs")


# ─── BUS SERVICES & SEAT BOOKING MODELS ─────────────────────────────────────────

class BusService(Base):
    __tablename__ = "bus_services"

    id = Column(Integer, primary_key=True, index=True)
    operator_name = Column(String(100), nullable=False)  # e.g. KSRTC, BMTC Express, Airavat
    bus_number = Column(String(50), nullable=False, index=True)
    service_type = Column(String(50), default="AC Executive")  # AC Executive, Sleeper, Express
    route_name = Column(String(255), nullable=False)
    departure_point = Column(String(255), nullable=False)
    destination_point = Column(String(255), nullable=False)
    intermediate_stops = Column(JSON, default=[])
    departure_time = Column(String(10), nullable=False)  # HH:MM
    arrival_time = Column(String(10), nullable=False)  # HH:MM
    fare = Column(Float, nullable=False)
    total_seats = Column(Integer, nullable=False, default=28)
    seat_layout = Column(JSON, default={"rows": 7, "cols": 4, "type": "2x2"})
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    trips = relationship("BusTrip", back_populates="service", lazy="dynamic")


class BusTrip(Base):
    __tablename__ = "bus_trips"

    id = Column(Integer, primary_key=True, index=True)
    bus_service_id = Column(Integer, ForeignKey("bus_services.id"), nullable=False, index=True)
    trip_date = Column(String(20), nullable=False, index=True)  # YYYY-MM-DD
    status = Column(String(30), default="scheduled")  # scheduled, in_transit, completed, cancelled
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    service = relationship("BusService", back_populates="trips")
    bookings = relationship("BusBooking", back_populates="trip", lazy="dynamic")


class BusBooking(Base):
    __tablename__ = "bus_bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_ref = Column(String(30), unique=True, nullable=False, index=True)
    trip_id = Column(Integer, ForeignKey("bus_trips.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    passenger_name = Column(String(100), nullable=False)
    passenger_phone = Column(String(20), nullable=False)
    seat_number = Column(String(10), nullable=False)  # e.g. "1A", "2B"
    fare = Column(Float, nullable=False)
    # Status: confirmed, cancelled, held
    status = Column(String(30), nullable=False, default="confirmed", index=True)
    payment_method = Column(String(50), default="wallet")
    payment_ref = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Concurrency Protection: Trip + Seat unique constraint prevents double-booking
    __table_args__ = (
        UniqueConstraint('trip_id', 'seat_number', name='uq_trip_seat'),
    )

    trip = relationship("BusTrip", back_populates="bookings")
    user = relationship("User", back_populates="bus_bookings")


# ─── NEARBY TRAVEL SERVICES (HOSPITALS, HOTELS, MECHANICS, RESTAURANTS) ─────────

class NearbyPlace(Base):
    __tablename__ = "nearby_places"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    category = Column(String(50), nullable=False, index=True)  # hospital, hotel, restaurant, park, mechanic, other
    address = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    phone = Column(String(50), nullable=True)
    opening_hours = Column(String(100), default="24 Hours")
    description = Column(Text, nullable=True)
    rating = Column(Float, default=4.5)
    is_verified = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))


# ─── COMPLAINTS & EMERGENCY ISSUE REPORTING ─────────────────────────────────────

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    complaint_ref = Column(String(30), unique=True, nullable=False, index=True)  # e.g. CMP-2026-001
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    category = Column(String(50), nullable=False)  # parking_availability, payment_wallet, bus_seat, lost_found, etc.
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    linked_reference = Column(String(100), nullable=True)  # related booking or transaction ID
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    # Status: OPEN, IN_REVIEW, RESOLVED, CLOSED
    status = Column(String(30), nullable=False, default="OPEN", index=True)
    resolution_notes = Column(Text, nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="complaints", foreign_keys=[user_id])
    resolver = relationship("User", foreign_keys=[resolved_by])
