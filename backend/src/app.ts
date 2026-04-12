import cors from "cors";
import express from "express";
import { claimRouter } from "./routes/claimRoutes";
import { evidenceRouter } from "./routes/evidenceRoutes";
import { reputationRouter } from "./routes/reputationRoutes";
import { errorHandler } from "./middleware/errorHandler";

export const app = express();

app.use(cors());
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
