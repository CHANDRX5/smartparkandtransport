"""SmartPark AI - Pydantic Schemas for Payments."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class PaymentCreate(BaseModel):
    booking_id: int
    payment_method: str = Field(default="demo_sandbox")


class PaymentOut(BaseModel):
    id: int
    booking_id: int
    user_id: int
    amount: float
    currency: str
    status: str
    payment_method: Optional[str] = None
    gateway_order_id: Optional[str] = None
    gateway_payment_id: Optional[str] = None
    transaction_ref: str
    is_demo_payment: bool
    failure_reason: Optional[str] = None
    paid_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PaymentVerify(BaseModel):
    gateway_payment_id: str
    gateway_order_id: str
    gateway_signature: str


class DemoPaymentConfirm(BaseModel):
    transaction_ref: str
    confirm: bool = True
