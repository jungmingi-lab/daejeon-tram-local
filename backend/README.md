# Backend (FastAPI)

## 설치
```
pip install -r requirements.txt
cp .env.example .env
```

## 실행 순서 (API 키 없이 바로 테스트)
```
python -m app.etl.seed_stations      # 정류장 시드 (PLACEHOLDER 좌표 — 공식 좌표로 교체 필요)
python -m app.etl.seed_demo_data     # 데모 POI/쿠폰 데이터 (추천→쿠폰인증→리뷰 전체 플로우 테스트 가능)
uvicorn app.main:app --reload        # http://localhost:8000/docs 에서 API 확인
```

## 실제 데이터 연동
1. 카카오 디벨로퍼스에서 REST API 키 발급 → `.env`의 `KAKAO_REST_API_KEY`
2. 공공데이터포털에서 TourAPI 4.0 서비스키 발급 → `.env`의 `TOURAPI_SERVICE_KEY`
3. `python -m app.etl.run_etl` 실행 (정류장별 반경 내 실제 POI 수집)

## 폴더 구조
```
app/
  main.py             FastAPI 앱 진입점
  config.py           환경변수 로딩
  database.py         SQLAlchemy 엔진/세션 (기본 SQLite, DATABASE_URL로 Postgres 전환 가능)
  models.py           ORM 모델 (Station, POI, StationPOI, Partner, CouponRedeem, Review)
  schemas.py          Pydantic 응답 스키마
  routers/            API 라우터 (stations, pois, coupons, reviews)
  services/           geo.py(거리계산), recommendation.py(추천 로직)
  etl/                seed_stations, seed_demo_data, kakao_client, tourapi_client, run_etl
```
