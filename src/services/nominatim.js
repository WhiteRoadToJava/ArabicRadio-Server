const BASE_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT =
  process.env.NOMINATIM_USER_AGENT || "ArabicRadioApp/0.1";

// شروط Nominatim: طلب واحد في الثانية كحد أقصى (مع هامش أمان)
const MIN_INTERVAL_MS = 1100;
let lastRequestAt = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function searchPlace(params) {
  // ننتظر إن لم تمرّ المدة الكافية منذ الطلب السابق
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();

  const query = new URLSearchParams({
    ...params,
    format: "json",
    limit: "1",
  });

  const response = await fetch(`${BASE_URL}?${query}`, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept-Language": "en",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Nominatim HTTP ${response.status}`);
  }

  const results = await response.json();
  if (results.length === 0) return null;

  const place = results[0];
  return {
    lat: parseFloat(place.lat),
    lng: parseFloat(place.lon),
    bbox: place.boundingbox.map(parseFloat),
  };
}