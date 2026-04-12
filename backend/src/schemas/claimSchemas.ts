import { z } from "zod";
import { claimStatuses } from "../models/Claim";
import { bountyPDASchema, walletSchema } from "./common";

export const createClaimBodySchema = z.object({
  claimText: z.string().trim().min(1, "claimText is required").max(5000),
  submitterWallet: walletSchema,
  solAmount: z.coerce.number().positive("solAmount must be greater than 0"),
  status: z.enum(claimStatuses).optional(),
  bountyPDA: bountyPDASchema
});

export const getClaimsQuerySchema = z.object({
  status: z.enum(claimStatuses).optional()
});

export const bountyParamSchema = z.object({
  bountyPDA: bountyPDASchema
});
