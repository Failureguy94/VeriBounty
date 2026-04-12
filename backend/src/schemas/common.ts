import { z } from "zod";

const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export const walletSchema = z
  .string()
  .trim()
  .regex(solanaAddressRegex, "Invalid Solana wallet address");

export const bountyPDASchema = z
  .string()
  .trim()
  .regex(solanaAddressRegex, "Invalid bountyPDA address");
