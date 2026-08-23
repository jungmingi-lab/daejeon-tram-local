from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..services.review_stats import get_review_stats

router = APIRouter(prefix="/pois", tags=["pois"])


@router.get("/{poi_id}", response_model=schemas.POIOut)
def get_poi(poi_id: int, db: Session = Depends(get_db)):
    poi = db.query(models.POI).filter(models.POI.id == poi_id).first()
    if not poi:
        raise HTTPException(status_code=404, detail="장소를 찾을 수 없습니다")

    item = schemas.POIOut.model_validate(poi)
    stats = get_review_stats(db, [poi.id])
    if poi.id in stats:
        item.review_avg_rating, item.review_count = stats[poi.id]
    return item


@router.get("/{poi_id}/reviews", response_model=List[schemas.ReviewOut])
def list_reviews(poi_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Review)
        .filter(models.Review.poi_id == poi_id)
        .order_by(models.Review.created_at.desc())
        .all()
    )
