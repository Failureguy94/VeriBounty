import { Router } from "express";
import { ClaimModel } from "../models/Claim";
import { validate } from "../middleware/validate";
import {
  bountyParamSchema,
  createClaimBodySchema,
  getClaimsQuerySchema
} from "../schemas/claimSchemas";

export const claimRouter = Router();

claimRouter.post("/", validate({ body: createClaimBodySchema }), async (req, res, next) => {
  try {
    const claim = await ClaimModel.create(req.body);
    res.status(201).json(claim);
  } catch (error) {
    next(error);
  }
});

claimRouter.get("/", validate({ query: getClaimsQuerySchema }), async (req, res, next) => {
  try {
    const { status } = req.query as { status?: string };
    const filter = status ? { status } : {};
    const claims = await ClaimModel.find(filter).sort({ createdAt: -1 });
    res.status(200).json(claims);
  } catch (error) {
    next(error);
  }
});

claimRouter.get("/:bountyPDA", validate({ params: bountyParamSchema }), async (req, res, next) => {
  try {
    const { bountyPDA } = req.params;
    const claim = await ClaimModel.findOne({ bountyPDA });

    if (!claim) {
      res.status(404).json({ message: "Claim not found" });
      return;
    }

    res.status(200).json(claim);
  } catch (error) {
    next(error);
  }
});
