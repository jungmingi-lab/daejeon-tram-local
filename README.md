# application/

대전 트램 로컬 큐레이션 앱 — 개발 폴더 (2026 로컬 국토대장정 HERO 4기, 대전대 DwT팀)

- `PIPELINE.md` — 전체 아키텍처/개발 파이프라인 문서
- `backend/` — FastAPI 서버 + ETL 스크립트 (카카오로컬/TourAPI 연동)
- `frontend/` — 바닐라 JS 정적 웹앱 (PWA 지향 MVP)
- `db/schema.sql` — 참고용 DDL (Postgres 이관 시 사용)

## 빠른 시작 (데모, API 키 없이 전체 플로우 테스트)
```bash
cd backend
pip install -r requirements.txt
copy .env.example .env
python -m app.etl.seed_stations
python -m app.etl.seed_demo_data
uvicorn app.main:app --reload
```
그다음 `frontend/index.html`을 VSCode Live Server 등으로 열면
정류장 선택 → 주변 추천 → 쿠폰 원클릭 인증 → 리뷰 작성까지 전체 플로우를
API 키 없이 확인할 수 있습니다. (`GET /docs`에서 API 스펙도 바로 확인 가능)

## 실제 데이터 연동
1. 카카오 디벨로퍼스에서 REST API 키 발급 → `backend/.env`의 `KAKAO_REST_API_KEY`
2. 공공데이터포털에서 TourAPI 4.0 서비스키 발급 → `backend/.env`의 `TOURAPI_SERVICE_KEY`
3. `python -m app.etl.run_etl` 실행 (정류장별 반경 내 실제 POI 수집 → DB 적재)

## 주의
- `backend/app/etl/seed_stations.py`의 정류장 좌표는 **PLACEHOLDER**입니다.
  대전시/대전교통공사의 공식 정류장 명칭·좌표가 발표되면 반드시 교체해야 합니다.
- 지도(카카오맵 JS SDK) 연동은 아직 미포함 — `frontend/README.md` 참고.
