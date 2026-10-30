"""SmartPark AI - Booking API Routes."""
import uuid
import math
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.models.parking import ParkingFacility
from app.models.booking import Booking, Vehicle
from app.models.transport import Notification
from app.schemas.booking import (
    BookingCreate, BookingOut, BookingCancel, BookingCheckIn,
    VehicleCreate, VehicleOut
)
from app.schemas.parking import PaginatedResponse

router = APIRouter(prefix="/bookings", tags=["Bookings"])


def generate_booking_ref() -> str:
    return f"SP-{uuid.uuid4().hex[:8].upper()}"


@router.post("/", response_model=BookingOut, status_code=201)
def create_booking(
    data: BookingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new parking booking with availability validation."""
    # Validate facility
    facility = db.query(ParkingFacility).filter(
        ParkingFacility.id == data.facility_id,
        ParkingFacility.is_active == True
    ).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Parking facility not found")

    # Validate times
    if data.start_time >= data.end_time:
        raise HTTPException(status_code=400, detail="End time must be after start time")
    if data.start_time < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Cannot book in the past")

    # Check overlapping active bookings for capacity
    overlapping = db.query(Booking).filter(
        Booking.facility_id == data.facility_id,
        Booking.status.in_(["pending", "confirmed", "checked_in"]),
        Booking.start_time < data.end_time,
        Booking.end_time > data.start_time,
    ).count()

    if overlapping >= facility.total_capacity:
        raise HTTPException(
            status_code=409,
            detail="No available spaces for the selected time slot"
        )

    # Calculate price
    total_amount = round(data.duration_hours * facility.price_per_hour, 2)

    booking = Booking(
        booking_ref=generate_booking_ref(),
        user_id=current_user.id,
        facility_id=data.facility_id,
        vehicle_reg_number=data.vehicle_reg_number,
        vehicle_type=data.vehicle_type,
        booking_date=data.booking_date,
        start_time=data.start_time,
        end_time=data.end_time,
        duration_hours=data.duration_hours,
        price_per_hour=facility.price_per_hour,
        total_amount=total_amount,
        status="confirmed",
    )
    db.add(booking)

    # Create notification
    notification = Notification(
        user_id=current_user.id,
        title="Booking Confirmed",
        message=f"Your booking {booking.booking_ref} at {facility.name} has been confirmed. Total: ₹{total_amount}",
        notification_type="booking",
        reference_type="booking",
    )
    db.add(notification)

    db.commit()
    db.refresh(booking)

    # Update notification reference
    notification.reference_id = booking.id
    db.commit()

    result = BookingOut.model_validate(booking)
    result.facility_name = facility.name
    return result


@router.get("/", response_model=PaginatedResponse)
def list_bookings(
    status: str = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List user's bookings."""
    q = db.query(Booking).filter(Booking.user_id == current_user.id)
    if status:
        q = q.filter(Booking.status == status)
    q = q.order_by(Booking.created_at.desc())

    total = q.count()
    bookings = q.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for b in bookings:
        out = BookingOut.model_validate(b)
        facility = db.query(ParkingFacility).filter(ParkingFacility.id == b.facility_id).first()
        if facility:
            out.facility_name = facility.name
        items.append(out.model_dump())

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, math.ceil(total / page_size)),
    )


@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get booking details."""
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.user_id == current_user.id,
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    result = BookingOut.model_validate(booking)
    facility = db.query(ParkingFacility).filter(ParkingFacility.id == booking.facility_id).first()
    if facility:
        result.facility_name = facility.name
    return result


@router.post("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(
    booking_id: int,
    data: BookingCancel,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel a booking."""
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.user_id == current_user.id,
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status in ("cancelled", "completed"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel a {booking.status} booking")

    booking.status = "cancelled"
    booking.cancellation_reason = data.reason
    booking.cancelled_at = datetime.now(timezone.utc)

    # Notification
    db.add(Notification(
        user_id=current_user.id,
        title="Booking Cancelled",
        message=f"Your booking {booking.booking_ref} has been cancelled.",
        notification_type="booking",
        reference_type="booking",
        reference_id=booking.id,
    ))

    db.commit()
    db.refresh(booking)
    return BookingOut.model_validate(booking)


@router.post("/{booking_id}/checkin", response_model=BookingOut)
def check_in(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check in to a confirmed booking."""
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.user_id == current_user.id,
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status != "confirmed":
        raise HTTPException(status_code=400, detail="Only confirmed bookings can be checked in")

    booking.status = "checked_in"
    booking.checked_in_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(booking)
    return BookingOut.model_validate(booking)


@router.post("/{booking_id}/checkout", response_model=BookingOut)
def check_out(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check out from a booking."""
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.user_id == current_user.id,
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status != "checked_in":
        raise HTTPException(status_code=400, detail="Only checked-in bookings can be checked out")

    booking.status = "completed"
    booking.checked_out_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(booking)
    return BookingOut.model_validate(booking)


# --- Vehicles ---
@router.get("/vehicles/my", response_model=list[VehicleOut])
def list_vehicles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List user's registered vehicles."""
    vehicles = db.query(Vehicle).filter(
        Vehicle.owner_id == current_user.id,
        Vehicle.is_active == True
    ).all()
    return [VehicleOut.model_validate(v) for v in vehicles]


@router.post("/vehicles", response_model=VehicleOut, status_code=201)
def register_vehicle(
    data: VehicleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Register a new vehicle."""
    vehicle = Vehicle(owner_id=current_user.id, **data.model_dump())
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return VehicleOut.model_validate(vehicle)


# ─── Facility-specific bookings (owner/admin) ─────────────────────────────────
@router.get("/facility/{facility_id}", response_model=PaginatedResponse)
def list_facility_bookings(
    facility_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List bookings for a specific facility (owner/admin only)."""
    # Authorization: admin sees all, operator only their facility
    if current_user.role not in ("admin", "operator"):
        raise HTTPException(status_code=403, detail="Only facility operators or admins can view facility bookings")

    facility = db.query(ParkingFacility).filter(ParkingFacility.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")

    if current_user.role == "operator" and facility.operator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this facility's bookings")

    q = db.query(Booking).filter(Booking.facility_id == facility_id).order_by(Booking.created_at.desc())
    total = q.count()
    bookings = q.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for b in bookings:
        out = BookingOut.model_validate(b)
        out.facility_name = facility.name
        items.append(out.model_dump())

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, math.ceil(total / page_size)),
    )

