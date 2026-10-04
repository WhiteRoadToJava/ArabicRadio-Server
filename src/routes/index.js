import { Router } from "express";
import {healthRouter} from "./health.js"
import { stationsRouter } from "./stations.js";
import { countriesRouter } from "./countries.js";

export const apiRouter =  Router();

apiRouter.use("/stations", stationsRouter)
apiRouter.use("/countries", countriesRouter)
apiRouter.use("/health", healthRouter)