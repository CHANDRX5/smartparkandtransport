"""SmartPark AI - Pydantic Schemas for Parking."""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ParkingFacilityCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    address: str = Field(..., min_length=5)
    city: str = Field(..., min_length=2, max_length=100)
    state: Optional[str] = None
    zip_code: Optional[str] = None
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    total_capacity: int = Field(..., ge=1)
    available_spaces: Optional[int] = None
    price_per_hour: float = Field(..., ge=0)
    price_per_day: Optional[float] = None
    vehicle_types: List[str] = ["car", "motorcycle", "bicycle"]
    amenities: List[str] = []
    operating_hours: dict = {"open": "00:00", "close": "23:59"}
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None


class ParkingFacilityUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    total_capacity: Optional[int] = None
    available_spaces: Optional[int] = None
    price_per_hour: Optional[float] = None
    price_per_day: Optional[float] = None
    vehicle_types: Optional[List[str]] = None
    amenities: Optional[List[str]] = None
    operating_hours: Optional[dict] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None


class ParkingFacilityOut(BaseModel):
    id: int
    name: str
    address: str
    city: str
    state: Optional[str] = None
    zip_code: Optional[str] = None
    latitude: float
    longitude: float
    total_capacity: int
    available_spaces: int
    price_per_hour: float
    price_per_day: Optional[float] = None
    vehicle_types: Optional[List[str]] = None
    amenities: Optional[List[str]] = None
    operating_hours: Optional[dict] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    rating: float
    is_active: bool
    is_demo_data: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ParkingSearchQuery(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_km: float = 5.0
    query: Optional[str] = None
    vehicle_type: Optional[str] = None
    max_price: Optional[float] = None
    amenities: Optional[List[str]] = None
    available_only: bool = False
    page: int = 1
    page_size: int = 20


class ParkingAvailabilityOut(BaseModel):
    id: int
    facility_id: int
    timestamp: datetime
    total_spaces: int
    occupied_spaces: int
    available_spaces: int
    occupancy_rate: float
    day_of_week: int
    hour_of_day: int
    is_demo_data: bool

    class Config:
        from_attributes = True


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    total_pages: int
