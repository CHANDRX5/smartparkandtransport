"""SmartPark AI - Lost & Found API Routes."""
import uuid
import os
import math
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import Optional
from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.models.lost_found import (
    LostVehicleReport, FoundVehicleReport, VehicleImage,
    SuggestedMatch, ReportStatusHistory
)
from app.models.transport import Notification, AuditLog
from app.schemas.lost_found import (
    LostReportCreate, FoundReportCreate, LostReportOut, FoundReportOut,
    SuggestedMatchOut, MatchReview, ReportStatusUpdate, LostFoundSearch
)
from app.schemas.parking import PaginatedResponse

router = APIRouter(prefix="/lost-found", tags=["Lost & Found"])

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_SIZE = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


def generate_report_ref(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"


def compute_match_score(lost: LostVehicleReport, found: FoundVehicleReport) -> tuple:
    """Rule-based matching with explainable reasons."""
    score = 0.0
    reasons = []

    # Registration number match (highest weight)
    if (lost.vehicle_reg_number and found.vehicle_reg_number and
            lost.vehicle_reg_number.upper().replace(" ", "") ==
            found.vehicle_reg_number.upper().replace(" ", "")):
        score += 0.4
        reasons.append("Registration number matches")

    # Vehicle type match
    if lost.vehicle_type and found.vehicle_type and lost.vehicle_type.lower() == found.vehicle_type.lower():
        score += 0.15
        reasons.append("Vehicle type matches")

    # Make match
    if lost.make and found.make and lost.make.lower() == found.make.lower():
        score += 0.15
        reasons.append("Vehicle make matches")

    # Model match
    if lost.model and found.model and lost.model.lower() == found.model.lower():
        score += 0.1
        reasons.append("Vehicle model matches")

    # Color match
    if lost.color and found.color and lost.color.lower() == found.color.lower():
        score += 0.1
        reasons.append("Color matches")

    # Location proximity (basic check)
    if (lost.last_known_latitude and lost.last_known_longitude and
            found.found_latitude and found.found_longitude):
        from app.api.parking import haversine_distance
        dist = haversine_distance(
            lost.last_known_latitude, lost.last_known_longitude,
            found.found_latitude, found.found_longitude
        )
        if dist < 5:
            score += 0.1
            reasons.append(f"Found within {dist:.1f}km of last known location")
        elif dist < 20:
            score += 0.05
            reasons.append(f"Found within {dist:.1f}km of last known location")

    return round(score, 2), reasons


# --- Lost Reports ---
@router.post("/lost", response_model=LostReportOut, status_code=201)
def create_lost_report(
    data: LostReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Report a lost vehicle."""
    report = LostVehicleReport(
        report_ref=generate_report_ref("LOST"),
        reporter_id=current_user.id,
        **data.model_dump(),
    )
    db.add(report)

    # Status history
    db.add(ReportStatusHistory(
        old_status=None,
        new_status="open",
        changed_by=current_user.id,
        notes="Report created",
    ))

    db.add(Notification(
        user_id=current_user.id,
        title="Lost Vehicle Report Created",
        message=f"Your lost vehicle report {report.report_ref} has been submitted.",
        notification_type="lost_found",
        reference_type="lost_report",
    ))

    db.commit()
    db.refresh(report)

    # Auto-match against found reports
    _run_matching(report, db, current_user)

    return LostReportOut.model_validate(report)


@router.get("/lost", response_model=PaginatedResponse)
def list_lost_reports(
    status: Optional[str] = None,
    vehicle_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List user's lost vehicle reports."""
    q = db.query(LostVehicleReport).filter(LostVehicleReport.reporter_id == current_user.id)
    if status:
        q = q.filter(LostVehicleReport.status == status)
    if vehicle_type:
        q = q.filter(LostVehicleReport.vehicle_type == vehicle_type)
    q = q.order_by(LostVehicleReport.created_at.desc())

    total = q.count()
    reports = q.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for r in reports:
        out = LostReportOut.model_validate(r)
        # Hide contact info from non-owners unless visibility allows
        if r.contact_visibility == "private" and r.reporter_id != current_user.id:
            out.contact_phone = None
            out.contact_email = None
        items.append(out.model_dump())

    return PaginatedResponse(
        items=items, total=total, page=page, page_size=page_size,
        total_pages=max(1, math.ceil(total / page_size)),
    )


@router.get("/lost/{report_id}", response_model=LostReportOut)
def get_lost_report(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get lost report details."""
    report = db.query(LostVehicleReport).filter(LostVehicleReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    out = LostReportOut.model_validate(report)
    if report.contact_visibility == "private" and report.reporter_id != current_user.id and current_user.role != "admin":
        out.contact_phone = None
        out.contact_email = None
    return out


# --- Found Reports ---
@router.post("/found", response_model=FoundReportOut, status_code=201)
def create_found_report(
    data: FoundReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Report a found vehicle."""
    report = FoundVehicleReport(
        report_ref=generate_report_ref("FOUND"),
        reporter_id=current_user.id,
        **data.model_dump(),
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Auto-match against lost reports
    _run_matching_found(report, db, current_user)

    return FoundReportOut.model_validate(report)


@router.get("/found", response_model=PaginatedResponse)
def list_found_reports(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List found vehicle reports."""
    q = db.query(FoundVehicleReport).filter(FoundVehicleReport.reporter_id == current_user.id)
    if status:
        q = q.filter(FoundVehicleReport.status == status)
    q = q.order_by(FoundVehicleReport.created_at.desc())
    total = q.count()
    reports = q.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=[FoundReportOut.model_validate(r).model_dump() for r in reports],
        total=total, page=page, page_size=page_size,
        total_pages=max(1, math.ceil(total / page_size)),
    )


# --- Image Upload ---
@router.post("/upload-image/{report_type}/{report_id}")
def upload_image(
    report_type: str,
    report_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a vehicle image for a report."""
    if report_type not in ("lost", "found"):
        raise HTTPException(status_code=400, detail="Invalid report type")
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_MIME_TYPES)}")

    # Verify report ownership
    if report_type == "lost":
        report = db.query(LostVehicleReport).filter(
            LostVehicleReport.id == report_id,
            LostVehicleReport.reporter_id == current_user.id
        ).first()
    else:
        report = db.query(FoundVehicleReport).filter(
            FoundVehicleReport.id == report_id,
            FoundVehicleReport.reporter_id == current_user.id
        ).first()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found or not authorized")

    # Read and validate size
    content = file.file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Max: {settings.MAX_UPLOAD_SIZE_MB}MB")

    # Save with randomized filename
    ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    safe_ext = ext if ext.lower() in (".jpg", ".jpeg", ".png", ".webp", ".gif") else ".jpg"
    filename = f"{uuid.uuid4().hex}{safe_ext}"
    upload_dir = os.path.join(settings.UPLOAD_DIR, "vehicle_images")
    os.makedirs(upload_dir, exist_ok=True)
    filepath = os.path.join(upload_dir, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    image = VehicleImage(
        lost_report_id=report_id if report_type == "lost" else None,
        found_report_id=report_id if report_type == "found" else None,
        filename=filename,
        original_filename=file.filename or "unknown",
        file_path=filepath,
        mime_type=file.content_type,
        file_size=len(content),
        uploaded_by=current_user.id,
    )
    db.add(image)
    db.commit()
    db.refresh(image)

    return {"id": image.id, "filename": image.filename, "message": "Image uploaded successfully"}


# --- Matches ---
@router.get("/matches", response_model=list[SuggestedMatchOut])
def list_matches(
    lost_report_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List match suggestions for user's reports or specific lost report."""
    if lost_report_id:
        matches = db.query(SuggestedMatch).filter(
            SuggestedMatch.lost_report_id == lost_report_id
        ).order_by(SuggestedMatch.match_score.desc()).all()
        return [SuggestedMatchOut.model_validate(m) for m in matches]

    lost_ids = [r[0] for r in db.query(LostVehicleReport.id).filter(
        LostVehicleReport.reporter_id == current_user.id
    ).all()]
    found_ids = [r[0] for r in db.query(FoundVehicleReport.id).filter(
        FoundVehicleReport.reporter_id == current_user.id
    ).all()]

    if not lost_ids and not found_ids:
        # If admin or no reports, return all suggested matches for review
        if current_user.role == "admin":
            matches = db.query(SuggestedMatch).order_by(SuggestedMatch.match_score.desc()).all()
            return [SuggestedMatchOut.model_validate(m) for m in matches]
        return []

    conditions = []
    if lost_ids:
        conditions.append(SuggestedMatch.lost_report_id.in_(lost_ids))
    if found_ids:
        conditions.append(SuggestedMatch.found_report_id.in_(found_ids))

    matches = db.query(SuggestedMatch).filter(
        or_(*conditions)
    ).order_by(SuggestedMatch.match_score.desc()).all()

    return [SuggestedMatchOut.model_validate(m) for m in matches]


@router.get("/matches/{lost_report_id}", response_model=list[SuggestedMatchOut])
def get_report_matches(
    lost_report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get match suggestions for a specific lost report."""
    matches = db.query(SuggestedMatch).filter(
        SuggestedMatch.lost_report_id == lost_report_id
    ).order_by(SuggestedMatch.match_score.desc()).all()
    return [SuggestedMatchOut.model_validate(m) for m in matches]


@router.put("/matches/{match_id}/review", response_model=SuggestedMatchOut)
def review_match(
    match_id: int,
    data: MatchReview,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Review a suggested match (admin only)."""
    match = db.query(SuggestedMatch).filter(SuggestedMatch.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    match.status = data.status
    match.reviewed_by = current_user.id
    match.review_notes = data.notes
    match.reviewed_at = datetime.now(timezone.utc)

    if data.status == "confirmed":
        # Update report statuses
        lost = db.query(LostVehicleReport).filter(LostVehicleReport.id == match.lost_report_id).first()
        found = db.query(FoundVehicleReport).filter(FoundVehicleReport.id == match.found_report_id).first()
        if lost:
            lost.status = "resolved"
            lost.resolved_at = datetime.now(timezone.utc)
        if found:
            found.status = "resolved"
            found.resolved_at = datetime.now(timezone.utc)

        # Notify report owners
        if lost:
            db.add(Notification(
                user_id=lost.reporter_id,
                title="Vehicle Match Confirmed!",
                message=f"A match for your lost vehicle report {lost.report_ref} has been confirmed.",
                notification_type="lost_found",
                reference_type="match",
                reference_id=match.id,
            ))

    # Audit
    db.add(AuditLog(
        user_id=current_user.id,
        action=f"match_{data.status}",
        resource_type="suggested_match",
        resource_id=match.id,
        details={"notes": data.notes},
    ))

    db.commit()
    db.refresh(match)
    return SuggestedMatchOut.model_validate(match)


# --- Admin Status Update ---
@router.put("/lost/{report_id}/status", response_model=LostReportOut)
def update_lost_status(
    report_id: int,
    data: ReportStatusUpdate,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Update lost report status (admin only)."""
    report = db.query(LostVehicleReport).filter(LostVehicleReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    old_status = report.status
    report.status = data.status
    if data.status == "resolved":
        report.resolved_at = datetime.now(timezone.utc)
        report.resolution_notes = data.notes

    db.add(ReportStatusHistory(
        lost_report_id=report.id,
        old_status=old_status,
        new_status=data.status,
        changed_by=current_user.id,
        notes=data.notes,
    ))

    db.add(AuditLog(
        user_id=current_user.id,
        action="status_update",
        resource_type="lost_report",
        resource_id=report.id,
        details={"old": old_status, "new": data.status},
    ))

    db.commit()
    db.refresh(report)
    return LostReportOut.model_validate(report)


@router.put("/found/{report_id}/status", response_model=FoundReportOut)
def update_found_status(
    report_id: int,
    data: ReportStatusUpdate,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Update found report status (admin only)."""
    report = db.query(FoundVehicleReport).filter(FoundVehicleReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    old_status = report.status
    report.status = data.status
    if data.status == "resolved":
        report.resolved_at = datetime.now(timezone.utc)
        report.resolution_notes = data.notes

    db.add(ReportStatusHistory(
        found_report_id=report.id,
        old_status=old_status,
        new_status=data.status,
        changed_by=current_user.id,
        notes=data.notes,
    ))

    db.commit()
    db.refresh(report)
    return FoundReportOut.model_validate(report)


# --- Search ---
@router.get("/search", response_model=PaginatedResponse)
def search_reports(
    vehicle_reg_number: Optional[str] = None,
    vehicle_type: Optional[str] = None,
    color: Optional[str] = None,
    make: Optional[str] = None,
    status: Optional[str] = None,
    report_type: str = "lost",  # lost, found, all
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Search lost and found reports."""
    items = []

    if report_type in ("lost", "all"):
        q = db.query(LostVehicleReport).filter(LostVehicleReport.is_active == True)
        if vehicle_reg_number:
            q = q.filter(LostVehicleReport.vehicle_reg_number.ilike(f"%{vehicle_reg_number}%"))
        if vehicle_type:
            q = q.filter(LostVehicleReport.vehicle_type.ilike(f"%{vehicle_type}%"))
        if color:
            q = q.filter(LostVehicleReport.color.ilike(f"%{color}%"))
        if make:
            q = q.filter(LostVehicleReport.make.ilike(f"%{make}%"))
        if status:
            q = q.filter(LostVehicleReport.status == status)
        for r in q.all():
            out = LostReportOut.model_validate(r)
            if r.contact_visibility == "private" and r.reporter_id != current_user.id and current_user.role != "admin":
                out.contact_phone = None
                out.contact_email = None
            d = out.model_dump()
            d["report_type"] = "lost"
            items.append(d)

    if report_type in ("found", "all"):
        q = db.query(FoundVehicleReport).filter(FoundVehicleReport.is_active == True)
        if vehicle_reg_number:
            q = q.filter(FoundVehicleReport.vehicle_reg_number.ilike(f"%{vehicle_reg_number}%"))
        if vehicle_type:
            q = q.filter(FoundVehicleReport.vehicle_type.ilike(f"%{vehicle_type}%"))
        if color:
            q = q.filter(FoundVehicleReport.color.ilike(f"%{color}%"))
        if make:
            q = q.filter(FoundVehicleReport.make.ilike(f"%{make}%"))
        if status:
            q = q.filter(FoundVehicleReport.status == status)
        for r in q.all():
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


# --- Internal matching helpers ---
def _run_matching(lost_report: LostVehicleReport, db: Session, user: User):
    """Match a new lost report against existing found reports."""
    found_reports = db.query(FoundVehicleReport).filter(
        FoundVehicleReport.status.in_(["open", "potential_match"]),
        FoundVehicleReport.is_active == True
    ).all()

    for found in found_reports:
        score, reasons = compute_match_score(lost_report, found)
        if score >= 0.3:  # Threshold for suggesting a match
            match = SuggestedMatch(
                lost_report_id=lost_report.id,
                found_report_id=found.id,
                match_score=score,
                match_reasons=reasons,
                status="suggested",
            )
            db.add(match)
            # Update report statuses
            lost_report.status = "potential_match"
            found.status = "potential_match"

            db.add(Notification(
                user_id=user.id,
                title="Potential Match Found",
                message=f"A potential match (score: {score*100:.0f}%) was found for your lost vehicle report. This is an unverified suggestion.",
                notification_type="lost_found",
                reference_type="match",
            ))

    db.commit()


def _run_matching_found(found_report: FoundVehicleReport, db: Session, user: User):
    """Match a new found report against existing lost reports."""
    lost_reports = db.query(LostVehicleReport).filter(
        LostVehicleReport.status.in_(["open", "potential_match"]),
        LostVehicleReport.is_active == True
    ).all()

    for lost in lost_reports:
        score, reasons = compute_match_score(lost, found_report)
        if score >= 0.3:
            match = SuggestedMatch(
                lost_report_id=lost.id,
                found_report_id=found_report.id,
                match_score=score,
                match_reasons=reasons,
                status="suggested",
            )
            db.add(match)
            found_report.status = "potential_match"
            lost.status = "potential_match"

            db.add(Notification(
                user_id=lost.reporter_id,
                title="Potential Match Found",
                message=f"A potential match for your report {lost.report_ref} has been suggested. This is an unverified suggestion that requires review.",
                notification_type="lost_found",
                reference_type="match",
            ))

    db.commit()


# ─── VERIFIED VEHICLE HISTORY & ADMIN VERIFICATION ──────────────────────────────

@router.get("/verified")
def get_verified_reports(
    q: Optional[str] = Query(None, description="Search by reg number, make, model, or location"),
    vehicle_type: Optional[str] = Query(None),
    report_type: Optional[str] = Query(None, description="lost, found, or all"),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Returns ONLY successfully verified reports (verification_status == 'VERIFIED').
    Pending and rejected reports are strictly excluded.
    Masks personal contact info to protect submitter privacy.
    """
    results = []

    # 1. Verified Lost Reports
    if report_type != "found":
        ql = db.query(LostVehicleReport).filter(
            LostVehicleReport.verification_status == "VERIFIED",
            LostVehicleReport.is_active == True,
        )
        if q:
            term = f"%{q.lower()}%"
            ql = ql.filter(or_(
                func.lower(LostVehicleReport.vehicle_reg_number).like(term),
                func.lower(LostVehicleReport.make).like(term),
                func.lower(LostVehicleReport.model).like(term),
                func.lower(LostVehicleReport.last_known_location).like(term),
            ))
        if vehicle_type:
            ql = ql.filter(LostVehicleReport.vehicle_type == vehicle_type)

        for item in ql.order_by(LostVehicleReport.verified_at.desc()).limit(limit).all():
            results.append({
                "id": item.id,
                "report_ref": item.report_ref,
                "report_type": "LOST",
                "vehicle_reg_number": item.vehicle_reg_number,
                "vehicle_type": item.vehicle_type,
                "make": item.make,
                "model": item.model,
                "color": item.color,
                "year": item.year,
                "location": item.last_known_location,
                "date": item.last_seen_date.isoformat() if item.last_seen_date else None,
                "description": item.description,
                "status": item.status,
                "verification_status": "VERIFIED",
                "verifier_id": item.verifier_id,
                "verified_at": item.verified_at.isoformat() if item.verified_at else None,
                "verification_notes": item.verification_notes,
                # Privacy protected: contact info masked
                "contact_masked": True,
            })

    # 2. Verified Found Reports
    if report_type != "lost":
        qf = db.query(FoundVehicleReport).filter(
            FoundVehicleReport.verification_status == "VERIFIED",
            FoundVehicleReport.is_active == True,
        )
        if q:
            term = f"%{q.lower()}%"
            qf = qf.filter(or_(
                func.lower(FoundVehicleReport.vehicle_reg_number).like(term),
                func.lower(FoundVehicleReport.make).like(term),
                func.lower(FoundVehicleReport.model).like(term),
                func.lower(FoundVehicleReport.found_location).like(term),
            ))
        if vehicle_type:
            qf = qf.filter(FoundVehicleReport.vehicle_type == vehicle_type)

        for item in qf.order_by(FoundVehicleReport.verified_at.desc()).limit(limit).all():
            results.append({
                "id": item.id,
                "report_ref": item.report_ref,
                "report_type": "FOUND",
                "vehicle_reg_number": item.vehicle_reg_number,
                "vehicle_type": item.vehicle_type,
                "make": item.make,
                "model": item.model,
                "color": item.color,
                "year": None,
                "location": item.found_location,
                "date": item.found_date.isoformat() if item.found_date else None,
                "description": item.description,
                "status": item.status,
                "verification_status": "VERIFIED",
                "verifier_id": item.verifier_id,
                "verified_at": item.verified_at.isoformat() if item.verified_at else None,
                "verification_notes": item.verification_notes,
                "contact_masked": True,
            })

    return results


@router.get("/pending-verification")
def list_pending_verification(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Admin view: List all reports pending review and verification."""
    lost_pending = db.query(LostVehicleReport).filter(
        LostVehicleReport.verification_status == "PENDING_VERIFICATION"
    ).all()
    found_pending = db.query(FoundVehicleReport).filter(
        FoundVehicleReport.verification_status == "PENDING_VERIFICATION"
    ).all()

    items = []
    for l in lost_pending:
        items.append({
            "id": l.id,
            "report_ref": l.report_ref,
            "report_type": "LOST",
            "vehicle_reg_number": l.vehicle_reg_number,
            "vehicle_type": l.vehicle_type,
            "make": l.make,
            "model": l.model,
            "location": l.last_known_location,
            "date": l.last_seen_date.isoformat() if l.last_seen_date else None,
            "description": l.description,
            "verification_status": l.verification_status,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        })
    for f in found_pending:
        items.append({
            "id": f.id,
            "report_ref": f.report_ref,
            "report_type": "FOUND",
            "vehicle_reg_number": f.vehicle_reg_number,
            "vehicle_type": f.vehicle_type,
            "make": f.make,
            "model": f.model,
            "location": f.found_location,
            "date": f.found_date.isoformat() if f.found_date else None,
            "description": f.description,
            "verification_status": f.verification_status,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        })
    return items


@router.post("/{report_type}/{report_id}/verify")
def verify_report(
    report_type: str,
    report_id: int,
    action: str = Query(..., regex="^(VERIFY|REJECT)$"),
    notes: Optional[str] = Query(None),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """
    Authorized Administrator/Verifier reviews and marks report as VERIFIED or REJECTED.
    Preserves audit history and updates status records.
    """
    if report_type not in ("lost", "found"):
        raise HTTPException(status_code=400, detail="Invalid report type")

    new_ver_status = "VERIFIED" if action == "VERIFY" else "REJECTED"

    if report_type == "lost":
        report = db.query(LostVehicleReport).filter(LostVehicleReport.id == report_id).first()
    else:
        report = db.query(FoundVehicleReport).filter(FoundVehicleReport.id == report_id).first()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    old_ver_status = report.verification_status
    report.verification_status = new_ver_status
    report.verifier_id = current_user.id
    report.verified_at = datetime.now(timezone.utc)
    report.verification_notes = notes

    # Add to status history for persistent audit
    history = ReportStatusHistory(
        lost_report_id=report.id if report_type == "lost" else None,
        found_report_id=report.id if report_type == "found" else None,
        old_status=old_ver_status,
        new_status=new_ver_status,
        changed_by=current_user.id,
        notes=f"Admin Verification Action: {action}. Notes: {notes or 'No notes'}",
        created_at=datetime.now(timezone.utc),
    )
    db.add(history)

    # Notify reporter
    db.add(Notification(
        user_id=report.reporter_id,
        title=f"Vehicle Report {new_ver_status.title()}",
        message=f"Your {report_type.upper()} vehicle report {report.report_ref} has been marked as {new_ver_status}. Notes: {notes or 'Verified by administrator.'}",
        notification_type="lost_found",
        reference_type=f"{report_type}_report",
        reference_id=report.id,
    ))

    db.commit()
    db.refresh(report)

    return {
        "report_id": report.id,
        "report_ref": report.report_ref,
        "verification_status": new_ver_status,
        "verifier_id": current_user.id,
        "verified_at": report.verified_at.isoformat(),
        "verification_notes": report.verification_notes,
        "message": f"Report successfully {new_ver_status.lower()}",
    }

