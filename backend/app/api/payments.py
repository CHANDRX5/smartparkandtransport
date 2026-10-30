"""SmartPark AI - Payment API Routes."""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import math
from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_current_user
from app.models.user import User
from app.models.booking import Booking
from app.models.payment import Payment
from app.models.transport import Notification
from app.schemas.payment import PaymentCreate, PaymentOut, PaymentVerify, DemoPaymentConfirm
from app.schemas.parking import PaginatedResponse

router = APIRouter(prefix="/payments", tags=["Payments"])


def generate_transaction_ref() -> str:
    return f"TXN-{uuid.uuid4().hex[:10].upper()}"


@router.post("/", response_model=PaymentOut, status_code=201)
def create_payment(
    data: PaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a payment for a booking."""
    booking = db.query(Booking).filter(
        Booking.id == data.booking_id,
        Booking.user_id == current_user.id,
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status == "cancelled":
        raise HTTPException(status_code=400, detail="Cannot pay for a cancelled booking")

    # Check if payment already exists
    existing = db.query(Payment).filter(Payment.booking_id == data.booking_id).first()
    if existing and existing.status == "completed":
        raise HTTPException(status_code=400, detail="Payment already completed for this booking")
    if existing:
        return PaymentOut.model_validate(existing)

    is_demo = settings.is_demo_mode
    payment = Payment(
        booking_id=booking.id,
        user_id=current_user.id,
        amount=booking.total_amount,
        currency="INR",
        status="pending",
        payment_method="demo_sandbox" if is_demo else "razorpay",
        transaction_ref=generate_transaction_ref(),
        is_demo_payment=is_demo,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return PaymentOut.model_validate(payment)


@router.post("/demo-confirm", response_model=PaymentOut)
def demo_confirm_payment(
    data: DemoPaymentConfirm,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Confirm a demo/sandbox payment (no real money involved)."""
    payment = db.query(Payment).filter(
        Payment.transaction_ref == data.transaction_ref,
        Payment.user_id == current_user.id,
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if not payment.is_demo_payment:
        raise HTTPException(status_code=400, detail="This is not a demo payment. Use gateway verification.")
    if payment.status == "completed":
        raise HTTPException(status_code=400, detail="Payment already completed")

    if data.confirm:
        payment.status = "completed"
        payment.paid_at = datetime.now(timezone.utc)
        payment.gateway_payment_id = f"demo_{uuid.uuid4().hex[:8]}"

        # Update booking status
        booking = db.query(Booking).filter(Booking.id == payment.booking_id).first()
        if booking:
            booking.status = "confirmed"

        # Notification
        db.add(Notification(
            user_id=current_user.id,
            title="Payment Successful (Demo)",
            message=f"Demo payment of ₹{payment.amount} for booking confirmed. No real money was charged.",
            notification_type="payment",
            reference_type="payment",
            reference_id=payment.id,
        ))
    else:
        payment.status = "cancelled"
        payment.failure_reason = "Payment declined by user"

    db.commit()
    db.refresh(payment)
    return PaymentOut.model_validate(payment)


@router.post("/verify", response_model=PaymentOut)
def verify_payment(
    data: PaymentVerify,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify a Razorpay payment (requires configured credentials)."""
    if settings.is_demo_mode:
        raise HTTPException(
            status_code=400,
            detail="Razorpay is not configured. Use demo-confirm endpoint."
        )

    payment = db.query(Payment).filter(
        Payment.gateway_order_id == data.gateway_order_id,
        Payment.user_id == current_user.id,
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    # In production, verify signature with Razorpay SDK here
    # For now, record the gateway details
    payment.gateway_payment_id = data.gateway_payment_id
    payment.gateway_signature = data.gateway_signature
    payment.status = "completed"
    payment.paid_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(payment)
    return PaymentOut.model_validate(payment)


@router.get("/", response_model=PaginatedResponse)
def list_payments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List user's payment history."""
    q = db.query(Payment).filter(Payment.user_id == current_user.id)
    q = q.order_by(Payment.created_at.desc())
    total = q.count()
    payments = q.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=[PaymentOut.model_validate(p).model_dump() for p in payments],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, math.ceil(total / page_size)),
    )


@router.get("/{payment_id}", response_model=PaymentOut)
def get_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get payment details."""
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.user_id == current_user.id,
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return PaymentOut.model_validate(payment)
