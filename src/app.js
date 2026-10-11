import express from "express"
import { apiRouter } from "./routes/index.js"
import{notfoundHandler, errorHandler} from "./middleware/errorHandlers.js"

export const app = express();

app.use(express.json());
app.use("/api", apiRouter)


app.use(express.static('public'))





app.use(notfoundHandler),
app.use(errorHandler)