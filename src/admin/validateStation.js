const FIELDS = [
  "name", "stream_url", "homepage", "favicon", "tags",
  "country_code", "state", "codec", "bitrate", "votes", "lat", "lng",
];

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// partial: true للتعديل (كل الحقول اختيارية)، false للإضافة
export function validateStationInput(body, { partial }) {
  const errors = [];
  const value = {};

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { value, errors: ["Body must be a JSON object"] };
  }

  for (const key of Object.keys(body)) {
    if (!FIELDS.includes(key)) errors.push(`Unknown field: ${key}`);
  }

  const has = (key) => body[key] !== undefined;

  if (!partial) {
    for (const key of ["name", "stream_url", "country_code"]) {
      if (!has(key)) errors.push(`${key} is required`);
    }
  }

  if (has("name")) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 1 || name.length > 200) {
      errors.push("name must be 1-200 characters");
    } else {
      value.name = name;
    }
  }

  if (has("stream_url")) {
    if (!isHttpUrl(body.stream_url)) {
      errors.push("stream_url must be an http(s) URL");
    } else {
      value.stream_url = body.stream_url;
    }
  }

  for (const key of ["homepage", "favicon"]) {
    if (!has(key)) continue;
    if (body[key] === null || body[key] === "") value[key] = null;
    else if (!isHttpUrl(body[key])) errors.push(`${key} must be an http(s) URL or null`);
    else value[key] = body[key];
  }

  for (const key of ["tags", "state", "codec"]) {
    if (!has(key)) continue;
    if (body[key] === null || body[key] === "") value[key] = null;
    else if (typeof body[key] !== "string" || body[key].length > 200) {
      errors.push(`${key} must be a string up to 200 characters`);
    } else value[key] = body[key].trim();
  }

  if (has("country_code")) {
    if (typeof body.country_code !== "string" || !/^[A-Za-z]{2}$/.test(body.country_code)) {
      errors.push("country_code must be a 2-letter code");
    } else {
      value.country_code = body.country_code.toUpperCase();
    }
  }

  for (const key of ["bitrate", "votes"]) {
    if (!has(key)) continue;
    if (key === "bitrate" && body[key] === null) value[key] = null;
    else if (!Number.isInteger(body[key]) || body[key] < 0) {
      errors.push(`${key} must be a non-negative integer`);
    } else value[key] = body[key];
  }

  if (has("lat") !== has("lng")) {
    errors.push("lat and lng must be provided together");
  } else if (has("lat")) {
    if (body.lat === null && body.lng === null) {
      value.lat = null;
      value.lng = null;
    } else if (typeof body.lat !== "number" || body.lat < -90 || body.lat > 90) {
      errors.push("lat must be a number between -90 and 90");
    } else if (typeof body.lng !== "number" || body.lng < -180 || body.lng > 180) {
      errors.push("lng must be a number between -180 and 180");
    } else {
      value.lat = body.lat;
      value.lng = body.lng;
    }
  }

  return { value, errors };
}