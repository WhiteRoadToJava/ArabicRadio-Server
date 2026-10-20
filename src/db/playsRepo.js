import { db } from './database.js';

const DEDUP_MS = 60_000;
const VALID_SOURCES = new Set(['map', 'list', 'search', 'favorites', 'unknown']);

const stationStmt = db.prepare(`
  SELECT country_code FROM stations
  WHERE uuid = ? AND is_active = 1 AND is_hidden = 0
`);

const recentStmt = db.prepare(`
  SELECT 1 FROM play_events
  WHERE client_id = ? AND station_uuid = ? AND created_at > ?
  LIMIT 1
`);

const insertStmt = db.prepare(`
  INSERT INTO play_events (station_uuid, country_code, source, client_id, day, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

export function recordPlay({ stationUuid, source, clientId }, now = new Date()) {
  const station = stationStmt.get(stationUuid);
  if (!station) return 'unknown_station';

  if (clientId) {
    const since = new Date(now.getTime() - DEDUP_MS).toISOString();
    if (recentStmt.get(clientId, stationUuid, since)) return 'duplicate';
  }

  const nowIso = now.toISOString();
  insertStmt.run(
    stationUuid,
    station.country_code,
    VALID_SOURCES.has(source) ? source : 'unknown',
    clientId ?? null,
    nowIso.slice(0, 10),
    nowIso,
  );
  return 'recorded';
}