import cors from "cors";
import express from "express";
import { claimRouter } from "./routes/claimRoutes";
import { evidenceRouter } from "./routes/evidenceRoutes";
import { reputationRouter } from "./routes/reputationRoutes";
import { errorHandler } from "./middleware/errorHandler";
import { env } from "./config/env";

export const app = express();

const allowedOrigins = env.CORS_ORIGIN.split(",").map((origin) => origin.trim());
app.use(cors({ origin: env.NODE_ENV === "development" ? true : allowedOrigins }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/claims", claimRouter);
app.use("/evidence", evidenceRouter);
app.use("/reputation", reputationRouter);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use(errorHandler);
