from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from .database import Base


class Station(Base):
    __tablename__ = "stations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    district = Column(String, nullable=False)  # 동구 | 중구 | 서구 | 유성구 | 대덕구
    segment = Column(String, default="본선")  # 본선 | 연축지선 | 진잠지선
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    line_order = Column(Integer, nullable=False)
    data_source = Column(String, default="seed_placeholder")

    pois = relationship("StationPOI", back_populates="station")


class POI(Base):
    __tablename__ = "pois"
    __table_args__ = (UniqueConstraint("source", "external_id", name="uq_poi_source_external"),)

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)  # FOOD | CAFE | ATTRACTION
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    source = Column(String, nullable=False)  # kakao | tourapi | manual
    rating = Column(Float, nullable=True)
    image_url = Column(String, nullable=True)
    is_partner = Column(Boolean, default=False)

    stations = relationship("StationPOI", back_populates="poi")
    partner = relationship("Partner", back_populates="poi", uselist=False)
    reviews = relationship("Review", back_populates="poi")


class StationPOI(Base):
    __tablename__ = "station_poi"

    station_id = Column(Integer, ForeignKey("stations.id"), primary_key=True)
    poi_id = Column(Integer, ForeignKey("pois.id"), primary_key=True)
    distance_m = Column(Float, nullable=False)

    station = relationship("Station", back_populates="pois")
    poi = relationship("POI", back_populates="stations")


class Partner(Base):
    __tablename__ = "partners"

    id = Column(Integer, primary_key=True, index=True)
    poi_id = Column(Integer, ForeignKey("pois.id"), unique=True, nullable=False)
    discount_info = Column(String, nullable=False)
    coupon_code = Column(String, nullable=False)
    valid_until = Column(Date, nullable=True)
    reservation_url = Column(String, nullable=True)  # 실제 검증 가능한 공식 사이트/예약 링크만 넣을 것

    poi = relationship("POI", back_populates="partner")
    redemptions = relationship("CouponRedeem", back_populates="partner")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    salt = Column(String, nullable=False)  # hex-encoded
    created_at = Column(DateTime, default=datetime.utcnow)

    tokens = relationship("AuthToken", back_populates="user")
    redemptions = relationship("CouponRedeem", back_populates="user")


class AuthToken(Base):
    __tablename__ = "auth_tokens"

    token = Column(String, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="tokens")


class CouponRedeem(Base):
    __tablename__ = "coupon_redeem"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    partner_id = Column(Integer, ForeignKey("partners.id"), nullable=False)
    redeemed_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="redemptions")
    partner = relationship("Partner", back_populates="redemptions")


class CourseItem(Base):
    """사용자가 "계획 세우기"로 담아둔 나만의 코스 항목."""

    __tablename__ = "course_items"
    __table_args__ = (UniqueConstraint("user_id", "poi_id", name="uq_course_user_poi"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    poi_id = Column(Integer, ForeignKey("pois.id"), nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    poi = relationship("POI")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    poi_id = Column(Integer, ForeignKey("pois.id"), nullable=False)
    user_id = Column(String, nullable=False)
    rating = Column(Integer, nullable=False)
    content = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    poi = relationship("POI", back_populates="reviews")
