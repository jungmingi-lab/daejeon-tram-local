const state = {
  currentStationId: null,
  currentCategory: "",
  currentPoiId: null,
};

const CAROUSEL_SLIDES = [
  {
    label: "트램",
    desc: "노선 지도로 정류장 둘러보기",
    color: "#1e3a8a",
    action: () => document.getElementById("map-overview").scrollIntoView({ behavior: "smooth" }),
  },
  {
    label: "맛집·카페",
    desc: "정류장 근처 로컬 맛집 찾기",
    color: "#e4572e",
    action: () => document.getElementById("map-overview").scrollIntoView({ behavior: "smooth" }),
  },
  {
    label: "관광지",
    desc: "대전 구석구석 관광 스팟",
    color: "#1b998b",
    action: () => document.getElementById("map-overview").scrollIntoView({ behavior: "smooth" }),
  },
  {
    label: "쿠폰 혜택",
    desc: "트램 이용자 전용 할인",
    color: "#c9820a",
    action: () => {
      setActiveNavTab("coupon");
      show("coupon-view");
      renderCouponView();
    },
  },
];

let carouselIndex = 0;
let carouselTimer = null;
let carouselPlaying = true;

function renderCarousel() {
  const track = document.getElementById("carousel-track");
  track.innerHTML = "";
  CAROUSEL_SLIDES.forEach((slide) => {
    const el = document.createElement("div");
    el.className = "carousel-slide";
    el.style.background = slide.color;
    el.innerHTML = `<span class="carousel-slide-label">${slide.label}</span><span class="carousel-slide-desc">${slide.desc}</span>`;
    el.addEventListener("click", slide.action);
    track.appendChild(el);
  });
  updateCarouselPosition();
}

function updateCarouselPosition() {
  document.getElementById("carousel-track").style.transform = `translateX(-${carouselIndex * 100}%)`;
  document.getElementById("carousel-counter").textContent = `${carouselIndex + 1}/${CAROUSEL_SLIDES.length}`;
}

function carouselGo(delta) {
  carouselIndex = (carouselIndex + delta + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length;
  updateCarouselPosition();
}

function startCarouselAutoplay() {
  stopCarouselAutoplay();
  carouselTimer = setInterval(() => carouselGo(1), 4000);
}

function stopCarouselAutoplay() {
  if (carouselTimer) clearInterval(carouselTimer);
  carouselTimer = null;
}

function getUserId() {
  let id = localStorage.getItem("tram_user_id");
  if (!id) {
    id = "user-" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("tram_user_id", id);
  }
  return id;
}

function isLoggedIn() {
  return !!localStorage.getItem("auth_token");
}

function getAuthToken() {
  return localStorage.getItem("auth_token");
}

function setAuth(token, email) {
  localStorage.setItem("auth_token", token);
  localStorage.setItem("auth_email", email);
}

function clearAuth() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_email");
}

function show(viewId) {
  document.querySelectorAll("main > section").forEach((el) => el.classList.add("hidden"));
  document.getElementById(viewId).classList.remove("hidden");
}

const DISTRICT_ORDER = ["동구", "중구", "서구", "유성구", "대덕구"];
const DISTRICT_COLOR_VAR = {
  동구: "--district-동구",
  중구: "--district-중구",
  서구: "--district-서구",
  유성구: "--district-유성구",
  대덕구: "--district-대덕구",
};
const DISTRICT_INITIAL = {
  동구: "동",
  중구: "중",
  서구: "서",
  유성구: "유",
  대덕구: "대",
};

let stationsByDistrict = new Map();
let leafletReady = false;
let leafletMap = null;

function districtColorVar(district) {
  return `var(${DISTRICT_COLOR_VAR[district]})`;
}

function initLeafletIfAvailable() {
  return typeof L !== "undefined" && !!L.map;
}

function buildStationRow(station) {
  const li = document.createElement("li");
  li.className = "station-item";
  li.innerHTML = `
    <span class="station-dot" style="background:${districtColorVar(station.district)}"></span>
    <span class="station-name">${station.name}${station.segment !== "본선" ? ` (${station.segment})` : ""}</span>
    <span class="station-order">${String(station.line_order).padStart(2, "0")}</span>
  `;
  li.addEventListener("click", () => openStation(station));
  return li;
}

async function renderStationList() {
  try {
    const stations = await fetchStations();

    stationsByDistrict = new Map();
    stations.forEach((station) => {
      if (!stationsByDistrict.has(station.district)) stationsByDistrict.set(station.district, []);
      stationsByDistrict.get(station.district).push(station);
    });

    leafletReady = initLeafletIfAvailable();
    if (leafletReady) {
      try {
        renderLeafletMap(stations);
      } catch (e) {
        console.error("지도 렌더링 실패, SVG로 대체:", e);
        leafletReady = false;
        document.getElementById("leaflet-map").classList.add("hidden");
        document.getElementById("route-svg").classList.remove("hidden");
        renderRouteMap(stations);
      }
    } else {
      renderRouteMap(stations);
    }
    renderDistrictLegend();
    backToOverview();
  } catch (e) {
    console.error("정류장 목록 로딩 실패:", e);
  }
}

let markerRegistry = [];

function renderLeafletMap(stations) {
  document.getElementById("route-svg").classList.add("hidden");
  const container = document.getElementById("leaflet-map");
  container.classList.remove("hidden");

  if (!leafletMap) {
    leafletMap = L.map(container).setView([36.35, 127.38], 12);
    L.maplibreGL({
      style: "https://tiles.openfreemap.org/styles/liberty",
      attribution: "&copy; OpenFreeMap &copy; OpenMapTiles &copy; OpenStreetMap contributors",
    }).addTo(leafletMap);
    addLocateControl(leafletMap);
    renderRouteLines(stations);
  }

  markerRegistry = [];
  stations.forEach((station) => {
    const icon = L.divIcon({
      className: "",
      html: `<div class="map-marker" style="background:${districtColorVar(station.district)}"></div>`,
      iconSize: [16, 16],
    });
    const marker = L.marker([station.lat, station.lng], { icon })
      .addTo(leafletMap)
      .bindTooltip(station.name, {
        permanent: true,
        direction: "top",
        offset: [0, -8],
        className: "station-tooltip",
      })
      .on("click", () => openStation(station));

    const tooltipEl = marker.getTooltip().getElement();
    if (tooltipEl) tooltipEl.style.display = "none";

    markerRegistry.push({ district: station.district, marker });
  });
}

function resolvedColor(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function squaredDistance(a, b) {
  const dLat = a.lat - b.lat;
  const dLng = a.lng - b.lng;
  return dLat * dLat + dLng * dLng;
}

function renderRouteLines(stations) {
  const color = resolvedColor("--primary");

  const mainStations = stations.filter((s) => s.segment === "본선").sort((a, b) => a.line_order - b.line_order);
  if (mainStations.length > 1) {
    const coords = mainStations.map((s) => [s.lat, s.lng]);
    coords.push(coords[0]); // 순환선 루프 닫기
    L.polyline(coords, { color, weight: 3, opacity: 0.55 }).addTo(leafletMap);
  }

  ["연축지선", "진잠지선"].forEach((segment) => {
    const branchStations = stations
      .filter((s) => s.segment === segment)
      .sort((a, b) => a.line_order - b.line_order);
    if (branchStations.length === 0) return;

    let nearest = null;
    let nearestDist = Infinity;
    mainStations.forEach((s) => {
      const d = squaredDistance(s, branchStations[0]);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = s;
      }
    });

    const coords = [];
    if (nearest) coords.push([nearest.lat, nearest.lng]);
    branchStations.forEach((s) => coords.push([s.lat, s.lng]));

    L.polyline(coords, { color, weight: 3, opacity: 0.55, dashArray: "6 6" }).addTo(leafletMap);
  });
}

function focusDistrictOnMap(district) {
  const stations = stationsByDistrict.get(district);
  if (!stations || !leafletMap) return;

  const bounds = L.latLngBounds(stations.map((s) => [s.lat, s.lng]));
  const fitZoom = leafletMap.getBoundsZoom(bounds, false, [30, 30]);
  leafletMap.flyTo(bounds.getCenter(), fitZoom, { duration: 0.8 });

  markerRegistry.forEach(({ district: markerDistrict, marker }) => {
    const tooltipEl = marker.getTooltip()?.getElement();
    if (tooltipEl) tooltipEl.style.display = markerDistrict === district ? "block" : "none";
  });
}

const LOCATE_ICON_SVG =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v3M12 19v3M2 12h3M19 12h3"></path></svg>';

let locateWatchId = null;
let userLocationMarker = null;
let userAccuracyCircle = null;

function addLocateControl(map) {
  const LocateControl = L.Control.extend({
    options: { position: "bottomright" },
    onAdd() {
      const button = L.DomUtil.create("button", "locate-button");
      button.type = "button";
      button.title = "내 위치";
      button.innerHTML = LOCATE_ICON_SVG;
      L.DomEvent.disableClickPropagation(button);
      button.addEventListener("click", () => toggleLocateTracking(button));
      return button;
    },
  });
  new LocateControl().addTo(map);
}

function toggleLocateTracking(button) {
  if (locateWatchId !== null) {
    stopLocateTracking(button);
    return;
  }
  if (!navigator.geolocation) {
    alert("이 브라우저는 위치 정보를 지원하지 않습니다");
    return;
  }
  button.classList.add("active");
  locateWatchId = navigator.geolocation.watchPosition(
    (position) => handleLocationUpdate(position),
    (error) => {
      console.error("위치 정보 오류:", error);
      alert("위치 정보를 가져올 수 없습니다: " + error.message);
      stopLocateTracking(button);
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
  );
}

function stopLocateTracking(button) {
  if (locateWatchId !== null) {
    navigator.geolocation.clearWatch(locateWatchId);
    locateWatchId = null;
  }
  button.classList.remove("active");
}

function handleLocationUpdate(position) {
  if (!leafletMap) return;
  const { latitude, longitude, accuracy } = position.coords;
  const latlng = [latitude, longitude];

  if (!userLocationMarker) {
    const icon = L.divIcon({
      className: "",
      html: '<div class="user-location-dot"></div>',
      iconSize: [16, 16],
    });
    userLocationMarker = L.marker(latlng, { icon, zIndexOffset: 1000 }).addTo(leafletMap);
    userAccuracyCircle = L.circle(latlng, {
      radius: accuracy,
      color: "#1e3a8a",
      fillColor: "#1e3a8a",
      fillOpacity: 0.12,
      weight: 1,
    }).addTo(leafletMap);
    leafletMap.setView(latlng, 15);
  } else {
    userLocationMarker.setLatLng(latlng);
    userAccuracyCircle.setLatLng(latlng);
    userAccuracyCircle.setRadius(accuracy);
  }
}

function renderRouteMap(stations) {
  const svg = document.getElementById("route-svg");
  const cx = 160;
  const cy = 160;
  const r = 128;
  const n = stations.length;

  const track = `<circle class="route-track" cx="${cx}" cy="${cy}" r="${r}"></circle>`;

  const dots = stations
    .map((station, i) => {
      const angle = -90 + (360 * i) / n;
      const rad = (angle * Math.PI) / 180;
      const x = (cx + r * Math.cos(rad)).toFixed(1);
      const y = (cy + r * Math.sin(rad)).toFixed(1);
      return `<circle class="route-dot" cx="${x}" cy="${y}" r="5" fill="${districtColorVar(
        station.district
      )}" data-district="${station.district}"></circle>`;
    })
    .join("");

  svg.innerHTML = track + dots;

  svg.querySelectorAll(".route-dot").forEach((dot) => {
    dot.addEventListener("click", () => zoomToDistrict(dot.dataset.district));
  });
}

function renderDistrictLegend() {
  const districts = [...stationsByDistrict.keys()].sort(
    (a, b) => DISTRICT_ORDER.indexOf(a) - DISTRICT_ORDER.indexOf(b)
  );

  const legend = document.getElementById("district-legend");
  legend.innerHTML = "";
  districts.forEach((district, i) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "legend-chip" + (i === 0 ? " active" : "");
    chip.innerHTML = `
      <span class="district-badge" style="background:${districtColorVar(district)}">${DISTRICT_INITIAL[district]}</span>
      <span class="district-name">${district}</span>
    `;
    chip.addEventListener("click", () => {
      document.querySelectorAll(".legend-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      if (leafletReady) {
        focusDistrictOnMap(district);
      } else {
        zoomToDistrict(district);
      }
    });
    legend.appendChild(chip);
  });
}

function zoomToDistrict(district) {
  const stations = stationsByDistrict.get(district);
  if (!stations) return;

  document.getElementById("detail-heading").innerHTML = `
    <span class="district-label">
      <span class="district-badge" style="background:${districtColorVar(district)}">${DISTRICT_INITIAL[district]}</span>
      <span class="district-name">${district}</span>
    </span>
    <span class="district-toggle-label">${String(stations.length).padStart(2, "0")}</span>
  `;

  const list = document.getElementById("detail-station-list");
  list.innerHTML = "";
  stations.forEach((station) => list.appendChild(buildStationRow(station)));

  document.getElementById("map-overview").classList.add("hidden");
  document.getElementById("map-detail").classList.remove("hidden");
}

function backToOverview() {
  document.getElementById("map-detail").classList.add("hidden");
  document.getElementById("map-overview").classList.remove("hidden");
}

document.getElementById("map-back-button").addEventListener("click", backToOverview);

async function openStation(station) {
  state.currentStationId = station.id;
  state.currentCategory = "";
  document.getElementById("station-title").textContent = `${station.district} · ${station.name} 주변 추천`;
  document
    .querySelectorAll(".filter-bar button")
    .forEach((b) => b.classList.toggle("active", b.dataset.category === ""));

  const section = document.getElementById("recommendation-section");
  section.classList.remove("hidden");
  await renderRecommendations();
  section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function ratingLabel(poi) {
  if (poi.review_avg_rating) {
    return `★${poi.review_avg_rating} (${poi.review_count})`;
  }
  if (poi.rating) {
    return `★${poi.rating}`;
  }
  return null;
}

async function renderRecommendations() {
  const pois = await fetchRecommendations(state.currentStationId, state.currentCategory);
  const list = document.getElementById("poi-list");
  list.innerHTML = "";
  pois.forEach((poi) => {
    const li = document.createElement("li");
    li.className = "poi-item" + (poi.is_partner ? " partner" : "");
    const rating = ratingLabel(poi);
    li.innerHTML = `
      <span class="poi-name">${poi.is_partner ? "🎟️ " : ""}${poi.name}</span>
      <span class="poi-meta">${poi.category} · ${Math.round(poi.distance_m)}m${rating ? " · " + rating : ""}</span>
    `;
    li.addEventListener("click", () => openPoiDetail(poi.id));
    list.appendChild(li);
  });
}

async function openPoiDetail(poiId) {
  state.currentPoiId = poiId;
  const poi = await fetchPoi(poiId);
  const detail = document.getElementById("poi-detail");

  detail.innerHTML = `
    <h2>${poi.name}</h2>
    <p>${poi.category} · ${ratingLabel(poi) || "아직 평점 없음"}</p>
  `;

  if (poi.partner) {
    renderCouponBox(detail, poi.partner);
  }

  renderCourseAction(poiId);

  await renderReviews(poiId);
  show("poi-detail-view");
}

function renderCourseAction(poiId) {
  const container = document.getElementById("poi-course-action");
  container.innerHTML = "";

  const button = document.createElement("button");
  button.className = "hero-action-button outline course-add-button";
  button.type = "button";
  button.textContent = "+ 코스에 담기";
  button.addEventListener("click", async () => {
    if (!isLoggedIn()) {
      alert("로그인 후 코스에 담을 수 있어요. 마이페이지에서 먼저 로그인해주세요.");
      return;
    }
    try {
      await addToMyCourse(poiId);
      button.textContent = "✓ 코스에 담김";
      button.disabled = true;
    } catch (e) {
      alert(e.message);
    }
  });
  container.appendChild(button);
}

function renderAuthForm(container, onSuccess) {
  const form = document.createElement("div");
  form.className = "auth-form";
  form.innerHTML = `
    <input id="auth-email" type="email" placeholder="이메일" />
    <input id="auth-password" type="password" placeholder="비밀번호" />
    <div class="auth-buttons">
      <button id="login-button">로그인</button>
      <button id="register-button">회원가입</button>
    </div>
  `;
  container.appendChild(form);

  const readInputs = () => ({
    email: document.getElementById("auth-email").value,
    password: document.getElementById("auth-password").value,
  });

  document.getElementById("login-button").addEventListener("click", async () => {
    const { email, password } = readInputs();
    try {
      const result = await loginUser(email, password);
      setAuth(result.token, result.email);
      onSuccess();
    } catch (e) {
      alert(e.message);
    }
  });

  document.getElementById("register-button").addEventListener("click", async () => {
    const { email, password } = readInputs();
    try {
      const result = await registerUser(email, password);
      setAuth(result.token, result.email);
      onSuccess();
    } catch (e) {
      alert(e.message);
    }
  });
}

function renderCouponBox(container, partner) {
  const box = document.createElement("div");
  box.className = "coupon-box";

  if (!isLoggedIn()) {
    box.innerHTML = `
      <span class="coupon-tag">COUPON</span>
      <p>${partner.discount_info}</p>
      <p class="coupon-note">쿠폰 인증은 회원가입/로그인 후 이용할 수 있어요</p>
    `;
    container.appendChild(box);
    renderAuthForm(box, () => openPoiDetail(state.currentPoiId));
  } else {
    box.innerHTML = `
      <span class="coupon-tag">COUPON</span>
      <p>${partner.discount_info}</p>
      <p class="coupon-note">${localStorage.getItem("auth_email")}님으로 로그인됨 · <a href="#" id="logout-link">로그아웃</a></p>
      <button id="redeem-button">쿠폰 원클릭 인증</button>
    `;
    container.appendChild(box);

    document.getElementById("redeem-button").addEventListener("click", async () => {
      try {
        const result = await redeemCoupon(partner.id);
        box.classList.add("redeemed");
        setTimeout(() => box.classList.remove("redeemed"), 700);
        alert(`인증 완료: ${result.discount_info}`);
      } catch (e) {
        alert(e.message);
      }
    });

    document.getElementById("logout-link").addEventListener("click", (e) => {
      e.preventDefault();
      clearAuth();
      openPoiDetail(state.currentPoiId);
    });
  }
}

async function renderReviews(poiId) {
  const reviews = await fetchReviews(poiId);
  const list = document.getElementById("review-list");
  list.innerHTML = "";
  reviews.forEach((review) => {
    const li = document.createElement("li");
    li.textContent = `${"★".repeat(review.rating)} ${review.content ?? ""}`;
    list.appendChild(li);
  });
}

document.getElementById("detail-back-button").addEventListener("click", () => show("station-list-view"));

document.querySelectorAll(".filter-bar button").forEach((button) => {
  button.addEventListener("click", () => {
    state.currentCategory = button.dataset.category;
    document.querySelectorAll(".filter-bar button").forEach((b) => b.classList.toggle("active", b === button));
    renderRecommendations();
  });
});
document.querySelector(".filter-bar button").classList.add("active");

document.getElementById("review-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const rating = Number(document.getElementById("review-rating").value);
  const content = document.getElementById("review-content").value;
  await submitReview(state.currentPoiId, getUserId(), rating, content);
  document.getElementById("review-content").value = "";
  await renderReviews(state.currentPoiId);
});

async function renderCouponView() {
  const content = document.getElementById("coupon-content");
  content.innerHTML = "";

  if (!isLoggedIn()) {
    const note = document.createElement("p");
    note.className = "coupon-note";
    note.textContent = "로그인하면 쿠폰을 사용할 때마다 스탬프가 쌓여요";
    content.appendChild(note);
    renderAuthForm(content, renderCouponView);
    return;
  }

  try {
    const redemptions = await fetchMyRedemptions();

    if (redemptions.length === 0) {
      content.innerHTML = `<p class="coupon-note">아직 모은 스탬프가 없어요. 제휴 매장에서 쿠폰을 사용해보세요!</p>`;
      return;
    }

    const summary = document.createElement("p");
    summary.className = "stamp-summary";
    summary.textContent = `총 ${redemptions.length}개의 스탬프를 모았어요`;
    content.appendChild(summary);

    const grid = document.createElement("div");
    grid.className = "stamp-grid";
    redemptions.forEach((r) => {
      const card = document.createElement("div");
      card.className = "stamp-card";
      const date = new Date(r.redeemed_at).toLocaleDateString("ko-KR");
      card.innerHTML = `
        <span class="stamp-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 13l2.5 2.5L16 10"/></svg>
        </span>
        <span class="stamp-name">${r.poi_name}</span>
        <span class="stamp-meta">${r.discount_info}</span>
        <span class="stamp-date">${date}</span>
      `;
      grid.appendChild(card);
    });
    content.appendChild(grid);
  } catch (e) {
    content.innerHTML = `<p class="coupon-note">스탬프 목록을 불러오지 못했습니다: ${e.message}</p>`;
  }
}

function renderProfileView() {
  const content = document.getElementById("profile-content");
  content.innerHTML = "";

  if (!isLoggedIn()) {
    const note = document.createElement("p");
    note.className = "coupon-note";
    note.textContent = "로그인하고 쿠폰·스탬프를 관리해보세요";
    content.appendChild(note);
    renderAuthForm(content, renderProfileView);
    return;
  }

  const card = document.createElement("div");
  card.className = "profile-card";
  card.innerHTML = `
    <div class="profile-avatar">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>
    </div>
    <div class="profile-email">${localStorage.getItem("auth_email")}</div>
    <button id="profile-logout-button">로그아웃</button>
  `;
  content.appendChild(card);

  document.getElementById("profile-logout-button").addEventListener("click", () => {
    clearAuth();
    renderProfileView();
  });
}

function renderContentView() {
  const list = document.getElementById("content-list");
  const articles = [
    {
      title: "대전역 → 성심당, 그다음은?",
      body: "성심당만 들르고 떠나는 당일치기 대신, 트램 정류장을 따라 골목 상권까지 이어가는 동선을 소개해요.",
    },
    {
      title: "트램 타고 만나는 대전 5개 구",
      body: "동구·중구·서구·유성구·대덕구 — 각 구마다 다른 매력을 트램 노선 순서대로 둘러보는 법.",
    },
    {
      title: "제휴 매장 쿠폰, 이렇게 쓰세요",
      body: "회원가입 후 정류장 근처 제휴 매장에서 원클릭으로 할인 받는 방법을 안내해드려요.",
    },
  ];
  list.innerHTML = "";
  articles.forEach((a) => {
    const card = document.createElement("div");
    card.className = "content-card";
    card.innerHTML = `<h3>${a.title}</h3><p>${a.body}</p>`;
    list.appendChild(card);
  });
}

function renderReserveView() {
  const content = document.getElementById("reserve-content");
  fetchPartnerDirectory()
    .then((partners) => {
      content.innerHTML = "";
      if (partners.length === 0) {
        content.innerHTML = `<p class="coupon-note">현재 예약 가능한 제휴 매장이 없어요</p>`;
        return;
      }
      partners.forEach((p) => {
        const card = document.createElement("div");
        card.className = "reserve-card";
        card.innerHTML = `
          <span class="poi-name">${p.poi_name}</span>
          <span class="poi-meta">${p.discount_info}</span>
          ${
            p.reservation_url
              ? `<a class="hero-action-button" href="${p.reservation_url}" target="_blank" rel="noopener">공식 사이트에서 예약/문의</a>`
              : `<p class="coupon-note">등록된 예약 링크가 없어요</p>`
          }
        `;
        content.appendChild(card);
      });
    })
    .catch((e) => {
      content.innerHTML = `<p class="coupon-note">불러오지 못했습니다: ${e.message}</p>`;
    });
}

async function renderCourseView() {
  const content = document.getElementById("course-content");
  content.innerHTML = "";

  if (!isLoggedIn()) {
    const note = document.createElement("p");
    note.className = "coupon-note";
    note.textContent = "로그인하고 나만의 코스를 만들어보세요";
    content.appendChild(note);
    renderAuthForm(content, renderCourseView);
    return;
  }

  try {
    const items = await fetchMyCourse();
    if (items.length === 0) {
      content.innerHTML = `<p class="coupon-note">아직 담은 장소가 없어요. 추천 리스트에서 "코스에 담기"를 눌러보세요!</p>`;
      return;
    }
    const list = document.createElement("ul");
    items.forEach((item) => {
      const li = document.createElement("li");
      li.className = "course-item";
      li.innerHTML = `
        <span class="poi-name">${item.poi_name}</span>
        <span class="poi-meta">${item.poi_category}</span>
        <button class="course-remove-button" data-id="${item.id}">삭제</button>
      `;
      li.querySelector(".course-remove-button").addEventListener("click", async () => {
        await removeFromMyCourse(item.id);
        renderCourseView();
      });
      list.appendChild(li);
    });
    content.appendChild(list);
  } catch (e) {
    content.innerHTML = `<p class="coupon-note">불러오지 못했습니다: ${e.message}</p>`;
  }
}

document.getElementById("reserve-button").addEventListener("click", () => {
  show("reserve-view");
  renderReserveView();
});
document.getElementById("reserve-back-button").addEventListener("click", () => show("station-list-view"));

document.getElementById("plan-button").addEventListener("click", () => {
  show("course-view");
  renderCourseView();
});
document.getElementById("course-back-button").addEventListener("click", () => show("station-list-view"));

document.getElementById("notify-button").addEventListener("click", () => alert("알림 기능은 준비 중이에요"));
document.getElementById("menu-button").addEventListener("click", () => alert("메뉴는 준비 중이에요"));

function setActiveNavTab(tab) {
  document.querySelectorAll(".nav-item").forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tab));
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    const tab = button.dataset.tab;
    setActiveNavTab(tab);
    if (tab === "home") {
      show("station-list-view");
    } else if (tab === "tram") {
      show("station-list-view");
      document.getElementById("map-overview").scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (tab === "coupon") {
      show("coupon-view");
      renderCouponView();
    } else if (tab === "content") {
      show("content-view");
      renderContentView();
    } else if (tab === "profile") {
      show("profile-view");
      renderProfileView();
    }
  });
});

document.getElementById("carousel-prev").addEventListener("click", () => carouselGo(-1));
document.getElementById("carousel-next").addEventListener("click", () => carouselGo(1));
document.getElementById("carousel-playpause").addEventListener("click", () => {
  carouselPlaying = !carouselPlaying;
  document.getElementById("carousel-play-icon").classList.toggle("hidden", carouselPlaying);
  document.getElementById("carousel-pause-icon").classList.toggle("hidden", !carouselPlaying);
  if (carouselPlaying) {
    startCarouselAutoplay();
  } else {
    stopCarouselAutoplay();
  }
});

renderCarousel();
startCarouselAutoplay();

renderStationList();
