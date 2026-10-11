import { db } from "./database.js";

// المحطات التي يراها المستخدم: نشطة وغير مخفية
const VISIBLE = "is_active = 1 AND is_hidden = 0";

// ============ الكتابة: استيراد من Radio Browser ============

// إضافة المحطة الجديدة، أو تحديثها بشرط ألا تكون مقفلة أو خاصة
const importStmt = db.prepare(`
  INSERT INTO stations (
    uuid, name, stream_url, homepage, favicon, tags, country_code, state,
    codec, bitrate, is_hls, votes, lat, lng, geo_source,
    source, is_active, last_seen_at, created_at, updated_at
  ) VALUES (
    :uuid, :name, :stream_url, :homepage, :favicon, :tags, :country_code, :state,
    :codec, :bitrate, :is_hls, :votes, :lat, :lng, :geo_source,
    'imported', 1, :now, :now, :now
  )
  ON CONFLICT (uuid) DO UPDATE SET
    name = excluded.name,
    stream_url = excluded.stream_url,
    homepage = excluded.homepage,
    favicon = excluded.favicon,
    tags = excluded.tags,
    country_code = excluded.country_code,
    state = excluded.state,
    codec = excluded.codec,
    bitrate = excluded.bitrate,
    is_hls = excluded.is_hls,
    votes = excluded.votes,
    lat = excluded.lat,
    lng = excluded.lng,
    geo_source = excluded.geo_source,
    updated_at = excluded.updated_at
  WHERE stations.source = 'imported' AND stations.locked = 0
`);

// تسجيل "رأيناها اليوم" حتى للمقفلة، فهي ما زالت موجودة في Radio Browser
const touchStmt = db.prepare(`
  UPDATE stations SET last_seen_at = ?, is_active = 1
  WHERE uuid = ? AND source = 'imported'
`);

export function importStations(stations, now) {
  db.exec("BEGIN");
  try {
    for (const station of stations) {
      importStmt.run({ ...station, now });
      touchStmt.run(now, station.uuid);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

// بدل الحذف: نعلّم المستوردة التي لم تظهر في هذه المزامنة بأنها غير نشطة
export function deactivateMissingStations(syncStartedAt) {
  return db
    .prepare(`
      UPDATE stations SET is_active = 0, updated_at = ?
      WHERE source = 'imported' AND is_active = 1 AND last_seen_at < ?
    `)
    .run(syncStartedAt, syncStartedAt).changes;
}

export function countActiveImported() {
  return db
    .prepare("SELECT COUNT(*) AS count FROM stations WHERE source = 'imported' AND is_active = 1")
    .get().count;
}

export function getLastSyncTime() {
  return db
    .prepare("SELECT MAX(last_seen_at) AS last_sync FROM stations WHERE source = 'imported'")
    .get().last_sync;
}

// ============ القراءة: ما يراه التطبيق ============

const PUBLIC_COLUMNS = `
  uuid, name, stream_url, homepage, favicon, tags, country_code, state,
  codec, bitrate, is_hls, votes, lat, lng, geo_source, source
`;

const byCountryStmt = db.prepare(`
  SELECT ${PUBLIC_COLUMNS} FROM stations
  WHERE country_code = ? AND ${VISIBLE}
  ORDER BY votes DESC
`);

const searchStmt = db.prepare(`
  SELECT ${PUBLIC_COLUMNS} FROM stations
  WHERE name LIKE ? AND ${VISIBLE}
  ORDER BY votes DESC
  LIMIT 50
`);

const mappableStmt = db.prepare(`
  SELECT uuid, name, favicon, country_code, geo_source, votes, lat, lng
  FROM stations
  WHERE geo_source IN ('exact', 'city') AND ${VISIBLE}
`);

const countByCountryStmt = db.prepare(`
  SELECT country_code, COUNT(*) AS station_count
  FROM stations
  WHERE country_code IS NOT NULL AND ${VISIBLE}
  GROUP BY country_code
`);

export function findStationsByCountry(countryCode) {
  return byCountryStmt.all(countryCode);
}

export function searchStations(term) {
  return searchStmt.all(`%${term}%`);
}

export function findStationsByIds(ids) {
  const placeholders = ids.map(() => "?").join(", ");
  return db
    .prepare(`SELECT ${PUBLIC_COLUMNS} FROM stations WHERE uuid IN (${placeholders}) AND ${VISIBLE}`)
    .all(...ids);
}

export function findMappableStations() {
  return mappableStmt.all();
}

export function countStationsByCountry() {
  return countByCountryStmt.all();
}

export function countStations() {
  return db.prepare(`SELECT COUNT(*) AS count FROM stations WHERE ${VISIBLE}`).get().count;
}

// إحصائية للفحص: العدد حسب المصدر والحالة
export function getStationStats() {
  return db
    .prepare(`
      SELECT source, is_active, is_hidden, COUNT(*) AS count
      FROM stations
      GROUP BY source, is_active, is_hidden
    `)
    .all();
}