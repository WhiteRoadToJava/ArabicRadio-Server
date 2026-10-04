import {db} from "./database.js";

const getStmt = db.prepare(`
    SELECT found, lat, lng, bbox FROM geocode_cache WHERE cache_key = ?;
`);

const saveStmt = db.prepare(`
  INSERT OR REPLACE INTO geocode_cache
    (cache_key, found, lat, lng, bbox, created_at)
  VALUES
    (:cache_key, :found, :lat, :lng, :bbox, :created_at)
`);

export function getCachedGeo(key) {
    const row = getStmt.get(key);
    if (!row) return undefined;
    if (!row.found) return null;
    return {
        lat: row.lat,
        lng: row.lng,
        bbox: row.bbox ? JSON.parse(row.bbox) : null,
    };
}

export function saveCachedGeo(key, geo) {
    saveStmt.run({
        cache_key: key,
        found: geo ? 1 : 0,
        lat: geo ? geo.lat : null,
        lng: geo ? geo.lng : null,
        bbox: geo ? JSON.stringify(geo.bbox) : null,
        created_at: new Date().toISOString(),
    });
}
