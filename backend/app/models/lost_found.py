"""SmartPark AI - Lost & Found Vehicle Recovery Models."""
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base


class LostVehicleReport(Base):
    __tablename__ = "lost_vehicle_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_ref = Column(String(20), unique=True, nullable=False, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    vehicle_reg_number = Column(String(50), nullable=False, index=True)
    vehicle_type = Column(String(50), nullable=False)
    make = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    color = Column(String(50), nullable=True)
    year = Column(Integer, nullable=True)
    last_known_location = Column(Text, nullable=False)
    last_known_latitude = Column(Float, nullable=True)
    last_known_longitude = Column(Float, nullable=True)
    last_seen_date = Column(DateTime, nullable=False)
    description = Column(Text, nullable=True)
    contact_phone = Column(String(20), nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_visibility = Column(String(20), default="private")  # private, authorized_only, public
    # Status: open, potential_match, under_review, resolved, closed
    status = Column(String(50), nullable=False, default="open")
    # Verification: PENDING_VERIFICATION, VERIFIED, REJECTED
    verification_status = Column(String(30), nullable=False, default="PENDING_VERIFICATION", index=True)
    verifier_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    verification_notes = Column(Text, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    reporter = relationship("User", back_populates="lost_reports", foreign_keys=[reporter_id])
    verifier = relationship("User", foreign_keys=[verifier_id])
    images = relationship("VehicleImage", back_populates="lost_report",
                          foreign_keys="VehicleImage.lost_report_id", lazy="dynamic")
    matches_as_lost = relationship("SuggestedMatch", back_populates="lost_report",
                                   foreign_keys="SuggestedMatch.lost_report_id", lazy="dynamic")
    status_history = relationship("ReportStatusHistory", back_populates="lost_report",
                                  foreign_keys="ReportStatusHistory.lost_report_id", lazy="dynamic")


class FoundVehicleReport(Base):
    __tablename__ = "found_vehicle_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_ref = Column(String(20), unique=True, nullable=False, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    vehicle_reg_number = Column(String(50), nullable=True, index=True)
    vehicle_type = Column(String(50), nullable=False)
    make = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    color = Column(String(50), nullable=True)
    found_location = Column(Text, nullable=False)
    found_latitude = Column(Float, nullable=True)
    found_longitude = Column(Float, nullable=True)
    found_date = Column(DateTime, nullable=False)
    description = Column(Text, nullable=True)
    contact_phone = Column(String(20), nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_preference = Column(String(50), default="in_app")  # in_app, email, phone
    # Status: open, potential_match, under_review, resolved, closed
    status = Column(String(50), nullable=False, default="open")
    # Verification: PENDING_VERIFICATION, VERIFIED, REJECTED
    verification_status = Column(String(30), nullable=False, default="PENDING_VERIFICATION", index=True)
    verifier_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    verification_notes = Column(Text, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    reporter = relationship("User", back_populates="found_reports", foreign_keys=[reporter_id])
    verifier = relationship("User", foreign_keys=[verifier_id])
    images = relationship("VehicleImage", back_populates="found_report",
                          foreign_keys="VehicleImage.found_report_id", lazy="dynamic")
    matches_as_found = relationship("SuggestedMatch", back_populates="found_report",
                                    foreign_keys="SuggestedMatch.found_report_id", lazy="dynamic")
    status_history = relationship("ReportStatusHistory", back_populates="found_report",
                                  foreign_keys="ReportStatusHistory.found_report_id", lazy="dynamic")


class VehicleImage(Base):
    __tablename__ = "vehicle_images"

    id = Column(Integer, primary_key=True, index=True)
    lost_report_id = Column(Integer, ForeignKey("lost_vehicle_reports.id"), nullable=True, index=True)
    found_report_id = Column(Integer, ForeignKey("found_vehicle_reports.id"), nullable=True, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    lost_report = relationship("LostVehicleReport", back_populates="images",
                               foreign_keys=[lost_report_id])
    found_report = relationship("FoundVehicleReport", back_populates="images",
                                foreign_keys=[found_report_id])


class SuggestedMatch(Base):
    __tablename__ = "suggested_matches"

    id = Column(Integer, primary_key=True, index=True)
    lost_report_id = Column(Integer, ForeignKey("lost_vehicle_reports.id"), nullable=False, index=True)
    found_report_id = Column(Integer, ForeignKey("found_vehicle_reports.id"), nullable=False, index=True)
    match_score = Column(Float, nullable=False)  # 0.0 to 1.0
    match_reasons = Column(JSON, default=[])  # List of reasons
    # Status: suggested, reviewing, confirmed, rejected
    status = Column(String(50), nullable=False, default="suggested")
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    review_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    lost_report = relationship("LostVehicleReport", back_populates="matches_as_lost",
                               foreign_keys=[lost_report_id])
    found_report = relationship("FoundVehicleReport", back_populates="matches_as_found",
                                foreign_keys=[found_report_id])


class ReportStatusHistory(Base):
    __tablename__ = "report_status_history"

    id = Column(Integer, primary_key=True, index=True)
    lost_report_id = Column(Integer, ForeignKey("lost_vehicle_reports.id"), nullable=True, index=True)
    found_report_id = Column(Integer, ForeignKey("found_vehicle_reports.id"), nullable=True, index=True)
    old_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    lost_report = relationship("LostVehicleReport", back_populates="status_history",
                               foreign_keys=[lost_report_id])
    found_report = relationship("FoundVehicleReport", back_populates="status_history",
                                foreign_keys=[found_report_id])
