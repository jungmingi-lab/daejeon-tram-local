from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db

router = APIRouter(prefix="/me", tags=["me"])


@router.get("", response_model=schemas.MeOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    return {"email": current_user.email}


@router.get("/redemptions", response_model=List[schemas.RedemptionOut])
def get_my_redemptions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    redemptions = (
        db.query(models.CouponRedeem)
        .filter(models.CouponRedeem.user_id == current_user.id)
        .order_by(models.CouponRedeem.redeemed_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "redeemed_at": r.redeemed_at,
            "poi_name": r.partner.poi.name,
            "poi_category": r.partner.poi.category,
            "discount_info": r.partner.discount_info,
        }
        for r in redemptions
    ]


@router.get("/course", response_model=List[schemas.CourseItemOut])
def get_my_course(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    items = (
        db.query(models.CourseItem)
        .filter(models.CourseItem.user_id == current_user.id)
        .order_by(models.CourseItem.added_at.asc())
        .all()
    )
    return [
        {
            "id": item.id,
            "poi_id": item.poi_id,
            "poi_name": item.poi.name,
            "poi_category": item.poi.category,
            "added_at": item.added_at,
        }
        for item in items
    ]


@router.post("/course", response_model=schemas.CourseItemOut)
def add_to_my_course(
    body: schemas.CourseItemCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    poi = db.query(models.POI).filter(models.POI.id == body.poi_id).first()
    if not poi:
        raise HTTPException(status_code=404, detail="장소를 찾을 수 없습니다")

    existing = (
        db.query(models.CourseItem)
        .filter(models.CourseItem.user_id == current_user.id, models.CourseItem.poi_id == body.poi_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="이미 코스에 담긴 장소입니다")

    item = models.CourseItem(user_id=current_user.id, poi_id=body.poi_id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return {
        "id": item.id,
        "poi_id": item.poi_id,
        "poi_name": poi.name,
        "poi_category": poi.category,
        "added_at": item.added_at,
    }


@router.delete("/course/{item_id}")
def remove_from_my_course(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = (
        db.query(models.CourseItem)
        .filter(models.CourseItem.id == item_id, models.CourseItem.user_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="코스 항목을 찾을 수 없습니다")

    db.delete(item)
    db.commit()
    return {"status": "ok"}
