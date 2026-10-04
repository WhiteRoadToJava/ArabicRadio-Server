import { Router } from "express";
import { countStationsByCountry } from "../db/stationsRepo.js";
import { getCachedGeo } from "../db/geocodeCacheRepo.js";

const arabicNames = new Intl.DisplayNames(["ar"], { type: "region" });

function nameAr(code) {
    try{
        return arabicNames.of(code);
    } catch {
        return code;
    }
}

export const countriesRouter = Router();

countriesRouter.get("/",(req, res) => {
    const countries = countStationsByCountry().map((row) =>{

        const geo = getCachedGeo(`country:${row.country_code}`);
        return {
            code: row.country_code,
            name_ar: nameAr(row.country_code),
            station_count: row.station_count,
            lat: geo?.lat ?? null,
            lng: geo?.lng ?? null
        };
    });
    countries.sort((a,b) => b.station_count - a.station_count);
    res.json(countries);
});