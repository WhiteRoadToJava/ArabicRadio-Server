import { db } from "../db/database.js";

// كم محطة على مستوى الدولة لها state؟
const withState = db
  .prepare(
    "SELECT COUNT(*) AS count FROM stations WHERE geo_source = 'country' AND state IS NOT NULL"
  )
  .get();
console.log("Country-level stations with state:", withState.count);

// الأماكن التي لم يجدها Nominatim
const notFound = db
  .prepare("SELECT cache_key FROM geocode_cache WHERE found = 0")
  .all();
console.log(`Not found by Nominatim (${notFound.length}):`);
console.table(notFound);