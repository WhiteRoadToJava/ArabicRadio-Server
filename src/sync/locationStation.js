import { getCountryGeo, getCityGeo } from "./geocoder.js";

const BBOX_MARGIN = 0.5;
const CITY_JITTER = 0.02;
const COUNTRY_JITTER = 0.15;

function hashString(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stableJitter(uuid, max) {
  const hash = hashString(uuid);
  const a = (hash & 0xffff) / 0xffff;
  const b = (hash >>> 16) / 0xffff;
  return {
    dLat: (a * 2 - 1) * max,
    dLng: (b * 2 - 1) * max,
  };
}

function isInsideBbox(lat, lng, bbox) {
  if (!bbox) return true;
  const [minLat, maxLat, minLng, maxLng] = bbox;
  return (
    lat >= minLat - BBOX_MARGIN &&
    lat <= maxLat + BBOX_MARGIN &&
    lng >= minLng - BBOX_MARGIN &&
    lng <= maxLng + BBOX_MARGIN
  );
}

function placeNear(station, geo, jitterMax, source) {
  const { dLat, dLng } = stableJitter(station.uuid, jitterMax);
  return {
    ...station,
    lat: geo.lat + dLat,
    lng: geo.lng + dLng,
    geo_source: source,
  };
}

export async function locateStation(station) {
  const cc = station.country_code;

  if (!cc) {
    return { ...station, lat: null, lng: null, geo_source: null };
  }

  const country = await getCountryGeo(cc);

  if (station.geo_source === "exact") {
    if (!country || isInsideBbox(station.lat, station.lng, country.bbox)) {
      return station;
    }
    console.warn(
      `Coordinates outside ${cc} for "${station.name}", falling back`
    );
  }

  if (station.state) {
    const city = await getCityGeo(station.state, cc);
    if (city) return placeNear(station, city, CITY_JITTER, "city");
  }

  if (country) return placeNear(station, country, COUNTRY_JITTER, "country");

  return { ...station, lat: null, lng: null, geo_source: null };
}