-- 참고용 DDL. 백엔드는 SQLAlchemy가 SQLite/Postgres 모두에 테이블을 자동 생성하므로
-- 이 파일을 직접 실행할 필요는 없습니다. Postgres로 옮길 때 참고용으로 사용하세요.
--
-- Postgres + PostGIS로 이관 시에는 lat/lng 대신 geometry(Point, 4326) 컬럼 +
-- GIST 인덱스 사용을 고려하면 반경검색(ST_DWithin)이 더 빨라집니다.

CREATE TABLE stations (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    line_order INTEGER NOT NULL,
    data_source VARCHAR DEFAULT 'seed_placeholder'
);

CREATE TABLE pois (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    category VARCHAR NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    source VARCHAR NOT NULL,
    rating DOUBLE PRECISION,
    image_url VARCHAR,
    is_partner BOOLEAN DEFAULT FALSE,
    UNIQUE (source, external_id)
);

CREATE TABLE station_poi (
    station_id INTEGER REFERENCES stations(id),
    poi_id INTEGER REFERENCES pois(id),
    distance_m DOUBLE PRECISION NOT NULL,
    PRIMARY KEY (station_id, poi_id)
);

CREATE TABLE partners (
    id SERIAL PRIMARY KEY,
    poi_id INTEGER UNIQUE REFERENCES pois(id),
    discount_info VARCHAR NOT NULL,
    coupon_code VARCHAR NOT NULL,
    valid_until DATE
);

CREATE TABLE coupon_redeem (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    partner_id INTEGER REFERENCES partners(id),
    redeemed_at TIMESTAMP DEFAULT now()
);

CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    poi_id INTEGER REFERENCES pois(id),
    user_id VARCHAR NOT NULL,
    rating INTEGER NOT NULL,
    content VARCHAR,
    created_at TIMESTAMP DEFAULT now()
);
