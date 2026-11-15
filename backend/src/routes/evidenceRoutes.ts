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

    // The on-chain bounty is the source of truth; the off-chain claim record may
    // be missing (e.g. its metadata sync failed), so evidence is stored regardless.
    const claim = await ClaimModel.findOne({ bountyPDA: payload.bountyPDA });

    const existing = await EvidenceModel.findOne({ bountyPDA: payload.bountyPDA, factCheckerWallet: payload.factCheckerWallet, ipfsHash: payload.ipfsHash });
    if (existing) { res.status(200).json(existing); return; }

    const evidence = await EvidenceModel.create(payload);

    if (claim && claim.status !== "verdict_submitted") {
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
