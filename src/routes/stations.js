import { Router } from "express";
import {
  findStationsByCountry,
  searchStations,
  findStationsByIds,
  findMappableStations,
} from "../db/stationsRepo.js";

export const stationsRouter = Router();

stationsRouter.get("/geojson", (req, res) => {
  const features = findMappableStations().map((s) => ({
    type: "Feature",
    id: s.uuid,
    geometry: {
      type: "Point",
      coordinates: [s.lng, s.lat],
    },
    properties: {
      uuid: s.uuid,
      name: s.name,
      favicon: s.favicon,
      country_code: s.country_code,
      geo_source: s.geo_source,
      votes: s.votes,
    },
  }));

  res.json({ type: "FeatureCollection", features });
});

stationsRouter.get("/", (req, res) => {
  const { country, q, ids } = req.query;

  if (country) {
    if (!/^[A-Za-z]{2}$/.test(country)) {
      return res.status(400).json({ error: "country must be a 2-letter code" });
    }
    return res.json(findStationsByCountry(country.toUpperCase()));
  }

  if (q) {
    const term = q.trim();
    if (term.length < 2) {
      return res.status(400).json({ error: "q must be at least 2 characters" });
    }
    return res.json(searchStations(term));
  }

  if (ids) {
    const list = ids
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 100);
    return res.json(list.length > 0 ? findStationsByIds(list) : []);
  }

  res.status(400).json({ error: "Provide one of: country, q, ids" });
});