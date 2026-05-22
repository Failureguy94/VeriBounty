import { Router } from "express";
import { ClaimModel } from "../models/Claim";
import { EvidenceModel } from "../models/Evidence";
import { validate } from "../middleware/validate";
import { createEvidenceBodySchema } from "../schemas/evidenceSchemas";
import { bountyPDASchema } from "../schemas/common";
import { z } from "zod";

export const evidenceRouter = Router();

// Create evidence
evidenceRouter.post("/", validate({ body: createEvidenceBodySchema }), async (req, res, next) => {
  try {
    const payload = req.body;

    const claim = await ClaimModel.findOne({ bountyPDA: payload.bountyPDA });
    if (!claim) {
      res.status(404).json({ message: "Claim not found for this bountyPDA" });
      return;
    }

    const evidence = await EvidenceModel.create(payload);

    if (claim.status !== "verdict_submitted") {
      claim.status = "verdict_submitted";
      await claim.save();
    }

    res.status(201).json(evidence);
  } catch (error) {
    next(error);
  }
});

// Get all evidence (for bulk loading in frontend)
evidenceRouter.get("/", async (_req, res, next) => {
  try {
    const evidence = await EvidenceModel.find().sort({ createdAt: -1 });
    res.status(200).json(evidence);
  } catch (error) {
    next(error);
  }
});

// Get evidence by bountyPDA
evidenceRouter.get(
  "/:bountyPDA",
  validate({ params: z.object({ bountyPDA: bountyPDASchema }) }),
  async (req, res, next) => {
    try {
      const { bountyPDA } = req.params;
      const evidence = await EvidenceModel.find({ bountyPDA }).sort({ createdAt: -1 });
      res.status(200).json(evidence);
    } catch (error) {
      next(error);
    }
  }
);
