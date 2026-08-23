"""
API 키 없이 로컬에서 바로 전체 플로우(추천 → 쿠폰 인증 → 리뷰)를 테스트할 수 있도록
만든 데모용 샘플 POI/제휴 데이터.

주의: rating 필드는 검증 안 된 값을 넣지 않는다(None). 실제 리뷰 평점은
review_stats 서비스가 앱 내 실제 리뷰로부터 계산한다. reservation_url도
실제로 확인된 공식 사이트만 넣는다 — 확인 안 되면 비워둘 것.

실행: python -m app.etl.seed_demo_data
(먼저 python -m app.etl.seed_stations 로 정류장을 넣어둘 것)
"""

from datetime import date

from .. import models
from ..database import Base, SessionLocal, engine
from ..services.geo import haversine_m

DEMO_POIS = [
    {
        "station_name": "대전역(중앙시장)",
        "name": "성심당 본점",
        "category": "CAFE",
        "lat": 36.3283,
        "lng": 127.4258,
        "is_partner": True,
        "discount_info": "성심당 튀김소보로 1+1",
        "coupon_code": "TRAM-SSD-10",
        "reservation_url": "https://sungsimdang.co.kr",
    },
    {
        "station_name": "대전역(중앙시장)",
        "name": "청년다방 대전역점",
        "category": "CAFE",
        "lat": 36.3312,
        "lng": 127.4341,
        "is_partner": False,
    },
    {
        "station_name": "국립중앙과학관(엑스포과학공원)",
        "name": "대전시립미술관",
        "category": "ATTRACTION",
        "lat": 36.3752,
        "lng": 127.3903,
        "is_partner": False,
    },
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        stations_by_name = {s.name: s for s in db.query(models.Station).all()}

        for row in DEMO_POIS:
            station = stations_by_name.get(row["station_name"])
            if not station:
                print(f"경고: 정류장 '{row['station_name']}' 없음 — seed_stations 먼저 실행하세요")
                continue

            poi = (
                db.query(models.POI)
                .filter(models.POI.source == "manual", models.POI.external_id == row["name"])
                .first()
            )
            if not poi:
                poi = models.POI(
                    external_id=row["name"],
                    name=row["name"],
                    category=row["category"],
                    lat=row["lat"],
                    lng=row["lng"],
                    source="manual",
                    is_partner=row.get("is_partner", False),
                )
                db.add(poi)
                db.flush()

            link = (
                db.query(models.StationPOI)
                .filter(models.StationPOI.station_id == station.id, models.StationPOI.poi_id == poi.id)
                .first()
            )
            if not link:
                distance_m = haversine_m(station.lat, station.lng, poi.lat, poi.lng)
                db.add(models.StationPOI(station_id=station.id, poi_id=poi.id, distance_m=distance_m))

            if row.get("is_partner") and not poi.partner:
                db.add(
                    models.Partner(
                        poi_id=poi.id,
                        discount_info=row["discount_info"],
                        coupon_code=row["coupon_code"],
                        valid_until=date(2026, 12, 31),
                        reservation_url=row.get("reservation_url"),
                    )
                )

        db.commit()
        print("데모 데이터 시드 완료")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
