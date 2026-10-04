function toNumberOrNull(value) {
    if(value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
}

export function mapStation(raw) {
    const lat = toNumberOrNull(raw.geo_lat);
    const lng = toNumberOrNull(raw.geo_long);

    const hasExactGeo =
     lat !== null && lng !== null && !(lat === 0 && lng === 0);

     return {
        uuid: raw.stationuuid,
    name: raw.name?.trim() || '',
    stream_url: raw.url_resolved || raw.url || '',
    homepage: raw.homepage || null,
    favicon: raw.favicon || null,
    tags: raw.tags || null,
    country_code: raw.countrycode ? raw.countrycode.toUpperCase() : null,
    state: raw.state?.trim() || null,
    codec: raw.codec || null,
    bitrate: raw.bitrate || null,
    is_hls: raw.hls ? 1 : 0,
    votes: raw.votes ?? 0,
    lat: hasExactGeo ? lat : null,
    lng: hasExactGeo ? lng : null,
    geo_source: hasExactGeo ? 'exact' : null,
     }   
}