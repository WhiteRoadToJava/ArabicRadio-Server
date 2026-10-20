import { Router } from "express";
import { recordPlay } from "../db/playsRepo.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CLIENT_ID_RE = /^[0-9a-f]{64}$/i;

export const playsRouter = Router();

playsRouter.post("/", (req, res) => {
  const { station_uuid, source, client_id } = req.body ?? {};

  if (typeof station_uuid !== "string" || !UUID_RE.test(station_uuid)) {
    return res.status(400).json({ error: "station_uuid must be a valid UUID" });
  }

  const result = recordPlay({
    stationUuid: station_uuid,
    source,
    clientId: typeof client_id === "string" && CLIENT_ID_RE.test(client_id) ? client_id : null,
  });

  if (result === "unknown_station") {
    return res.status(404).json({ error: "Station not found" });
  }

  res.status(204).end();
});