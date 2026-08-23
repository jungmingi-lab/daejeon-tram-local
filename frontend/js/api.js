const API_BASE = "http://localhost:8000";

async function fetchStations() {
  const res = await fetch(`${API_BASE}/stations`);
  return res.json();
}

async function fetchRecommendations(stationId, category) {
  const url = new URL(`${API_BASE}/stations/${stationId}/recommendations`);
  if (category) url.searchParams.set("category", category);
  const res = await fetch(url);
  return res.json();
}

async function fetchPoi(poiId) {
  const res = await fetch(`${API_BASE}/pois/${poiId}`);
  return res.json();
}

async function fetchReviews(poiId) {
  const res = await fetch(`${API_BASE}/pois/${poiId}/reviews`);
  return res.json();
}

async function submitReview(poiId, userId, rating, content) {
  const res = await fetch(`${API_BASE}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ poi_id: poiId, user_id: userId, rating, content }),
  });
  return res.json();
}

async function registerUser(email, password) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "회원가입 실패");
  return data;
}

async function loginUser(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "로그인 실패");
  return data;
}

async function redeemCoupon(partnerId) {
  const res = await fetch(`${API_BASE}/coupons/${partnerId}/redeem`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "쿠폰 인증 실패");
  return data;
}

async function fetchMyRedemptions() {
  const res = await fetch(`${API_BASE}/me/redemptions`, {
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "스탬프 목록을 불러오지 못했습니다");
  return data;
}

async function fetchPartnerDirectory() {
  const res = await fetch(`${API_BASE}/coupons/partners`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "제휴 매장 목록을 불러오지 못했습니다");
  return data;
}

async function fetchMyCourse() {
  const res = await fetch(`${API_BASE}/me/course`, {
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "코스를 불러오지 못했습니다");
  return data;
}

async function addToMyCourse(poiId) {
  const res = await fetch(`${API_BASE}/me/course`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify({ poi_id: poiId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "코스에 담지 못했습니다");
  return data;
}

async function removeFromMyCourse(itemId) {
  const res = await fetch(`${API_BASE}/me/course/${itemId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "삭제하지 못했습니다");
  return data;
}
