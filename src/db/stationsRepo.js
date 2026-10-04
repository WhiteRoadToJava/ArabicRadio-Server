import { db } from "./database.js";

const upsertStmt = db.prepare(`
   INSERT INTO stations (
    uuid, name, stream_url, homepage, favicon, tags, country_code, state,
    codec, bitrate, is_hls, votes, lat, lng, geo_source, synced_at
  ) VALUES (
    :uuid, :name, :stream_url, :homepage, :favicon, :tags, :country_code, :state,
    :codec, :bitrate, :is_hls, :votes, :lat, :lng, :geo_source, :synced_at
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
    synced_at = excluded.synced_at
`);
// الأعمدة التي نرسلها للتطبيق (synced_at داخلي فلا نرسله)
const PUBLIC_COLUMNS = `
  uuid, name, stream_url, homepage, favicon, tags, country_code, state,
  codec, bitrate, is_hls, votes, lat, lng, geo_source
`;

const byCountryStmt = db.prepare(`
  SELECT ${PUBLIC_COLUMNS} FROM stations
  WHERE country_code = ?
  ORDER BY votes DESC
`);

const searchStmt = db.prepare(`
  SELECT ${PUBLIC_COLUMNS} FROM stations
  WHERE name LIKE ?
  ORDER BY votes DESC
  LIMIT 50
`);

const mappableStmt = db.prepare(`
  SELECT uuid, name, favicon, country_code, geo_source, votes, lat, lng
  FROM stations
  WHERE geo_source IN ('exact', 'city')
`);

const countByCountryStmt = db.prepare(`
  SELECT country_code, COUNT(*) AS station_count
  FROM stations
  WHERE country_code IS NOT NULL
  GROUP BY country_code
`);

export function findStationsByCountry(countryCode) {
  return byCountryStmt.all(countryCode);
}

export function searchStations(term) {
  return searchStmt.all(`%${term}%`);
}

export function findStationsByIds(ids) {
  // عدد علامات ? يتغير حسب عدد المعرّفات، فنبني الاستعلام في كل مرة
  const placeholders = ids.map(() => "?").join(", ");
  return db
    .prepare(`SELECT ${PUBLIC_COLUMNS} FROM stations WHERE uuid IN (${placeholders})`)
    .all(...ids);
}

export function findMappableStations() {
  return mappableStmt.all();
}

export function countStationsByCountry() {
  return countByCountryStmt.all();
}
export function upsertStations(stations, syncedAt) {
  db.exec("BEGIN");
  try {
    for (const station of stations) {
      upsertStmt.run({
        ...station,
        synced_at: syncedAt,
      });
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function deleteStationsNotSyncedSince(syncedAt) {
    const result = db
        .prepare("DELETE FROM stations WHERE synced_at < ?")
        .run(syncedAt);
    return result.changes;
}

export function countStations() {
    return db.prepare("SELECT COUNT(*) AS count FROM stations").get().count;
}