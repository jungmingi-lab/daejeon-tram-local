from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..services.recommendation import get_recommendations

router = APIRouter(prefix="/stations", tags=["stations"])


@router.get("", response_model=List[schemas.StationOut])
def list_stations(db: Session = Depends(get_db)):
    return db.query(models.Station).order_by(models.Station.line_order).all()


@router.get("/{station_id}", response_model=schemas.StationOut)
def get_station(station_id: int, db: Session = Depends(get_db)):
    station = db.query(models.Station).filter(models.Station.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="정류장을 찾을 수 없습니다")
    return station


@router.get("/{station_id}/recommendations", response_model=List[schemas.POIOut])
def station_recommendations(
    station_id: int,
    category: Optional[str] = Query(None, description="FOOD | CAFE | ATTRACTION"),
    sort: str = Query("distance", description="distance | rating"),
    limit: int = Query(20, le=50),
    db: Session = Depends(get_db),
):
    station = db.query(models.Station).filter(models.Station.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="정류장을 찾을 수 없습니다")

    rows, stats = get_recommendations(db, station_id, category=category, sort=sort, limit=limit)

    output = []
    for poi, distance_m in rows:
        item = schemas.POIOut.model_validate(poi)
        item.distance_m = distance_m
        if poi.id in stats:
            item.review_avg_rating, item.review_count = stats[poi.id]
        output.append(item)
    return output
