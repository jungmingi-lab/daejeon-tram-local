from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.post("", response_model=schemas.ReviewOut)
def create_review(body: schemas.ReviewCreate, db: Session = Depends(get_db)):
    poi = db.query(models.POI).filter(models.POI.id == body.poi_id).first()
    if not poi:
        raise HTTPException(status_code=404, detail="장소를 찾을 수 없습니다")

    review = models.Review(**body.model_dump())
    db.add(review)
    db.commit()
    db.refresh(review)
    return review
