import { db } from "./database.js";

const ADMIN_COLUMNS = `
  uuid, name, stream_url, homepage, favicon, tags, country_code, state,
  codec, bitrate, is_hls, votes, lat, lng, geo_source,
  source, is_active, is_hidden, locked, last_seen_at, created_at, updated_at
`;

export function findStationForAdmin(uuid) {
  return db.prepare(`SELECT ${ADMIN_COLUMNS} FROM stations WHERE uuid = ?`).get(uuid);
}

export function listStationsForAdmin({ q, source, hidden, limit, offset }) {
  const where = [];
  const params = [];

  if (q) {
    where.push("name LIKE ?");
    params.push(`%${q}%`);
  }
  if (source) {
    where.push("source = ?");
    params.push(source);
  }
  if (hidden !== undefined) {
    where.push("is_hidden = ?");
    params.push(hidden);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  return db
    .prepare(`
      SELECT ${ADMIN_COLUMNS} FROM stations ${whereSql}
      ORDER BY updated_at DESC LIMIT ? OFFSET ?
    `)
    .all(...params, limit, offset);
}

const insertCustomStmt = db.prepare(`
  INSERT INTO stations (
    uuid, name, stream_url, homepage, favicon, tags, country_code, state,
    codec, bitrate, is_hls, votes, lat, lng, geo_source,
    source, is_active, is_hidden, locked, last_seen_at, created_at, updated_at
  ) VALUES (
    :uuid, :name, :stream_url, :homepage, :favicon, :tags, :country_code, :state,
    :codec, :bitrate, :is_hls, :votes, :lat, :lng, :geo_source,
    'custom', 1, 0, 0, NULL, :now, :now
  )
`);

export function insertCustomStation(station, now) {
  insertCustomStmt.run({ ...station, now });
}

// قائمة بيضاء: الأعمدة الوحيدة المسموح بتعديلها من الإدارة
const UPDATABLE_COLUMNS = new Set([
  "name", "stream_url", "homepage", "favicon", "tags", "country_code", "state",
  "codec", "bitrate", "votes", "lat", "lng", "geo_source", "is_hidden", "locked",
]);

export function updateStation(uuid, changes, now) {
  const columns = Object.keys(changes);
  for (const column of columns) {
    if (!UPDATABLE_COLUMNS.has(column)) {
      throw new Error(`Column is not updatable: ${column}`);
    }
  }
  if (columns.length === 0) return 0;

  const setSql = columns.map((column) => `${column} = ?`).join(", ");
  return db
    .prepare(`UPDATE stations SET ${setSql}, updated_at = ? WHERE uuid = ?`)
    .run(...columns.map((column) => changes[column]), now, uuid).changes;
}

export function deleteCustomStation(uuid) {
  return db
    .prepare("DELETE FROM stations WHERE uuid = ? AND source = 'custom'")
    .run(uuid).changes;
}