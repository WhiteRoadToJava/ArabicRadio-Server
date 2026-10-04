import { LANGUAGE } from '../config.js';
import { fetchStationsByLanguage } from '../services/radioBrowser.js';
import { mapStation } from './mapStations.js';
import {
  upsertStations,
  deleteStationsNotSyncedSince,
  countStations,
} from '../db/stationsRepo.js';

export async function runSync() {
    const syncedAt = new Date().toISOString();
    const raw = await fetchStationsByLanguage(LANGUAGE);
    if( raw.length === 0 ) {
        throw new Error(`Radio Browser returned 0 stations, sync aborted`);
    }

    const stations = raw
    .map(mapStation)
    .filter((s) => s.uuid && s.name && s.stream_url);

    upsertStations(stations, syncedAt);
    const deleted = deleteStationsNotSyncedSince(syncedAt);

    return {
        fetched: raw.length,
        saved: stations.length,
        skipped: raw.length - stations.length,
        deleted,
        total: countStations(),
    }
}