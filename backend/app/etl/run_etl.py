"""
정류장별 주변 POI를 OSM(Overpass)/카카오로컬/TourAPI에서 수집해 DB에 적재하는 배치 스크립트.
OSM은 키가 필요 없어 항상 실행되고, 카카오/TourAPI는 키가 없으면 건너뛴다.

실행: python -m app.etl.run_etl
(먼저 python -m app.etl.seed_stations 로 정류장을 넣어둘 것)
"""

import time

from .. import models
from ..config import DEFAULT_RADIUS_M
from ..database import SessionLocal
from ..services.geo import haversine_m
from . import kakao_client, overpass_client, tourapi_client

# OSM 공개 Overpass 인스턴스에 부담을 주지 않기 위한 호출 간 최소 대기(초)
OSM_REQUEST_DELAY_SEC = 1.5


def upsert_poi(db, raw: dict) -> models.POI:
    poi = (
        db.query(models.POI)
        .filter(models.POI.source == raw["source"], models.POI.external_id == raw["external_id"])
        .first()
    )
    if poi:
        return poi

    poi = models.POI(**raw)
    db.add(poi)
    db.flush()
    return poi


def link_station_poi(db, station: models.Station, poi: models.POI):
    exists = (
        db.query(models.StationPOI)
        .filter(models.StationPOI.station_id == station.id, models.StationPOI.poi_id == poi.id)
        .first()
    )
    if exists:
        return
    distance_m = haversine_m(station.lat, station.lng, poi.lat, poi.lng)
    db.add(models.StationPOI(station_id=station.id, poi_id=poi.id, distance_m=distance_m))


def run():
    db = SessionLocal()
    try:
        stations = db.query(models.Station).all()
        if not stations:
            print("정류장이 없습니다. 먼저 python -m app.etl.seed_stations 실행하세요.")
            return

        for station in stations:
            print(f"[{station.name}] POI 수집 중...")

            for category in ("FOOD", "CAFE", "ATTRACTION"):
                try:
                    raws = overpass_client.search_category_expanding(category, station.lat, station.lng)
                    print(f"  OSM({category}): {len(raws)}건")
                    for raw in raws:
                        poi = upsert_poi(db, raw)
                        link_station_poi(db, station, poi)
                except Exception as e:
                    print(f"  OSM({category}) 실패: {e}")
                time.sleep(OSM_REQUEST_DELAY_SEC)

            for category in ("FOOD", "CAFE", "ATTRACTION"):
                try:
                    raws = kakao_client.search_category(category, station.lat, station.lng, DEFAULT_RADIUS_M)
                except RuntimeError as e:
                    print(f"  카카오 스킵: {e}")
                    break
                for raw in raws:
                    poi = upsert_poi(db, raw)
                    link_station_poi(db, station, poi)

            try:
                raws = tourapi_client.location_based_list(station.lat, station.lng, DEFAULT_RADIUS_M)
                for raw in raws:
                    poi = upsert_poi(db, raw)
                    link_station_poi(db, station, poi)
            except RuntimeError as e:
                print(f"  TourAPI 스킵: {e}")

            db.commit()

        print("ETL 완료")
    finally:
        db.close()


if __name__ == "__main__":
    run()
