"""SmartPark AI - Pydantic Schemas for Auth & Users."""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


# --- Auth Schemas ---
class UserRegister(BaseModel):
    email: EmailStr
    username: Optional[str] = None
    full_name: str = Field(..., min_length=2, max_length=255)
    password: str = Field(..., min_length=6, max_length=128)
    phone: Optional[str] = None
    role: str = Field(default="citizen", pattern="^(citizen|operator|admin)$")


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: int
    email: str
    username: Optional[str] = None
    full_name: str
    phone: Optional[str] = None
    role: str
    is_active: bool
    avatar_url: Optional[str] = None
    address: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    avatar_url: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)


# Resolve forward reference
TokenResponse.model_rebuild()
