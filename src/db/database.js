import { DatabaseSync } from 'node:sqlite';
import {mkdirSync} from "node:fs";
import {dirname} from "node:path";


const DB_PATH = process.env.DB_PATH || "data/radio.db";

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS stations (
    uuid          TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    stream_url    TEXT NOT NULL,
    homepage      TEXT,
    favicon       TEXT,
    tags          TEXT,
    country_code  TEXT,
    state         TEXT,
    codec         TEXT,
    bitrate       INTEGER,
    is_hls        INTEGER NOT NULL DEFAULT 0,
    votes         INTEGER NOT NULL DEFAULT 0,
    lat           REAL,
    lng           REAL,
    geo_source    TEXT CHECK (geo_source IN ('exact', 'city', 'country')),
    synced_at     TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_stations_country
    ON stations (country_code);
    `);