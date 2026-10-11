import { LANGUAGE } from "../config.js";
import { fetchStationsByLanguage } from "../services/radioBrowser.js";
import { mapStation } from "./mapStation.js";
import { locateStation } from "./locationStation.js";
import {
  importStations,
  deactivateMissingStations,
  countActiveImported,
  countStations,
} from "../db/stationsRepo.js";

export async function runSync() {
  const syncStartedAt = new Date().toISOString();

  const raw = await fetchStationsByLanguage(LANGUAGE);
  if (raw.length === 0) {
    throw new Error("Radio Browser returned 0 stations, sync aborted");
  }

  const stations = raw
    .map(mapStation)
    .filter((s) => s.uuid && s.name && s.stream_url);

  // حماية: إن وصل أقل من نصف ما نعرفه، فالرد على الأرجح ناقص
  const previouslyActive = countActiveImported();
  if (previouslyActive > 0 && stations.length < previouslyActive * 0.5) {
    throw new Error(
      `Suspicious sync: got ${stations.length} stations, expected about ${previouslyActive}. Aborted.`
    );
  }

  const located = [];
  for (const station of stations) {
    located.push(await locateStation(station));
  }

  importStations(located, syncStartedAt);
  const deactivated = deactivateMissingStations(syncStartedAt);

  const geo = { exact: 0, city: 0, country: 0, none: 0 };
  for (const s of located) {
    geo[s.geo_source ?? "none"]++;
  }

  return {
    fetched: raw.length,
    imported: located.length,
    skipped: raw.length - stations.length,
    deactivated,
    visible: countStations(),
    ...geo,
  };
}