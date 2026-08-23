from typing import Optional

from sqlalchemy.orm import Session

from .. import models
from .review_stats import get_review_stats


def get_recommendations(
    db: Session,
    station_id: int,
    category: Optional[str] = None,
    sort: str = "distance",
    limit: int = 20,
):
    """정류장 주변 추천 목록과, 그 목록에 포함된 POI들의 리뷰 통계(poi_id -> (평균, 개수))를 함께 반환한다."""
    query = (
        db.query(models.POI, models.StationPOI.distance_m)
        .join(models.StationPOI, models.StationPOI.poi_id == models.POI.id)
        .filter(models.StationPOI.station_id == station_id)
    )

    if category:
        query = query.filter(models.POI.category == category.upper())

    results = query.all()
    stats = get_review_stats(db, [poi.id for poi, _ in results])

    def sort_key(row):
        poi, distance_m = row
        partner_weight = 0 if poi.is_partner else 1
        if sort == "rating":
            avg_rating = stats.get(poi.id, (0, 0))[0]
            return (partner_weight, -avg_rating)
        return (partner_weight, distance_m)

    results.sort(key=sort_key)
    return results[:limit], stats
