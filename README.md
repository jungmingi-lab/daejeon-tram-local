# Frontend (Vanilla JS MVP)

빌드 도구 없이 바로 열어서 테스트하는 정적 웹앱입니다.

## 실행
1. 백엔드를 먼저 http://localhost:8000 에 띄운다. (backend/README.md 참고)
2. VSCode의 "Live Server" 확장 등으로 `index.html`을 열거나,
   `python -m http.server 5500` 실행 후 http://localhost:5500 접속.

## 화면 흐름
정류장 목록 → 정류장 선택 → 카테고리 필터(맛집/카페/관광지) → 장소 상세
→ (제휴매장이면) 쿠폰 원클릭 인증 → 리뷰 작성/조회

## 참고
- 지도(SDK) 연동은 아직 넣지 않았습니다. 카카오맵 JS 키 발급 후
  `index.html`에
  `<script src="//dapi.kakao.com/v3/maps/js?appkey=YOUR_KEY&libraries=services"></script>`
  를 추가하고 `js/app.js`에 지도 렌더링 로직을 이어붙이면 됩니다.
- `js/api.js`의 `API_BASE`는 배포 시 실제 백엔드 주소로 변경해야 합니다.
