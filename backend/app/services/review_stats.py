from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models


def get_review_stats(db: Session, poi_ids: list[int]) -> dict[int, tuple[float, int]]:
    """poi_id -> (평균 별점, 리뷰 개수) 매핑을 반환한다. 리뷰 없는 poi_id는 포함하지 않는다."""
    if not poi_ids:
        return {}

    rows = (
        db.query(models.Review.poi_id, func.avg(models.Review.rating), func.count(models.Review.id))
        .filter(models.Review.poi_id.in_(poi_ids))
        .group_by(models.Review.poi_id)
        .all()
    )
    return {poi_id: (round(avg, 1), count) for poi_id, avg, count in rows}
