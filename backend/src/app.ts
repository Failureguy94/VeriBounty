import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import { claimRouter } from "./routes/claimRoutes";
import { evidenceRouter } from "./routes/evidenceRoutes";
import { reputationRouter } from "./routes/reputationRoutes";
import { errorHandler } from "./middleware/errorHandler";
import { env } from "./config/env";

export const app = express();

// Browsers send Origin without a trailing slash, so normalise configured values.
const allowedOrigins = env.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);
app.use(cors({ origin: env.NODE_ENV === "development" ? true : allowedOrigins }));
app.use(express.json());

const isDbConnected = (): boolean => mongoose.connection.readyState === 1;

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", db: isDbConnected() });
});

// Fail fast with 503 when MongoDB is down, instead of Mongoose buffering each
// query for ~10s and then returning a 500.
const requireDb: express.RequestHandler = (_req, res, next) => {
  if (!isDbConnected()) {
    res.status(503).json({ message: "Database unavailable" });
    return;
  }
  next();
};

app.use("/claims", requireDb, claimRouter);
app.use("/evidence", requireDb, evidenceRouter);
app.use("/reputation", requireDb, reputationRouter);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use(errorHandler);
