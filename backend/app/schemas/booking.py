"""SmartPark AI - Pydantic Schemas for Bookings."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class BookingCreate(BaseModel):
    facility_id: int
    vehicle_type: str = Field(default="car", pattern="^(car|motorcycle|bicycle|truck)$")
    vehicle_reg_number: str = Field(..., min_length=2, max_length=50)
    booking_date: datetime
    start_time: datetime
    end_time: datetime
    duration_hours: float = Field(..., gt=0, le=72)


class BookingOut(BaseModel):
    id: int
    booking_ref: str
    user_id: int
    facility_id: int
    vehicle_id: Optional[int] = None
    vehicle_reg_number: str
    vehicle_type: str
    booking_date: datetime
    start_time: datetime
    end_time: datetime
    duration_hours: float
    price_per_hour: float
    total_amount: float
    status: str
    cancellation_reason: Optional[str] = None
    cancelled_at: Optional[datetime] = None
    checked_in_at: Optional[datetime] = None
    checked_out_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    facility_name: Optional[str] = None

    class Config:
        from_attributes = True


class BookingCancel(BaseModel):
    reason: Optional[str] = None


class BookingCheckIn(BaseModel):
    booking_ref: str


class VehicleCreate(BaseModel):
    registration_number: str = Field(..., min_length=2, max_length=50)
    vehicle_type: str = Field(default="car")
    make: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    year: Optional[int] = None


class VehicleOut(BaseModel):
    id: int
    registration_number: str
    vehicle_type: str
    make: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    year: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
