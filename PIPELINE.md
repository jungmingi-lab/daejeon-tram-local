# 대전 트램 관광 추천 앱 — 개발 파이프라인

> 2026 로컬 국토대장정 - HERO 만들기 프로젝트 4기 | 대전대학교 DwT팀
> 대전 2호선 트램 정류장을 중심으로 주변 관광지·맛집·카페를 추천하는 로컬 큐레이션 앱

전제: 대전 트램 2호선은 아직 미개통(공사 중)이라 실시간 운행 API가 없다. 그래서 파이프라인은
**"정적 정류장 데이터로 지금 바로 개발 → 실시간 API는 나중에 꽂아 넣기 쉬운 구조"** 로 설계한다.

---

## 0. 전체 아키텍처 한눈에

```
[공공/외부 API]          [배치 수집기]        [DB]              [백엔드 API]         [프론트엔드]
TourAPI ─────┐
카카오로컬API ├──▶  ETL 스크립트  ──▶  PostgreSQL   ──▶  추천 서비스   ──▶  앱/웹
대전 공공데이터┘      (일 1회 배치)      + PostGIS         (FastAPI)         (지도+리스트+쿠폰)
                                          ▲
                                          │
                              [소상공인 어드민] 제휴/쿠폰 CRUD
```

---

## 1. 데이터 계층

| 데이터 | 소스 | 비고 |
|---|---|---|
| 트램 정류장 좌표(22개소 예정) | 대전시/대전교통공사 발표 자료 수동 입력 → 시드 데이터(seed) | 미개통이라 API 없음. `stations` 테이블에 위경도·노선순서만 고정값으로 넣고 시작 |
| 주변 맛집/카페 | **카카오로컬 API** (카테고리 검색: FD6 음식점, CE7 카페, AT4 관광명소) | 무료 티어, 정류장 좌표 기준 반경(500m~1km) 검색 |
| 관광지 상세정보 | **한국관광공사 TourAPI 4.0** (공공데이터포털) | 위치기반 관광정보 조회(locationBasedList2) |
| 대중교통 보조 데이터 | 대전시 공공데이터포털 (버스정류장 등, 트램 실개통 전 임시 참고) | 추후 트램 실시간 운행정보 개방 시 이 자리에 교체 |
| 제휴/쿠폰 데이터 | 자체 DB (소상공인이 입력) | MVP는 어드민 폼으로 직접 등록 |

**핵심 설계 포인트**: `data_source` 컬럼을 두고 "정적 시드 vs API 실시간"을 구분해두면, 트램 개통 후
실시간 API가 열려도 테이블 구조를 안 바꾸고 소스만 교체 가능.

---

## 2. ETL(수집) 파이프라인

```
1) stations 테이블(정적 시드) 순회
2) 각 정류장 좌표로 카카오로컬 API 반경검색 호출 (카테고리별)
3) TourAPI로 관광지 보강 조회
4) 응답 정규화 (이름/좌표/카테고리/평점/이미지 통일 스키마로 매핑)
5) Haversine 거리 계산 → station_poi 매핑 테이블에 (station_id, poi_id, distance_m) 적재
6) 중복 POI 제거(같은 place가 여러 정류장 반경에 걸치는 경우 처리)
```

- 배치 주기: 1일 1회 cron (POI 정보는 자주 안 바뀜) — Python 스크립트 + `schedule`/cron, 나중에 필요하면
  Airflow로 승격
- 실패 대응: API rate limit 걸릴 경우 재시도 큐(간단히 `retry` 데코레이터로 충분)

---

## 3. DB 스키마 (핵심 테이블)

```
stations        (id, name, lat, lng, line_order, data_source)
pois            (id, name, category, lat, lng, source, rating, image_url, is_partner)
station_poi     (station_id, poi_id, distance_m)
partners        (poi_id FK, discount_info, coupon_code, valid_until)
coupon_redeem   (id, user_id, partner_id, redeemed_at)   -- 원클릭 인증 로그
reviews         (id, poi_id, user_id, rating, content, created_at)
```

- PostgreSQL + **PostGIS** 확장 쓰면 `ST_DWithin` 반경검색을 DB 레벨에서 처리 가능
  (Haversine 직접 계산보다 깔끔)

---

## 4. 백엔드 API (추천 로직)

**Tech stack 추천**: FastAPI(Python) — TourAPI/카카오API 연동 코드 재사용 쉬움, PostGIS와 궁합 좋음

핵심 엔드포인트:

```
GET /stations                          → 트램 노선도용 정류장 리스트
GET /stations/{id}/recommendations     → 해당 정류장 주변 추천 (쿼리: category, sort=distance|partner|rating)
GET /pois/{id}                         → 상세정보 + 쿠폰정보
POST /coupons/{id}/redeem              → 원클릭 인증 (QR/바코드 스캔 시 호출)
POST /reviews                          → 후기 작성
```

**추천 로직 (MVP = 규칙 기반, 나중에 고도화)**

```
1. station_poi에서 해당 정류장 반경 내 POI 조회
2. 필터: 카테고리(선택), 제휴여부
3. 정렬 가중치: is_partner(제휴매장 우선) > distance_m(가까운 순) > rating
4. 상위 N개 반환
```

→ 나중 단계: 사용자 방문/쿠폰사용 로그 쌓이면 컨텍스트 기반(시간대, 날씨, 인기도) 추천으로 고도화

---

## 5. 프론트엔드 플로우

```
트램 노선도 화면 (정거장 아이콘 나열)
   ↓ 정거장 탭
주변 추천 리스트/지도 (카테고리 필터: 맛집/카페/관광지)
   ↓ 장소 탭
상세정보 + 쿠폰 "받기" 버튼
   ↓ 매장 방문 시
QR/바코드 원클릭 인증 → 할인 적용
   ↓
후기 작성 (별점+한줄)
```

- MVP는 반응형 웹앱(PWA)으로 시작 추천 — 네이티브 앱 스토어 심사/배포 없이 성과공유회·실사용
  테스트에 바로 쓸 수 있음
- 지도 표시: 카카오맵 JS SDK (이미 POI 데이터가 카카오로컬 기준이라 좌표계 통일 쉬움)

---

## 6. 소상공인 제휴 파이프라인 (별도 어드민)

```
소상공인 어드민 로그인 → 쿠폰 등록(할인율/기간) → 승인 → 앱에 노출
   ↓
사용자 인증 시 coupon_redeem 로그 적재
   ↓
월간 정산 리포트 자동 생성 (방문수/할인적용건수) → B2B 구독 모델의 "리포트 제공" 근거 데이터
```

---

## 7. 실제 개발 착수 로드맵 (팀 4명 기준 순서)

| Phase | 작업 | 산출물 |
|---|---|---|
| 1 | 정류장 시드 데이터 입력 + 카카오/TourAPI 키 발급 및 테스트 호출 | `stations.json`, API 연동 확인 |
| 2 | ETL 스크립트 작성 → DB(PostgreSQL+PostGIS) 적재 | station_poi 데이터 채워진 DB |
| 3 | FastAPI 추천 엔드포인트 구현 | `/stations/{id}/recommendations` 동작 |
| 4 | 프론트 MVP (노선도 → 리스트 → 상세) | 웹/PWA 화면 3~4개 |
| 5 | 쿠폰 등록/인증 플로우 (하드코딩 QR도 무방) | 어드민 폼 + redeem API |
| 6 | 실사용자 테스트(제주 벤치마킹에서 본 라토커피식 인터뷰 방식 참고) | 피드백 반영 |
