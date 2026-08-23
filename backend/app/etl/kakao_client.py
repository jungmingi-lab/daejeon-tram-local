"""
카카오로컬 API 클라이언트.
문서: https://developers.kakao.com/docs/latest/ko/local/dev-guide
REST API 키 발급 후 .env의 KAKAO_REST_API_KEY에 설정.
"""

import httpx

from ..config import KAKAO_REST_API_KEY

BASE_URL = "https://dapi.kakao.com/v2/local/search/category.json"

CATEGORY_MAP = {
    "FOOD": "FD6",
    "CAFE": "CE7",
    "ATTRACTION": "AT4",
}


def search_category(category: str, lat: float, lng: float, radius: int = 800):
    if not KAKAO_REST_API_KEY:
        raise RuntimeError("KAKAO_REST_API_KEY가 설정되지 않았습니다 (.env 확인)")

    group_code = CATEGORY_MAP[category]
    headers = {"Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"}
    params = {
        "category_group_code": group_code,
        "x": lng,
        "y": lat,
        "radius": radius,
        "sort": "distance",
    }

    results = []
    page = 1
    with httpx.Client(timeout=10) as client:
        while True:
            params["page"] = page
            resp = client.get(BASE_URL, headers=headers, params=params)
            resp.raise_for_status()
            data = resp.json()
            for doc in data.get("documents", []):
                results.append(
                    {
                        "external_id": doc["id"],
                        "name": doc["place_name"],
                        "category": category,
                        "lat": float(doc["y"]),
                        "lng": float(doc["x"]),
                        "source": "kakao",
                        "rating": None,
                        "image_url": None,
                    }
                )
            if data.get("meta", {}).get("is_end", True):
                break
            page += 1
    return results
