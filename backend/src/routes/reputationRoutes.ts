import { Router } from "express";
import { ReputationModel } from "../models/Reputation";
import { validate } from "../middleware/validate";
import { reputationParamSchema } from "../schemas/reputationSchemas";

export const reputationRouter = Router();

reputationRouter.get("/:wallet", validate({ params: reputationParamSchema }), async (req, res, next) => {
  try {
    const { wallet } = req.params;
    const reputation = await ReputationModel.findOne({ wallet });

    if (!reputation) {
      res.status(404).json({ message: "Reputation not found" });
      return;
    }

    res.status(200).json(reputation);
  } catch (error) {
    next(error);
  }
});
