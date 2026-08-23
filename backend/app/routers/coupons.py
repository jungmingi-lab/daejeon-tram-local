from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db

router = APIRouter(prefix="/coupons", tags=["coupons"])


@router.get("/partners", response_model=List[schemas.PartnerDirectoryOut])
def list_partners(db: Session = Depends(get_db)):
    partners = db.query(models.Partner).all()
    return [
        {
            "id": p.id,
            "poi_name": p.poi.name,
            "discount_info": p.discount_info,
            "reservation_url": p.reservation_url,
        }
        for p in partners
    ]


@router.post("/{partner_id}/redeem")
def redeem_coupon(
    partner_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    partner = db.query(models.Partner).filter(models.Partner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="제휴 매장을 찾을 수 없습니다")

    redemption = models.CouponRedeem(user_id=current_user.id, partner_id=partner_id)
    db.add(redemption)
    db.commit()
    db.refresh(redemption)
    return {
        "status": "ok",
        "redeemed_at": redemption.redeemed_at,
        "discount_info": partner.discount_info,
    }
