import { LANGUAGE } from '../config.js';
import { fetchStationsByLanguage } from '../services/radioBrowser.js';
import { mapStation } from './mapStation.js';
import {
  upsertStations,
  deleteStationsNotSyncedSince,
  countStations,
} from '../db/stationsRepo.js';
import { locateStation } from './locationStation.js';

export async function runSync() {
    const syncedAt = new Date().toISOString();
    const raw = await fetchStationsByLanguage(LANGUAGE);
    if( raw.length === 0 ) {
        throw new Error(`Radio Browser returned 0 stations, sync aborted`);
    }

    const stations = raw
    .map(mapStation)
    .filter((s) => s.uuid && s.name && s.stream_url);

        // تحديد موقع كل محطة، واحدة تلو الأخرى
    const located = [];
    for (const station of stations) {
        located.push(await locateStation(station));
    }

    upsertStations(located, syncedAt);
    const deleted = deleteStationsNotSyncedSince(syncedAt);

    // إحصائية بمستويات الدقة
    const geo = { exact: 0, city: 0, country: 0, none: 0 };
    for (const s of located) {
        geo[s.geo_source ?? 'none']++;
    }

    return {
        fetched: raw.length,
        saved: located.length,
        skipped: raw.length - stations.length,
        deleted,
        total: countStations(),
        ...geo,
    };
}