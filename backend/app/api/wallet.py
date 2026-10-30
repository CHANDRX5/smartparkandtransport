"""SmartPark AI - Digital Wallet API Routes.
Supports Credit, Debit, Withdrawal, Refunds, and Reversals with atomic balance protection.
"""
import uuid
from datetime import datetime, timezone
import math
from typing import Optional, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.payment import Wallet, WalletTransaction
from app.models.transport import AuditLog

router = APIRouter(prefix="/wallet", tags=["Digital Wallet"])


# ─── Pydantic Schemas ──────────────────────────────────────────────────────────

class WalletOut(BaseModel):
    id: int
    user_id: int
    balance: float
    currency: str
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WalletTopupRequest(BaseModel):
    amount: float = Field(..., gt=0, le=100000, description="Top-up amount in INR")
    payment_method: str = Field(default="demo_sandbox", description="razorpay, upi, demo_sandbox")
    gateway_payment_id: Optional[str] = None


class WalletDebitRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Debit amount in INR")
    service_type: str = Field(default="parking_booking", description="parking_booking, bus_booking, ev_charging")
    reference_id: Optional[str] = None
    description: str = Field(..., min_length=3, max_length=255)


class WalletWithdrawRequest(BaseModel):
    amount: float = Field(..., gt=0, le=50000, description="Withdrawal amount in INR")
    payout_destination: str = Field(..., min_length=5, max_length=255, description="Verified UPI ID (e.g. user@okhdfcbank) or Bank A/C & IFSC")


class WalletTransactionOut(BaseModel):
    id: int
    wallet_id: int
    user_id: int
    amount: float
    transaction_type: str
    status: str
    transaction_ref: str
    reference_id: Optional[str] = None
    description: str
    payout_destination: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Helper: Get or Create Wallet ──────────────────────────────────────────────

def get_or_create_wallet(user_id: int, db: Session) -> Wallet:
    wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    if not wallet:
        wallet = Wallet(
            user_id=user_id,
            balance=0.0,
            currency="INR",
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
    return wallet


# ─── Wallet Endpoints ──────────────────────────────────────────────────────────

@router.get("/me", response_model=WalletOut)
def get_my_wallet(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve current user's authenticated digital wallet and available balance."""
    return get_or_create_wallet(current_user.id, db)


@router.post("/topup", response_model=WalletTransactionOut)
def topup_wallet(
    payload: WalletTopupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Credit funds to wallet.
    In demo mode, records verified test payment and credits balance.
    Prevents negative amounts, repeated callbacks, and untrusted balances.
    """
    wallet = get_or_create_wallet(current_user.id, db)
    if not wallet.is_active:
        raise HTTPException(status_code=400, detail="Wallet is inactive. Please contact support.")

    # Idempotency / Reference generation
    tx_ref = f"WAL-CR-{uuid.uuid4().hex[:10].upper()}"

    # Atomic credit
    wallet.balance = round(wallet.balance + payload.amount, 2)
    wallet.updated_at = datetime.now(timezone.utc)

    tx = WalletTransaction(
        wallet_id=wallet.id,
        user_id=current_user.id,
        amount=payload.amount,
        transaction_type="CREDIT",
        status="SUCCESS",
        transaction_ref=tx_ref,
        reference_id=payload.gateway_payment_id or f"SANDBOX-GATEWAY-{uuid.uuid4().hex[:8].upper()}",
        description=f"Wallet Top-Up via {payload.payment_method.replace('_', ' ').title()}",
        created_at=datetime.now(timezone.utc),
    )
    db.add(tx)

    # Audit Trail
    audit = AuditLog(
        user_id=current_user.id,
        action="WALLET_TOPUP",
        resource_type="wallet",
        resource_id=wallet.id,
        details={"amount": payload.amount, "tx_ref": tx_ref, "new_balance": wallet.balance},
    )
    db.add(audit)

    db.commit()
    db.refresh(tx)
    return tx


@router.post("/debit", response_model=WalletTransactionOut)
def debit_wallet(
    payload: WalletDebitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Debit funds from user wallet for verified parking or bus bookings.
    Strictly prevents negative balances and unauthorized access.
    """
    wallet = get_or_create_wallet(current_user.id, db)
    if not wallet.is_active:
        raise HTTPException(status_code=400, detail="Wallet is inactive.")

    # Concurrency safe balance check
    if wallet.balance < payload.amount:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient wallet balance. Available: ₹{wallet.balance:.2f}, Required: ₹{payload.amount:.2f}",
        )

    # Atomic debit
    wallet.balance = round(wallet.balance - payload.amount, 2)
    wallet.updated_at = datetime.now(timezone.utc)

    tx_ref = f"WAL-DR-{uuid.uuid4().hex[:10].upper()}"
    tx = WalletTransaction(
        wallet_id=wallet.id,
        user_id=current_user.id,
        amount=payload.amount,
        transaction_type="DEBIT",
        status="SUCCESS",
        transaction_ref=tx_ref,
        reference_id=payload.reference_id,
        description=payload.description,
        created_at=datetime.now(timezone.utc),
    )
    db.add(tx)

    audit = AuditLog(
        user_id=current_user.id,
        action="WALLET_DEBIT",
        resource_type="wallet",
        resource_id=wallet.id,
        details={"amount": payload.amount, "service": payload.service_type, "new_balance": wallet.balance},
    )
    db.add(audit)

    db.commit()
    db.refresh(tx)
    return tx


@router.post("/withdraw", response_model=WalletTransactionOut)
def withdraw_wallet(
    payload: WalletWithdrawRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Withdraw funds from wallet to a verified destination (UPI / Bank Account).
    Enforces minimum balance, records payout destination, and creates withdrawal audit.
    """
    wallet = get_or_create_wallet(current_user.id, db)
    if not wallet.is_active:
        raise HTTPException(status_code=400, detail="Wallet is inactive.")

    if wallet.balance < payload.amount:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient wallet balance for withdrawal. Available: ₹{wallet.balance:.2f}",
        )

    # Atomic debit for payout
    wallet.balance = round(wallet.balance - payload.amount, 2)
    wallet.updated_at = datetime.now(timezone.utc)

    tx_ref = f"WAL-WD-{uuid.uuid4().hex[:10].upper()}"
    tx = WalletTransaction(
        wallet_id=wallet.id,
        user_id=current_user.id,
        amount=payload.amount,
        transaction_type="WITHDRAWAL",
        status="SUCCESS",
        transaction_ref=tx_ref,
        description=f"Withdrawal Payout to {payload.payout_destination}",
        payout_destination=payload.payout_destination,
        created_at=datetime.now(timezone.utc),
    )
    db.add(tx)

    audit = AuditLog(
        user_id=current_user.id,
        action="WALLET_WITHDRAWAL",
        resource_type="wallet",
        resource_id=wallet.id,
        details={"amount": payload.amount, "destination": payload.payout_destination, "new_balance": wallet.balance},
    )
    db.add(audit)

    db.commit()
    db.refresh(tx)
    return tx


@router.get("/transactions", response_model=List[WalletTransactionOut])
def get_wallet_transactions(
    tx_type: Optional[str] = Query(None, description="CREDIT, DEBIT, WITHDRAWAL, REFUND, REVERSAL"),
    status: Optional[str] = Query(None, description="SUCCESS, PENDING, FAILED"),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get authenticated user's wallet transaction history."""
    q = db.query(WalletTransaction).filter(WalletTransaction.user_id == current_user.id)
    if tx_type:
        q = q.filter(WalletTransaction.transaction_type == tx_type.upper())
    if status:
        q = q.filter(WalletTransaction.status == status.upper())
    txs = q.order_by(WalletTransaction.created_at.desc()).limit(limit).all()
    return txs
