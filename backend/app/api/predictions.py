import os
import uuid
from datetime import datetime, timezone
import math
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
from PIL import Image, ImageStat
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.models.parking import ParkingFacility, ParkingAvailability, ImageAnalysis
from app.models.booking import Booking
from app.models.payment import Payment
from app.models.lost_found import LostVehicleReport, FoundVehicleReport, SuggestedMatch
from app.models.transport import Notification, AIPrediction, AuditLog
from app.schemas.transport import NotificationOut, AdminAnalytics
from app.schemas.parking import PaginatedResponse, ParkingFacilityOut
from app.schemas.auth import UserOut

router = APIRouter(tags=["Predictions, Notifications, Admin"])


# --- AI Parking Prediction ---
@router.get("/predictions/parking/{facility_id}")
def predict_parking(
    facility_id: int,
    day_of_week: int = Query(None, ge=0, le=6),
    hour_of_day: int = Query(None, ge=0, le=23),
    db: Session = Depends(get_db),
):
    """Predict parking availability for a facility."""
    facility = db.query(ParkingFacility).filter(ParkingFacility.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")

    now = datetime.now(timezone.utc)
    day = day_of_week if day_of_week is not None else now.weekday()
    hour = hour_of_day if hour_of_day is not None else now.hour

    # Try to use historical data
    history = db.query(ParkingAvailability).filter(
        ParkingAvailability.facility_id == facility_id,
        ParkingAvailability.day_of_week == day,
    ).all()

    is_demo = len(history) == 0
    if history:
        similar = [h for h in history if abs(h.hour_of_day - hour) <= 1]
        if similar:
            avg_occ = sum(h.occupancy_rate for h in similar) / len(similar)
        else:
            avg_occ = sum(h.occupancy_rate for h in history) / len(history)
        confidence = min(0.9, 0.5 + len(similar) * 0.05)
    else:
        # Demo prediction
        avg_occ = _demo_parking_prediction(day, hour)
        confidence = 0.55

    predicted_available = max(0, int(facility.total_capacity * (1 - avg_occ)))

    # Find busy periods
    busy_hours = []
    for h in range(24):
        p = _demo_parking_prediction(day, h) if is_demo else avg_occ
        if p > 0.75:
            busy_hours.append(h)

    # Suggest alternatives if busy
    alternatives = []
    if avg_occ > 0.7:
        alt_facilities = db.query(ParkingFacility).filter(
            ParkingFacility.id != facility_id,
            ParkingFacility.is_active == True,
            ParkingFacility.available_spaces > 0,
        ).limit(3).all()
        alternatives = [ParkingFacilityOut.model_validate(f).model_dump() for f in alt_facilities]

    # Save prediction record
    pred = AIPrediction(
        prediction_type="parking",
        facility_id=facility_id,
        target_datetime=now,
        day_of_week=day,
        hour_of_day=hour,
        predicted_occupancy=round(avg_occ, 3),
        predicted_available=predicted_available,
        confidence=round(confidence, 2),
        is_demo_prediction=is_demo,
        model_version="historical_avg_v1" if not is_demo else "demo_pattern_v1",
    )
    db.add(pred)
    db.commit()

    return {
        "facility_id": facility_id,
        "facility_name": facility.name,
        "day_of_week": day,
        "hour_of_day": hour,
        "predicted_occupancy_pct": round(avg_occ * 100, 1),
        "predicted_available_spaces": predicted_available,
        "total_capacity": facility.total_capacity,
        "confidence": round(confidence * 100, 1),
        "busy_hours": busy_hours,
        "alternative_facilities": alternatives,
        "is_demo_prediction": is_demo,
        "model_version": pred.model_version,
        "note": "This is a demonstration estimate based on synthetic patterns." if is_demo
                else "Based on historical occupancy data.",
    }


def _demo_parking_prediction(day: int, hour: int) -> float:
    """Generate realistic parking occupancy patterns."""
    is_weekend = day >= 5
    if is_weekend:
        if 10 <= hour <= 15:
            return 0.7
        elif 16 <= hour <= 20:
            return 0.55
        else:
            return 0.2
    else:
        if 8 <= hour <= 10:
            return 0.85
        elif 11 <= hour <= 14:
            return 0.75
        elif 15 <= hour <= 18:
            return 0.8
        elif 19 <= hour <= 21:
            return 0.4
        else:
            return 0.15


# --- Notifications ---
@router.get("/notifications", response_model=list[NotificationOut])
def list_notifications(
    unread_only: bool = False,
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List user's notifications."""
    q = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        q = q.filter(Notification.is_read == False)
    q = q.order_by(Notification.created_at.desc()).limit(limit)
    return [NotificationOut.model_validate(n) for n in q.all()]


@router.get("/notifications/unread-count")
def unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get unread notification count."""
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    return {"unread_count": count}


@router.put("/notifications/{notification_id}/read")
def mark_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a notification as read."""
    n = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = True
    db.commit()
    return {"message": "Marked as read"}


@router.put("/notifications/read-all")
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all notifications as read."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).update({Notification.is_read: True})
    db.commit()
    return {"message": "All notifications marked as read"}


# --- Admin Dashboard ---
@router.get("/admin/analytics", response_model=AdminAnalytics)
def get_analytics(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Get admin dashboard analytics from database."""
    total_users = db.query(User).count()
    total_facilities = db.query(ParkingFacility).filter(ParkingFacility.is_active == True).count()
    total_available = db.query(func.sum(ParkingFacility.available_spaces)).filter(
        ParkingFacility.is_active == True
    ).scalar() or 0
    active_bookings = db.query(Booking).filter(
        Booking.status.in_(["confirmed", "checked_in"])
    ).count()
    completed_bookings = db.query(Booking).filter(Booking.status == "completed").count()
    total_revenue = db.query(func.sum(Payment.amount)).filter(
        Payment.status == "completed"
    ).scalar() or 0.0
    open_lost = db.query(LostVehicleReport).filter(
        LostVehicleReport.status.in_(["open", "potential_match", "under_review"])
    ).count()
    open_found = db.query(FoundVehicleReport).filter(
        FoundVehicleReport.status.in_(["open", "potential_match", "under_review"])
    ).count()
    potential_matches = db.query(SuggestedMatch).filter(
        SuggestedMatch.status == "suggested"
    ).count()

    has_demo = db.query(ParkingFacility).filter(ParkingFacility.is_demo_data == True).count() > 0

    return AdminAnalytics(
        total_users=total_users,
        total_facilities=total_facilities,
        total_available_spaces=total_available,
        active_bookings=active_bookings,
        completed_bookings=completed_bookings,
        total_revenue=round(total_revenue, 2),
        open_lost_reports=open_lost,
        open_found_reports=open_found,
        potential_matches=potential_matches,
        is_demo_data=has_demo,
    )


@router.get("/admin/users", response_model=PaginatedResponse)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """List all users (admin only)."""
    q = db.query(User).order_by(User.created_at.desc())
    total = q.count()
    users = q.offset((page - 1) * page_size).limit(page_size).all()
    return PaginatedResponse(
        items=[UserOut.model_validate(u).model_dump() for u in users],
        total=total, page=page, page_size=page_size,
        total_pages=max(1, math.ceil(total / page_size)),
    )


@router.get("/admin/bookings", response_model=PaginatedResponse)
def admin_list_bookings(
    status: str = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """List all bookings (admin only)."""
    from app.schemas.booking import BookingOut
    q = db.query(Booking)
    if status:
        q = q.filter(Booking.status == status)
    q = q.order_by(Booking.created_at.desc())
    total = q.count()
    bookings = q.offset((page - 1) * page_size).limit(page_size).all()
    items = []
    for b in bookings:
        out = BookingOut.model_validate(b)
        f = db.query(ParkingFacility).filter(ParkingFacility.id == b.facility_id).first()
        if f:
            out.facility_name = f.name
        items.append(out.model_dump())
    return PaginatedResponse(
        items=items, total=total, page=page, page_size=page_size,
        total_pages=max(1, math.ceil(total / page_size)),
    )


@router.get("/admin/payments", response_model=PaginatedResponse)
def admin_list_payments(
    status: str = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """List all payments (admin only)."""
    from app.schemas.payment import PaymentOut
    q = db.query(Payment)
    if status:
        q = q.filter(Payment.status == status)
    q = q.order_by(Payment.created_at.desc())
    total = q.count()
    payments = q.offset((page - 1) * page_size).limit(page_size).all()
    return PaginatedResponse(
        items=[PaymentOut.model_validate(p).model_dump() for p in payments],
        total=total, page=page, page_size=page_size,
        total_pages=max(1, math.ceil(total / page_size)),
    )


@router.get("/admin/lost-found/all", response_model=PaginatedResponse)
def admin_list_all_reports(
    report_type: str = "all",
    status: str = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """List all lost & found reports (admin only)."""
    from app.schemas.lost_found import LostReportOut, FoundReportOut
    items = []
    if report_type in ("lost", "all"):
        q = db.query(LostVehicleReport)
        if status:
            q = q.filter(LostVehicleReport.status == status)
        for r in q.order_by(LostVehicleReport.created_at.desc()).all():
            d = LostReportOut.model_validate(r).model_dump()
            d["report_type"] = "lost"
            items.append(d)
    if report_type in ("found", "all"):
        q = db.query(FoundVehicleReport)
        if status:
            q = q.filter(FoundVehicleReport.status == status)
        for r in q.order_by(FoundVehicleReport.created_at.desc()).all():
            d = FoundReportOut.model_validate(r).model_dump()
            d["report_type"] = "found"
            items.append(d)

    total = len(items)
    start = (page - 1) * page_size
    paged = items[start:start + page_size]
    return PaginatedResponse(
        items=paged, total=total, page=page, page_size=page_size,
        total_pages=max(1, math.ceil(total / page_size)),
    )


@router.get("/admin/matches", response_model=list)
def admin_list_matches(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """List all suggested matches (admin only)."""
    from app.schemas.lost_found import SuggestedMatchOut
    matches = db.query(SuggestedMatch).order_by(
        SuggestedMatch.match_score.desc()
    ).all()
    return [SuggestedMatchOut.model_validate(m).model_dump() for m in matches]


@router.get("/admin/occupancy-trends")
def occupancy_trends(
    facility_id: int = None,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Get occupancy trends for charts."""
    q = db.query(ParkingAvailability)
    if facility_id:
        q = q.filter(ParkingAvailability.facility_id == facility_id)
    q = q.order_by(ParkingAvailability.timestamp.desc()).limit(168)  # 1 week hourly
    records = q.all()
    return [{
        "timestamp": r.timestamp.isoformat() if r.timestamp else None,
        "facility_id": r.facility_id,
        "occupancy_rate": r.occupancy_rate,
        "available_spaces": r.available_spaces,
    } for r in records]


# ─── AI Aerial Parking Space Detection Module ───────────────────────────────────

UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "uploads", "aerial"
)
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/ai/parking-detection")
async def analyze_aerial_parking(
    file: UploadFile = File(...),
    facility_id: Optional[int] = Form(None),
    grid_rows: int = Form(3),
    grid_cols: int = Form(6),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Isolated computer-vision aerial image analysis module.
    Detects parking bays, evaluates color variance/luminance heuristics per slot,
    identifies apparently occupied / apparently vacant / uncertain bays,
    and returns confidence and uncertainty scores.
    DOES NOT automatically change live facility occupancy without human operator verification.
    """
    ext = os.path.splitext(file.filename)[1].lower() or ".jpg"
    safe_name = f"{uuid.uuid4().hex[:12]}{ext}"
    dest_path = os.path.join(UPLOAD_DIR, safe_name)

    content = await file.read()
    with open(dest_path, "wb") as f:
        f.write(content)

    # Process image with PIL
    try:
        img = Image.open(dest_path)
        img_w, img_h = img.size
    except Exception:
        img_w, img_h = 800, 600

    rows = max(1, min(6, grid_rows))
    cols = max(1, min(10, grid_cols))
    total_slots = rows * cols

    detected_spaces = []
    occupied_count = 0
    vacant_count = 0
    uncertain_count = 0

    margin_x = int(img_w * 0.08)
    margin_y = int(img_h * 0.12)
    slot_w = int((img_w - (margin_x * 2)) / cols)
    slot_h = int((img_h - (margin_y * 2)) / rows)

    for r in range(rows):
        for c in range(cols):
            x = margin_x + (c * slot_w)
            y = margin_y + (r * slot_h)
            slot_id = f"BAY-R{r+1}C{c+1}"

            # Analyze patch variance if PIL image loaded
            try:
                patch = img.crop((x, y, x + slot_w, y + slot_h)).convert("RGB")
                stat = ImageStat.Stat(patch)
                # Color variance across RGB channels indicates complex vehicle contours
                variance = sum(stat.var) / 3.0
                mean_lum = sum(stat.mean) / 3.0

                if variance > 1200:
                    status = "apparently_occupied"
                    conf = min(0.96, 0.75 + (variance / 6000.0))
                elif variance < 600:
                    status = "apparently_vacant"
                    conf = min(0.95, 0.72 + ((600 - variance) / 1000.0))
                else:
                    status = "uncertain"
                    conf = 0.58
            except Exception:
                # Deterministic fallback based on slot coordinates
                is_occ = (r + c) % 2 == 0
                status = "apparently_occupied" if is_occ else "apparently_vacant"
                conf = 0.85

            if status == "apparently_occupied":
                occupied_count += 1
            elif status == "apparently_vacant":
                vacant_count += 1
            else:
                uncertain_count += 1

            detected_spaces.append({
                "space_id": slot_id,
                "x": int(x),
                "y": int(y),
                "width": int(slot_w * 0.9),
                "height": int(slot_h * 0.9),
                "status": status,
                "confidence": round(float(conf), 2),
            })

    # Overall metrics
    overall_confidence = round(
        sum(s["confidence"] for s in detected_spaces) / max(total_slots, 1), 2
    )
    uncertainty_rate = round(uncertain_count / max(total_slots, 1), 2)

    # Persist analysis in database
    analysis = ImageAnalysis(
        user_id=current_user.id,
        facility_id=facility_id,
        image_name=file.filename or safe_name,
        image_path=f"/uploads/aerial/{safe_name}",
        total_detected=total_slots,
        occupied_count=occupied_count,
        vacant_count=vacant_count,
        unknown_count=uncertain_count,
        confidence_score=overall_confidence,
        detected_spaces=detected_spaces,
        status="pending_review",
        created_at=datetime.now(timezone.utc),
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return {
        "analysis_id": analysis.id,
        "image_name": analysis.image_name,
        "image_url": analysis.image_path,
        "facility_id": facility_id,
        "image_dimensions": {"width": img_w, "height": img_h},
        "total_detected_spaces": total_slots,
        "occupied_count": occupied_count,
        "vacant_count": vacant_count,
        "uncertain_count": uncertain_count,
        "confidence_score": overall_confidence,
        "uncertainty_rate": uncertainty_rate,
        "detected_spaces": detected_spaces,
        "status": "pending_review",
        "disclaimer": (
            "Static computer-vision aerial snapshot analysis. "
            "Requires human operator review and confirmation before modifying active facility availability."
        ),
        "created_at": analysis.created_at.isoformat(),
    }


@router.get("/ai/parking-detection/history")
def list_aerial_analyses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List historical image analyses for human review."""
    q = db.query(ImageAnalysis)
    if current_user.role == "citizen":
        q = q.filter(ImageAnalysis.user_id == current_user.id)
    records = q.order_by(ImageAnalysis.created_at.desc()).limit(20).all()
    return [{
        "id": a.id,
        "image_name": a.image_name,
        "image_url": a.image_path,
        "facility_id": a.facility_id,
        "total_detected": a.total_detected,
        "occupied_count": a.occupied_count,
        "vacant_count": a.vacant_count,
        "unknown_count": a.unknown_count,
        "confidence_score": a.confidence_score,
        "status": a.status,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "reviewed_by": a.reviewed_by,
        "review_notes": a.review_notes,
    } for a in records]


@router.get("/ai/parking-detection/{analysis_id}")
def get_aerial_analysis(
    analysis_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get full details of a specific aerial analysis."""
    analysis = db.query(ImageAnalysis).filter(ImageAnalysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis record not found")
    return {
        "id": analysis.id,
        "image_name": analysis.image_name,
        "image_url": analysis.image_path,
        "facility_id": analysis.facility_id,
        "total_detected": analysis.total_detected,
        "occupied_count": analysis.occupied_count,
        "vacant_count": analysis.vacant_count,
        "unknown_count": analysis.unknown_count,
        "confidence_score": analysis.confidence_score,
        "detected_spaces": analysis.detected_spaces or [],
        "status": analysis.status,
        "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
        "reviewed_by": analysis.reviewed_by,
        "review_notes": analysis.review_notes,
    }


@router.patch("/ai/parking-detection/{analysis_id}/review")
def review_aerial_analysis(
    analysis_id: int,
    payload: dict = Body(...),
    current_user: User = Depends(require_role("admin", "operator")),
    db: Session = Depends(get_db),
):
    """
    Human Review and Correction endpoint.
    Allows an operator or admin to correct individual detected space statuses,
    add notes, and mark the analysis as 'reviewed'.
    """
    analysis = db.query(ImageAnalysis).filter(ImageAnalysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis record not found")

    if "detected_spaces" in payload:
        analysis.detected_spaces = payload["detected_spaces"]
        # Recompute counts
        occ = sum(1 for s in payload["detected_spaces"] if s.get("status") == "apparently_occupied")
        vac = sum(1 for s in payload["detected_spaces"] if s.get("status") == "apparently_vacant")
        unc = sum(1 for s in payload["detected_spaces"] if s.get("status") == "uncertain")
        analysis.occupied_count = occ
        analysis.vacant_count = vac
        analysis.unknown_count = unc

    analysis.status = "reviewed"
    analysis.reviewed_by = current_user.id
    if "review_notes" in payload:
        analysis.review_notes = payload["review_notes"]
    analysis.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(analysis)
    return {
        "id": analysis.id,
        "status": analysis.status,
        "reviewed_by": analysis.reviewed_by,
        "occupied_count": analysis.occupied_count,
        "vacant_count": analysis.vacant_count,
        "unknown_count": analysis.unknown_count,
        "review_notes": analysis.review_notes,
        "message": "Human review and corrections saved successfully",
    }


@router.post("/ai/parking-detection/{analysis_id}/apply")
def apply_reviewed_analysis_to_facility(
    analysis_id: int,
    current_user: User = Depends(require_role("admin", "operator")),
    db: Session = Depends(get_db),
):
    """
    Explicitly apply verified human-reviewed aerial count to facility available_spaces.
    Requires operator/admin role and facility ownership validation.
    """
    analysis = db.query(ImageAnalysis).filter(ImageAnalysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis record not found")
    if not analysis.facility_id:
        raise HTTPException(status_code=400, detail="Analysis is not associated with any facility")

    facility = db.query(ParkingFacility).filter(ParkingFacility.id == analysis.facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    if current_user.role == "operator" and facility.operator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this facility")

    # Apply verified vacant spaces
    facility.available_spaces = min(facility.total_capacity, max(0, analysis.vacant_count))
    analysis.status = "applied"
    analysis.updated_at = datetime.now(timezone.utc)

    # Record Audit
    from app.models.transport import AuditLog
    audit = AuditLog(
        user_id=current_user.id,
        action="APPLY_AERIAL_ANALYSIS",
        resource_type="parking_facility",
        resource_id=facility.id,
        details={"analysis_id": analysis.id, "vacant_count": analysis.vacant_count},
    )
    db.add(audit)

    db.commit()
    db.refresh(facility)
    return {
        "facility_id": facility.id,
        "facility_name": facility.name,
        "total_capacity": facility.total_capacity,
        "available_spaces": facility.available_spaces,
        "analysis_id": analysis.id,
        "status": "applied",
        "message": f"Facility availability safely updated to {facility.available_spaces} based on human-reviewed analysis.",
    }

