import { getCachedGeo, saveCachedGeo } from "../db/geocodeCacheRepo.js";
import { searchPlace } from "../services/nominatim.js";

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function countryNameEn(code) {
  try {
    return regionNames.of(code);
  } catch {
    return null;
  }
}

async function cachedLookup(key, params) {
  const cached = getCachedGeo(key);
  if (cached !== undefined) return cached;

  try {
    const geo = await searchPlace(params);
    saveCachedGeo(key, geo);
    return geo;
  } catch (error) {
    console.warn(`Geocoding failed for "${key}": ${error.message}`);
    return null;
  }
}

export async function getCountryGeo(countryCode) {
  const name = countryNameEn(countryCode);
  if (!name) return null;

  return cachedLookup(`country:${countryCode}`, {
    q: name,
    countrycodes: countryCode.toLowerCase(),
    featureType: "country",
  });
}

export async function getCityGeo(state, countryCode) {
  return cachedLookup(`city:${countryCode}:${state.toLowerCase()}`, {
    q: state,
    countrycodes: countryCode.toLowerCase(),
  });
}