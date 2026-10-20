import { Router } from "express";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { validateStationInput } from "../admin/validateStation.js";
import { locateStation } from "../sync/locationStation.js";
import {
  findStationForAdmin,
  listStationsForAdmin,
  insertCustomStation,
  updateStation,
  deleteCustomStation,
} from "../db/adminStationsRepo.js";

export const adminStationsRouter = Router();

// كل المسارات في هذا الملف محمية
adminStationsRouter.use(requireAdmin);

const LOCATION_FIELDS = ["country_code", "state", "lat", "lng"];

// نفس منطق المزامنة: إحداثيات دقيقة إن صحّت، وإلا المدينة، وإلا الدولة
async function resolveLocation(station) {
  const hasCoords = station.lat !== null && station.lng !== null;
  const located = await locateStation({
    ...station,
    geo_source: hasCoords ? "exact" : null,
  });
  return { lat: located.lat, lng: located.lng, geo_source: located.geo_source };
}

// GET /api/admin/stations?q=&source=custom&hidden=1&limit=50&offset=0
adminStationsRouter.get("/", (req, res) => {
  const { q, source, hidden } = req.query;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;

  if (source && !["imported", "custom"].includes(source)) {
    return res.status(400).json({ error: "source must be imported or custom" });
  }

  res.json(
    listStationsForAdmin({
      q,
      source,
      hidden: hidden === undefined ? undefined : hidden === "1" ? 1 : 0,
      limit,
      offset,
    })
  );
});

adminStationsRouter.get("/:uuid", (req, res) => {
  const station = findStationForAdmin(req.params.uuid);
  if (!station) return res.status(404).json({ error: "Station not found" });
  res.json(station);
});

// إضافة محطة خاصة
adminStationsRouter.post("/", async (req, res) => {
  const { value, errors } = validateStationInput(req.body, { partial: false });
  if (errors.length > 0) return res.status(400).json({ errors });

  const station = {
    uuid: randomUUID(),
    name: value.name,
    stream_url: value.stream_url,
    homepage: value.homepage ?? null,
    favicon: value.favicon ?? null,
    tags: value.tags ?? null,
    country_code: value.country_code,
    state: value.state ?? null,
    codec: value.codec ?? null,
    bitrate: value.bitrate ?? null,
    is_hls: value.stream_url.includes(".m3u8") ? 1 : 0,
    votes: value.votes ?? 0,
    lat: value.lat ?? null,
    lng: value.lng ?? null,
  };

  const location = await resolveLocation(station);

  // أرسلت إحداثيات، لكنها خارج الدولة المذكورة: نرفض بدل أن نتجاهلها بصمت
  if (station.lat !== null && location.geo_source !== "exact") {
    return res.status(400).json({ errors: ["lat/lng are outside the given country"] });
  }

  insertCustomStation({ ...station, ...location }, new Date().toISOString());
  res.status(201).json(findStationForAdmin(station.uuid));
});

// تعديل محطة
adminStationsRouter.patch("/:uuid", async (req, res) => {
  const existing = findStationForAdmin(req.params.uuid);
  if (!existing) return res.status(404).json({ error: "Station not found" });

  const { value, errors } = validateStationInput(req.body, { partial: true });
  if (errors.length > 0) return res.status(400).json({ errors });
  if (Object.keys(value).length === 0) {
    return res.status(400).json({ errors: ["No fields to update"] });
  }

  const changes = { ...value };

  // إن تغيّر أي حقل يخص الموقع، نعيد حسابه
  if (LOCATION_FIELDS.some((field) => value[field] !== undefined)) {
    const merged = { ...existing, ...value };
    const coordsSent = value.lat !== undefined;

    // نستخدم الإحداثيات إن أرسلتها، أو إن كانت المحطة دقيقة أصلاً
    // (أما إحداثيات المدينة والدولة المحفوظة فهي تقريبية، فلا نعيد استخدامها)
    const useCoords = coordsSent ? value.lat !== null : existing.geo_source === "exact";

    const location = await resolveLocation({
      ...merged,
      lat: useCoords ? merged.lat : null,
      lng: useCoords ? merged.lng : null,
    });

    if (coordsSent && value.lat !== null && location.geo_source !== "exact") {
      return res.status(400).json({ errors: ["lat/lng are outside the given country"] });
    }

    Object.assign(changes, location);
  }

  // تعديل محطة مستوردة يقفلها حتى لا تمحو المزامنة تعديلك
  if (existing.source === "imported") changes.locked = 1;

  updateStation(existing.uuid, changes, new Date().toISOString());
  res.json(findStationForAdmin(existing.uuid));
});

adminStationsRouter.post("/:uuid/hide", (req, res) => {
  const changed = updateStation(req.params.uuid, { is_hidden: 1 }, new Date().toISOString());
  if (!changed) return res.status(404).json({ error: "Station not found" });
  res.json(findStationForAdmin(req.params.uuid));
});

adminStationsRouter.post("/:uuid/unhide", (req, res) => {
  const changed = updateStation(req.params.uuid, { is_hidden: 0 }, new Date().toISOString());
  if (!changed) return res.status(404).json({ error: "Station not found" });
  res.json(findStationForAdmin(req.params.uuid));
});

// فك القفل: المزامنة القادمة ستعيد بيانات Radio Browser وتمحو تعديلاتك
adminStationsRouter.post("/:uuid/unlock", (req, res) => {
  const existing = findStationForAdmin(req.params.uuid);
  if (!existing) return res.status(404).json({ error: "Station not found" });
  if (existing.source !== "imported") {
    return res.status(400).json({ error: "Only imported stations can be unlocked" });
  }
  updateStation(existing.uuid, { locked: 0 }, new Date().toISOString());
  res.json(findStationForAdmin(existing.uuid));
});

adminStationsRouter.delete("/:uuid", (req, res) => {
  const existing = findStationForAdmin(req.params.uuid);
  if (!existing) return res.status(404).json({ error: "Station not found" });
  if (existing.source !== "custom") {
    return res.status(400).json({ error: "Imported stations cannot be deleted, hide them instead" });
  }
  deleteCustomStation(existing.uuid);
  res.status(204).end();
});