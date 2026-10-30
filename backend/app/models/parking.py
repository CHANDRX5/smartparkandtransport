"""SmartPark AI - Parking Models."""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base


class ParkingFacility(Base):
    __tablename__ = "parking_facilities"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False, index=True)
    state = Column(String(100), nullable=True)
    zip_code = Column(String(20), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    total_capacity = Column(Integer, nullable=False, default=0)
    available_spaces = Column(Integer, nullable=False, default=0)
    price_per_hour = Column(Float, nullable=False, default=0.0)
    price_per_day = Column(Float, nullable=True)
    vehicle_types = Column(JSON, default=["car", "motorcycle", "bicycle"])  # Supported types
    amenities = Column(JSON, default=[])  # e.g. ["cctv", "ev_charging", "covered", "24x7"]
    operating_hours = Column(JSON, default={"open": "00:00", "close": "23:59"})
    contact_phone = Column(String(20), nullable=True)
    contact_email = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    rating = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    is_demo_data = Column(Boolean, default=False)  # Flag for seed/demo data
    operator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    spaces = relationship("ParkingSpace", back_populates="facility", lazy="dynamic")
    bookings = relationship("Booking", back_populates="facility", lazy="dynamic")
    availability_history = relationship("ParkingAvailability", back_populates="facility", lazy="dynamic")
    predictions = relationship("AIPrediction", back_populates="facility", lazy="dynamic")


class ParkingSpace(Base):
    __tablename__ = "parking_spaces"
    
    id = Column(Integer, primary_key=True, index=True)
    facility_id = Column(Integer, ForeignKey("parking_facilities.id"), nullable=False, index=True)
    space_number = Column(String(20), nullable=False)
    vehicle_type = Column(String(50), nullable=False, default="car")  # car, motorcycle, bicycle, truck
    floor_level = Column(String(20), nullable=True)
    is_covered = Column(Boolean, default=False)
    is_ev_charging = Column(Boolean, default=False)
    is_handicap = Column(Boolean, default=False)
    is_occupied = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    slot_status = Column(String(30), default="available")  # available, occupied, reserved, out_of_service
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    status_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    facility = relationship("ParkingFacility", back_populates="spaces")


class ImageAnalysis(Base):
    __tablename__ = "image_analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    facility_id = Column(Integer, ForeignKey("parking_facilities.id"), nullable=True, index=True)
    image_name = Column(String(255), nullable=False)
    image_path = Column(String(500), nullable=False)
    total_detected = Column(Integer, default=0)
    occupied_count = Column(Integer, default=0)
    vacant_count = Column(Integer, default=0)
    unknown_count = Column(Integer, default=0)
    confidence_score = Column(Float, default=0.0)
    detected_spaces = Column(JSON, default=[])
    status = Column(String(50), default="completed")  # completed, reviewed, applied
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    review_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class ParkingAvailability(Base):
    __tablename__ = "parking_availability"
    
    id = Column(Integer, primary_key=True, index=True)
    facility_id = Column(Integer, ForeignKey("parking_facilities.id"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    total_spaces = Column(Integer, nullable=False)
    occupied_spaces = Column(Integer, nullable=False)
    available_spaces = Column(Integer, nullable=False)
    occupancy_rate = Column(Float, nullable=False)  # 0.0 to 1.0
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    hour_of_day = Column(Integer, nullable=False)  # 0-23
    is_holiday = Column(Boolean, default=False)
    is_demo_data = Column(Boolean, default=False)
    
    # Relationships
    facility = relationship("ParkingFacility", back_populates="availability_history")
