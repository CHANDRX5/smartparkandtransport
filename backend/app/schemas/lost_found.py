"""SmartPark AI - Pydantic Schemas for Lost & Found."""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime


class LostReportCreate(BaseModel):
    vehicle_reg_number: str = Field(..., min_length=2, max_length=50)
    vehicle_type: str = Field(..., min_length=2)
    make: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    year: Optional[int] = None
    last_known_location: str = Field(..., min_length=5)
    last_known_latitude: Optional[float] = None
    last_known_longitude: Optional[float] = None
    last_seen_date: datetime
    description: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_visibility: str = Field(default="private", pattern="^(private|authorized_only|public)$")


class FoundReportCreate(BaseModel):
    vehicle_reg_number: Optional[str] = None
    vehicle_type: str = Field(..., min_length=2)
    make: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    found_location: str = Field(..., min_length=5)
    found_latitude: Optional[float] = None
    found_longitude: Optional[float] = None
    found_date: datetime
    description: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_preference: str = Field(default="in_app", pattern="^(in_app|email|phone)$")


class LostReportOut(BaseModel):
    id: int
    report_ref: str
    reporter_id: int
    vehicle_reg_number: str
    vehicle_type: str
    make: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    year: Optional[int] = None
    last_known_location: str
    last_known_latitude: Optional[float] = None
    last_known_longitude: Optional[float] = None
    last_seen_date: datetime
    description: Optional[str] = None
    status: str
    verification_status: Optional[str] = "PENDING_VERIFICATION"
    verifier_id: Optional[int] = None
    verified_at: Optional[datetime] = None
    verification_notes: Optional[str] = None
    created_at: Optional[datetime] = None
    # Contact info excluded by default for privacy
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None

    class Config:
        from_attributes = True


class FoundReportOut(BaseModel):
    id: int
    report_ref: str
    reporter_id: int
    vehicle_reg_number: Optional[str] = None
    vehicle_type: str
    make: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    found_location: str
    found_latitude: Optional[float] = None
    found_longitude: Optional[float] = None
    found_date: datetime
    description: Optional[str] = None
    status: str
    verification_status: Optional[str] = "PENDING_VERIFICATION"
    verifier_id: Optional[int] = None
    verified_at: Optional[datetime] = None
    verification_notes: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SuggestedMatchOut(BaseModel):
    id: int
    lost_report_id: int
    found_report_id: int
    match_score: float
    match_reasons: Optional[List[str]] = None
    status: str
    reviewed_by: Optional[int] = None
    review_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MatchReview(BaseModel):
    status: str = Field(..., pattern="^(confirmed|rejected)$")
    notes: Optional[str] = None


class ReportStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(open|potential_match|under_review|resolved|closed)$")
    notes: Optional[str] = None


class LostFoundSearch(BaseModel):
    vehicle_reg_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    status: Optional[str] = None
    page: int = 1
    page_size: int = 20
