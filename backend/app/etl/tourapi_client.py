"""
한국관광공사 TourAPI 클라이언트 (위치기반 관광정보 조회).
공공데이터포털(data.go.kr)에서 TourAPI 4.0 서비스키 발급 후
.env의 TOURAPI_SERVICE_KEY에 설정.

주의: TourAPI는 버전에 따라 엔드포인트/파라미터명이 바뀔 수 있으므로
실제 사용 전 공공데이터포털에서 최신 명세를 확인해 BASE_URL을 맞출 것.
"""

import httpx

from ..config import TOURAPI_SERVICE_KEY

BASE_URL = "https://apis.data.go.kr/B551011/KorService2/locationBasedList2"


def location_based_list(lat: float, lng: float, radius: int = 800):
    if not TOURAPI_SERVICE_KEY:
        raise RuntimeError("TOURAPI_SERVICE_KEY가 설정되지 않았습니다 (.env 확인)")

    params = {
        "serviceKey": TOURAPI_SERVICE_KEY,
        "MobileOS": "ETC",
        "MobileApp": "DaejeonTramApp",
        "mapX": lng,
        "mapY": lat,
        "radius": radius,
        "contentTypeId": 12,  # 관광지
        "arrange": "E",  # 거리순
        "numOfRows": 20,
        "_type": "json",
    }

    with httpx.Client(timeout=10) as client:
        resp = client.get(BASE_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    items = data.get("response", {}).get("body", {}).get("items", {}).get("item", [])
    if isinstance(items, dict):
        items = [items]

    return [
        {
            "external_id": str(item["contentid"]),
            "name": item["title"],
            "category": "ATTRACTION",
            "lat": float(item["mapy"]),
            "lng": float(item["mapx"]),
            "source": "tourapi",
            "rating": None,
            "image_url": item.get("firstimage") or None,
        }
        for item in items
    ]
