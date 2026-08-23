"""
OpenStreetMap Overpass API 클라이언트 — API 키/가입/결제수단 등록이 전혀 필요 없는
완전 무료 POI 검색. 카카오/네이버와 달리 즉시 쓸 수 있지만, 대신 공개 인스턴스라
과도한 요청 시 일시 차단될 수 있어 호출 사이에 약간의 지연을 둔다.

https://wiki.openstreetmap.org/wiki/Overpass_API
"""

import time

import httpx

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Overpass 공개 인스턴스는 식별용 User-Agent가 없는 요청(기본 httpx UA 등)을 406으로 거부한다.
HEADERS = {"User-Agent": "DaejeonTramApp/1.0 (student-hackathon-project)"}

CATEGORY_FILTER = {
    "FOOD": '"amenity"="restaurant"',
    "CAFE": '"amenity"="cafe"',
    "ATTRACTION": '"tourism"~"attraction|museum|gallery|viewpoint|artwork"',
}


def search_category(category: str, lat: float, lng: float, radius: int = 800):
    tag_filter = CATEGORY_FILTER[category]
    query = f'[out:json][timeout:25];node(around:{radius},{lat},{lng})[{tag_filter}];out;'

    with httpx.Client(timeout=30, headers=HEADERS) as client:
        resp = client.post(OVERPASS_URL, data=query)
        resp.raise_for_status()
        data = resp.json()

    results = []
    for el in data.get("elements", []):
        tags = el.get("tags", {})
        name = tags.get("name:ko") or tags.get("name")
        if not name:
            continue
        results.append(
            {
                "external_id": str(el["id"]),
                "name": name,
                "category": category,
                "lat": el["lat"],
                "lng": el["lon"],
                "source": "osm",
                "rating": None,
                "image_url": None,
            }
        )
    return results


def search_category_expanding(category: str, lat: float, lng: float, radii=(800, 1500, 2500), min_results: int = 3):
    """
    좁은 반경에서 결과가 부족하면 자동으로 더 넓은 반경으로 재검색한다.
    정류장 좌표가 추정치라 실제 상권과 다소 어긋난 곳도 있어, 반경을 단계적으로
    넓혀 실제 데이터를 못 찾는 정류장을 줄인다.
    """
    last_results = []
    for i, radius in enumerate(radii):
        if i > 0:
            time.sleep(1.5)
        results = search_category(category, lat, lng, radius)
        last_results = results
        if len(results) >= min_results:
            return results
    return last_results
