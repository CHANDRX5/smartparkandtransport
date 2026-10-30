"""SmartPark AI - Parking API Routes."""
import math
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import Optional, List
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.models.parking import ParkingFacility, ParkingSpace, ParkingAvailability
from app.models.transport import SavedLocation
from app.schemas.parking import (
    ParkingFacilityCreate, ParkingFacilityUpdate, ParkingFacilityOut,
    ParkingAvailabilityOut, PaginatedResponse
)
from app.schemas.transport import SavedLocationCreate, SavedLocationOut

router = APIRouter(prefix="/parking", tags=["Parking"])


def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance in km between two points."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


@router.get("/facilities", response_model=PaginatedResponse)
def list_facilities(
    query: Optional[str] = None,
    city: Optional[str] = None,
    vehicle_type: Optional[str] = None,
    max_price: Optional[float] = None,
    available_only: bool = False,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius_km: float = 10.0,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Search and list parking facilities with filtering."""
    q = db.query(ParkingFacility).filter(ParkingFacility.is_active == True)

    if query:
        q = q.filter(or_(
            ParkingFacility.name.ilike(f"%{query}%"),
            ParkingFacility.address.ilike(f"%{query}%"),
            ParkingFacility.city.ilike(f"%{query}%"),
        ))
    if city:
        q = q.filter(ParkingFacility.city.ilike(f"%{city}%"))
    if max_price is not None:
        q = q.filter(ParkingFacility.price_per_hour <= max_price)
    if available_only:
        q = q.filter(ParkingFacility.available_spaces > 0)

    total = q.count()
    facilities = q.offset((page - 1) * page_size).limit(page_size).all()

    results = []
    for f in facilities:
        out = ParkingFacilityOut.model_validate(f)
        if latitude is not None and longitude is not None:
            dist = haversine_distance(latitude, longitude, f.latitude, f.longitude)
            if dist > radius_km:
                continue
        results.append(out.model_dump())

    # Filter by vehicle type in JSON field
    if vehicle_type:
        results = [r for r in results if vehicle_type in (r.get("vehicle_types") or [])]

    return PaginatedResponse(
        items=results,
        total=len(results),
        page=page,
        page_size=page_size,
        total_pages=max(1, math.ceil(len(results) / page_size)),
    )


@router.get("/facilities/{facility_id}", response_model=ParkingFacilityOut)
def get_facility(facility_id: int, db: Session = Depends(get_db)):
    """Get parking facility details."""
    facility = db.query(ParkingFacility).filter(ParkingFacility.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    return ParkingFacilityOut.model_validate(facility)


@router.post("/facilities", response_model=ParkingFacilityOut, status_code=201)
def create_facility(
    data: ParkingFacilityCreate,
    current_user: User = Depends(require_role("admin", "operator")),
    db: Session = Depends(get_db),
):
    """Create a new parking facility (admin/operator only)."""
    fac_dict = data.model_dump()
    if not fac_dict.get("available_spaces"):
        fac_dict["available_spaces"] = data.total_capacity
    fac_dict["operator_id"] = current_user.id
    facility = ParkingFacility(**fac_dict)
    db.add(facility)
    db.commit()
    db.refresh(facility)
    return ParkingFacilityOut.model_validate(facility)


@router.put("/facilities/{facility_id}", response_model=ParkingFacilityOut)
def update_facility(
    facility_id: int,
    data: ParkingFacilityUpdate,
    current_user: User = Depends(require_role("admin", "operator")),
    db: Session = Depends(get_db),
):
    """Update parking facility (admin/operator only)."""
    facility = db.query(ParkingFacility).filter(ParkingFacility.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    if current_user.role == "operator" and facility.operator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this facility")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(facility, key, value)

    db.commit()
    db.refresh(facility)
    return ParkingFacilityOut.model_validate(facility)


@router.delete("/facilities/{facility_id}")
def delete_facility(
    facility_id: int,
    current_user: User = Depends(require_role("admin", "operator")),
    db: Session = Depends(get_db),
):
    """
    Safely delete/archive a facility.
    Strictly prevents deletion if active bookings exist.
    """
    from app.models.booking import Booking

    facility = db.query(ParkingFacility).filter(ParkingFacility.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    if current_user.role == "operator" and facility.operator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this facility")

    # Check for active bookings
    active_count = db.query(Booking).filter(
        Booking.facility_id == facility_id,
        Booking.status.in_(["confirmed", "checked_in"]),
    ).count()
    if active_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete facility '{facility.name}' because it has {active_count} active booking(s). Please complete or cancel them safely first."
        )

    # Soft delete / deactivate facility
    facility.is_active = False
    db.commit()
    return {"message": f"Facility '{facility.name}' has been safely archived."}


@router.get("/facilities/{facility_id}/availability", response_model=List[ParkingAvailabilityOut])
def get_availability_history(
    facility_id: int,
    limit: int = Query(48, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Get availability history for a facility."""
    records = (
        db.query(ParkingAvailability)
        .filter(ParkingAvailability.facility_id == facility_id)
        .order_by(ParkingAvailability.timestamp.desc())
        .limit(limit)
        .all()
    )
    return [ParkingAvailabilityOut.model_validate(r) for r in records]


# --- Saved Locations ---
@router.get("/saved-locations", response_model=List[SavedLocationOut])
def get_saved_locations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get user's saved/favorite locations."""
    locations = db.query(SavedLocation).filter(
        SavedLocation.user_id == current_user.id
    ).all()
    return [SavedLocationOut.model_validate(loc) for loc in locations]


@router.post("/saved-locations", response_model=SavedLocationOut, status_code=201)
def save_location(
    data: SavedLocationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save a favorite location."""
    loc = SavedLocation(user_id=current_user.id, **data.model_dump())
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return SavedLocationOut.model_validate(loc)


@router.delete("/saved-locations/{location_id}")
def delete_saved_location(
    location_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a saved location."""
    loc = db.query(SavedLocation).filter(
        SavedLocation.id == location_id,
        SavedLocation.user_id == current_user.id
    ).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Saved location not found")
    db.delete(loc)
    db.commit()
    return {"message": "Location removed"}


# ─── Owner / Operator routes ──────────────────────────────────────────────────

@router.get("/my-facilities", response_model=List[ParkingFacilityOut])
def get_my_facilities(
    current_user: User = Depends(require_role("admin", "operator")),
    db: Session = Depends(get_db),
):
    """Return all facilities belonging to the current operator/admin."""
    q = db.query(ParkingFacility)
    if current_user.role != "admin":
        q = q.filter(ParkingFacility.operator_id == current_user.id)
    facilities = q.filter(ParkingFacility.is_active == True).all()
    return [ParkingFacilityOut.model_validate(f) for f in facilities]


@router.get("/facilities/{facility_id}/spaces", response_model=List[dict])
def list_spaces(
    facility_id: int,
    db: Session = Depends(get_db),
):
    """List all parking spaces for a facility."""
    facility = db.query(ParkingFacility).filter(ParkingFacility.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    spaces = db.query(ParkingSpace).filter(ParkingSpace.facility_id == facility_id).all()
    result = []
    for s in spaces:
        result.append({
            "id": s.id,
            "facility_id": s.facility_id,
            "space_number": s.space_number,
            "vehicle_type": s.vehicle_type,
            "floor_level": s.floor_level,
            "is_covered": s.is_covered,
            "is_ev_charging": s.is_ev_charging,
            "is_handicap": s.is_handicap,
            "is_occupied": s.is_occupied,
            "is_active": s.is_active,
            "slot_status": s.slot_status or ("occupied" if s.is_occupied else "available"),
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
            "updated_by": s.updated_by,
            "status_note": s.status_note,
        })
    return result


@router.post("/facilities/{facility_id}/spaces", response_model=dict, status_code=201)
def create_space(
    facility_id: int,
    data: dict,
    current_user: User = Depends(require_role("admin", "operator")),
    db: Session = Depends(get_db),
):
    """Create a new parking space/slot."""
    facility = db.query(ParkingFacility).filter(ParkingFacility.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    if current_user.role == "operator" and facility.operator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to manage this facility")

    space = ParkingSpace(
        facility_id=facility_id,
        space_number=data.get("space_number", f"S{facility_id:03d}"),
        vehicle_type=data.get("vehicle_type", "car"),
        floor_level=data.get("floor_level", "G"),
        is_covered=data.get("is_covered", False),
        is_ev_charging=data.get("is_ev_charging", False),
        is_handicap=data.get("is_handicap", False),
        is_occupied=False,
        slot_status="available",
        is_active=True,
        updated_by=current_user.id,
        updated_at=datetime.now(timezone.utc),
    )
    db.add(space)

    # Also update facility total_capacity
    facility.total_capacity = facility.total_capacity + 1
    facility.available_spaces = facility.available_spaces + 1
    db.commit()
    db.refresh(space)
    return {
        "id": space.id,
        "space_number": space.space_number,
        "vehicle_type": space.vehicle_type,
        "is_occupied": space.is_occupied,
        "slot_status": "available",
        "message": "Space created successfully",
    }


@router.patch("/facilities/{facility_id}/spaces/{space_id}/status", response_model=dict)
def update_space_status(
    facility_id: int,
    space_id: int,
    data: dict,
    current_user: User = Depends(require_role("admin", "operator")),
    db: Session = Depends(get_db),
):
    """Update parking space status (available/occupied/reserved/out_of_service)."""
    facility = db.query(ParkingFacility).filter(ParkingFacility.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    if current_user.role == "operator" and facility.operator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to manage this facility")

    space = db.query(ParkingSpace).filter(
        ParkingSpace.id == space_id,
        ParkingSpace.facility_id == facility_id,
    ).first()
    if not space:
        raise HTTPException(status_code=404, detail="Parking space not found")

    new_status = data.get("slot_status", "available")
    status_note = data.get("status_note")
    was_occupied = space.is_occupied

    # Map slot_status → is_occupied
    space.is_occupied = new_status in ("occupied", "reserved")
    space.slot_status = new_status
    space.updated_at = datetime.now(timezone.utc)
    space.updated_by = current_user.id
    if status_note:
        space.status_note = status_note

    # Adjust facility available_spaces counter
    if was_occupied and not space.is_occupied:
        facility.available_spaces = min(facility.total_capacity, facility.available_spaces + 1)
    elif not was_occupied and space.is_occupied:
        facility.available_spaces = max(0, facility.available_spaces - 1)

    # Record AuditLog
    from app.models.transport import AuditLog
    audit = AuditLog(
        user_id=current_user.id,
        action="UPDATE_SLOT_STATUS",
        resource_type="parking_space",
        resource_id=space.id,
        details={"note": status_note, "new_status": new_status, "facility": facility.name},
    )
    db.add(audit)

    db.commit()
    db.refresh(space)
    return {
        "id": space.id,
        "slot_status": new_status,
        "is_occupied": space.is_occupied,
        "facility_available_spaces": facility.available_spaces,
        "updated_at": space.updated_at.isoformat() if space.updated_at else None,
        "updated_by": space.updated_by,
        "message": f"Space {space.space_number} marked as {new_status}",
    }


@router.get("/facilities/{facility_id}/revenue")
def get_facility_revenue(
    facility_id: int,
    current_user: User = Depends(require_role("admin", "operator")),
    db: Session = Depends(get_db),
):
    """Return revenue summary for a facility from confirmed/completed bookings."""
    from app.models.booking import Booking
    from sqlalchemy import func as sqlfunc

    facility = db.query(ParkingFacility).filter(ParkingFacility.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    if current_user.role == "operator" and facility.operator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this facility")

    total_revenue = db.query(sqlfunc.sum(Booking.total_amount)).filter(
        Booking.facility_id == facility_id,
        Booking.status.in_(["confirmed", "checked_in", "completed"]),
    ).scalar() or 0.0

    total_bookings = db.query(sqlfunc.count(Booking.id)).filter(
        Booking.facility_id == facility_id,
    ).scalar() or 0

    active_bookings = db.query(sqlfunc.count(Booking.id)).filter(
        Booking.facility_id == facility_id,
        Booking.status.in_(["confirmed", "checked_in"]),
    ).scalar() or 0

    return {
        "facility_id": facility_id,
        "facility_name": facility.name,
        "total_revenue": round(float(total_revenue), 2),
        "total_bookings": total_bookings,
        "active_bookings": active_bookings,
        "total_capacity": facility.total_capacity,
        "available_spaces": facility.available_spaces,
        "occupancy_pct": round(
            (1 - facility.available_spaces / max(facility.total_capacity, 1)) * 100, 1
        ),
    }

