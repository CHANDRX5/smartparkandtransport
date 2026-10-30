"""SmartPark AI - Payment & Transaction Models."""
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    # pending, processing, completed, failed, refunded, demo
    status = Column(String(50), nullable=False, default="pending")
    payment_method = Column(String(50), nullable=True)  # razorpay, wallet, demo_sandbox
    gateway_order_id = Column(String(255), nullable=True)
    gateway_payment_id = Column(String(255), nullable=True, index=True)
    gateway_signature = Column(String(255), nullable=True)
    transaction_ref = Column(String(100), unique=True, nullable=False, index=True)
    is_demo_payment = Column(Boolean, default=False)
    failure_reason = Column(Text, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    refunded_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    booking = relationship("Booking", back_populates="payment")
    user = relationship("User", back_populates="payments")


class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    balance = Column(Float, nullable=False, default=0.0)
    currency = Column(String(10), default="INR")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="wallet")
    transactions = relationship("WalletTransaction", back_populates="wallet", lazy="dynamic", order_by="desc(WalletTransaction.created_at)")


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id = Column(Integer, primary_key=True, index=True)
    wallet_id = Column(Integer, ForeignKey("wallets.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    # CREDIT, DEBIT, WITHDRAWAL, REFUND, REVERSAL
    transaction_type = Column(String(30), nullable=False)
    # PENDING, SUCCESS, FAILED, REVERSED
    status = Column(String(30), nullable=False, default="SUCCESS")
    transaction_ref = Column(String(100), unique=True, nullable=False, index=True)
    reference_id = Column(String(100), nullable=True)  # linked booking_ref, gateway payment id, or withdrawal id
    description = Column(String(255), nullable=False)
    payout_destination = Column(String(255), nullable=True)  # for withdrawals: UPI ID or bank account
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    # Relationships
    wallet = relationship("Wallet", back_populates="transactions")
    user = relationship("User", back_populates="wallet_transactions")
