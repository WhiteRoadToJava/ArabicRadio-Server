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