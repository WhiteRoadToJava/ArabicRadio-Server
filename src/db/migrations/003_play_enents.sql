CREATE TABLE IF NOT EXISTS play_events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  station_uuid  TEXT NOT NULL,
  country_code  TEXT,
  source        TEXT NOT NULL DEFAULT 'unknown'
                CHECK (source IN ('map', 'list', 'search', 'favorites', 'unknown')),
  client_id     TEXT,
  day           TEXT NOT NULL,   -- YYYY-MM-DD بتوقيت UTC، للتجميع اليومي السريع
  created_at    TEXT NOT NULL    -- الوقت الكامل بتوقيت UTC
);

CREATE INDEX IF NOT EXISTS idx_play_events_day_station
  ON play_events (day, station_uuid);

CREATE INDEX IF NOT EXISTS idx_play_events_dedup
  ON play_events (client_id, station_uuid, created_at);

/* daily plays and unique listeners per station */
CREATE VIEW IF NOT EXISTS daily_station_plays AS
SELECT
  day,
  station_uuid,
  country_code,
  COUNT(*)                  AS plays,
  COUNT(DISTINCT client_id) AS listeners
FROM play_events
GROUP BY day, station_uuid, country_code;