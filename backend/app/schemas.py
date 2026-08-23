from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class StationOut(BaseModel):
    id: int
    name: str
    district: str
    segment: str
    lat: float
    lng: float
    line_order: int

    class Config:
        from_attributes = True


class PartnerOut(BaseModel):
    id: int
    discount_info: str
    coupon_code: str
    valid_until: Optional[date] = None
    reservation_url: Optional[str] = None

    class Config:
        from_attributes = True


class POIOut(BaseModel):
    id: int
    name: str
    category: str
    lat: float
    lng: float
    rating: Optional[float] = None
    image_url: Optional[str] = None
    is_partner: bool
    distance_m: Optional[float] = None
    partner: Optional[PartnerOut] = None
    review_avg_rating: Optional[float] = None
    review_count: int = 0

    class Config:
        from_attributes = True


class ReviewCreate(BaseModel):
    poi_id: int
    user_id: str
    rating: int
    content: Optional[str] = None


class ReviewOut(BaseModel):
    id: int
    poi_id: int
    user_id: str
    rating: int
    content: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    email: str


class MeOut(BaseModel):
    email: str


class RedemptionOut(BaseModel):
    id: int
    redeemed_at: datetime
    poi_name: str
    poi_category: str
    discount_info: str


class PartnerDirectoryOut(BaseModel):
    id: int
    poi_name: str
    discount_info: str
    reservation_url: Optional[str] = None


class CourseItemCreate(BaseModel):
    poi_id: int


class CourseItemOut(BaseModel):
    id: int
    poi_id: int
    poi_name: str
    poi_category: str
    added_at: datetime
