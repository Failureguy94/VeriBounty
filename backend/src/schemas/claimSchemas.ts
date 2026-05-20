import { z } from "zod";
import { claimStatuses } from "../models/Claim";
import { bountyPDASchema, walletSchema } from "./common";

export const createClaimBodySchema = z.object({
  claimText:       z.string().trim().min(1, "claimText is required").max(5000),
  description:     z.string().trim().max(5000).optional(),
  category:        z.string().trim().max(100).optional(),
  tags:            z.array(z.string().trim().max(50)).optional(),
  submitterWallet: walletSchema,
  solAmount:       z.coerce.number().positive("solAmount must be greater than 0"),
  status:          z.enum(claimStatuses).optional(),
  expiresAt:       z.coerce.number().optional(),
  bountyPDA:       bountyPDASchema
});

export const getClaimsQuerySchema = z.object({
  status: z.enum(claimStatuses).optional()
});

export const bountyParamSchema = z.object({
  bountyPDA: bountyPDASchema
});
