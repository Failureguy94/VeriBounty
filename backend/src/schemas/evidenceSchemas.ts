import { z } from "zod";
import { bountyPDASchema, walletSchema } from "./common";

export const createEvidenceBodySchema = z.object({
  bountyPDA: bountyPDASchema,
  factCheckerWallet: walletSchema,
  evidenceText: z.string().trim().min(1, "evidenceText is required").max(5000),
  sourceURLs: z.array(z.string().trim().url("Each sourceURL must be a valid URL")).default([]),
  ipfsHash: z.string().trim().min(1, "ipfsHash is required").max(128),
  verdict: z.boolean()
});
