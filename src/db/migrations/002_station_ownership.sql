CREATE TABLE stations_new (
  uuid          TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  stream_url    TEXT NOT NULL,
  homepage      TEXT,
  favicon       TEXT,
  tags          TEXT,
  country_code  TEXT,
  state         TEXT,
  codec         TEXT,
  bitrate       INTEGER,
  is_hls        INTEGER NOT NULL DEFAULT 0,
  votes         INTEGER NOT NULL DEFAULT 0,
  lat           REAL,
  lng           REAL,
  geo_source    TEXT CHECK (geo_source IN ('exact', 'city', 'country')),

  source        TEXT NOT NULL DEFAULT 'imported'
                CHECK (source IN ('imported', 'custom')),
  is_active     INTEGER NOT NULL DEFAULT 1,
  is_hidden     INTEGER NOT NULL DEFAULT 0,
  locked        INTEGER NOT NULL DEFAULT 0,

  last_seen_at  TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

INSERT INTO stations_new (
  uuid, name, stream_url, homepage, favicon, tags, country_code, state,
  codec, bitrate, is_hls, votes, lat, lng, geo_source,
  source, is_active, is_hidden, locked, last_seen_at, created_at, updated_at
)
SELECT
  uuid, name, stream_url, homepage, favicon, tags, country_code, state,
  codec, bitrate, is_hls, votes, lat, lng, geo_source,
  'imported', 1, 0, 0, synced_at, synced_at, synced_at
FROM stations;

DROP TABLE stations;

ALTER TABLE stations_new RENAME TO stations;

CREATE INDEX idx_stations_country ON stations (country_code);
CREATE INDEX idx_stations_visible ON stations (is_active, is_hidden);