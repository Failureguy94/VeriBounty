import { z } from "zod";
import { walletSchema } from "./common";

export const reputationParamSchema = z.object({
  wallet: walletSchema
});
