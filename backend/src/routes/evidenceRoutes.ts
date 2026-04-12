import { Router } from "express";
import { ClaimModel } from "../models/Claim";
import { EvidenceModel } from "../models/Evidence";
import { validate } from "../middleware/validate";
import { createEvidenceBodySchema } from "../schemas/evidenceSchemas";

export const evidenceRouter = Router();

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
