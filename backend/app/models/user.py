"""SmartPark AI - User Model."""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="citizen")  # citizen, operator, admin
    is_active = Column(Boolean, default=True)
    avatar_url = Column(String(500), nullable=True)
    address = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    bookings = relationship("Booking", back_populates="user", lazy="dynamic")
    vehicles = relationship("Vehicle", back_populates="owner", lazy="dynamic")
    notifications = relationship("Notification", back_populates="user", lazy="dynamic")
    lost_reports = relationship("LostVehicleReport", back_populates="reporter", foreign_keys="LostVehicleReport.reporter_id", lazy="dynamic")
    found_reports = relationship("FoundVehicleReport", back_populates="reporter", foreign_keys="FoundVehicleReport.reporter_id", lazy="dynamic")
    payments = relationship("Payment", back_populates="user", lazy="dynamic")
    saved_locations = relationship("SavedLocation", back_populates="user", lazy="dynamic")
    route_history = relationship("RouteHistory", back_populates="user", lazy="dynamic")
    audit_logs = relationship("AuditLog", back_populates="user", lazy="dynamic")
    wallet = relationship("Wallet", back_populates="user", uselist=False)
    wallet_transactions = relationship("WalletTransaction", back_populates="user", lazy="dynamic")
    bus_bookings = relationship("BusBooking", back_populates="user", lazy="dynamic")
    complaints = relationship("Complaint", back_populates="user", foreign_keys="Complaint.user_id", lazy="dynamic")
