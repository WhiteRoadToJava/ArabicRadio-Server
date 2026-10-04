import {LANGUAGE} from "../config.js";
import {fetchStationsByLanguage} from "../services/radioBrowser.js";

const stations = await fetchStationsByLanguage(LANGUAGE);
console.log(`Total stations: ${stations.length}`);

const withGeo = stations.filter(
    (s) => s.geo_lat !== null && s.geo_long !== null
)
console.log(`With coordinates: ${withGeo.length}`);

const byCountry = {};
for (const s of stations) {
    const code = s.countrycode || "UNKNOWN";
    byCountry[code] = (byCountry[code] || 0) + 1;
}
const top = Object.entries(byCountry)
.sort((a, b) => b[1] - a[1])
.slice(0, 10)
console.log(top)

console.log(`Sample station:`, stations[0])