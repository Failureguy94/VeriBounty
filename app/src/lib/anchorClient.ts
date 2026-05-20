/**
 * anchorClient.ts
 * ───────────────
 * Real on-chain client for the VeriBounty Anchor program.
 * Replaces mockBlockchain.ts with genuine Solana transactions.
 */

import {
  Program,
  AnchorProvider,
  setProvider,
  BN,
  web3,
  Idl,
} from '@coral-xyz/anchor';
import {
  Connection,
  PublicKey,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import type { AnchorWallet } from '@solana/wallet-adapter-react';
import IDL_JSON from './veri_bounty_idl.json';

// ─── Constants ────────────────────────────────────────────────────────────────

export const PROGRAM_ID = new PublicKey(
  '8xmwE6esqnwxKMGrdszEiBEKnA6PjZNSsh6ByKZxC8Za'
);

export const DEVNET_ENDPOINT = clusterApiUrl('devnet');

const SEED_BOUNTY      = Buffer.from('bounty');
const SEED_ESCROW      = Buffer.from('escrow_vault');
const SEED_REPUTATION  = Buffer.from('reputation');

// ─── On-chain account shape (mirrors lib.rs) ──────────────────────────────────

export type OnChainBountyStatus =
  | { open: Record<string, never> }
  | { claimed: Record<string, never> }
  | { verdictSubmitted: Record<string, never> }
  | { resolved: Record<string, never> };

export type OnChainResolution =
  | { accepted: Record<string, never> }
  | { rejected: Record<string, never> };

export interface OnChainBounty {
  publicKey: PublicKey;
  account: {
    submitter: PublicKey;
    bountyId: BN;
    stakeLamports: BN;
    factChecker: PublicKey;
    submittedVerdict: boolean | null;
    evidenceIpfsHash: string;
    status: OnChainBountyStatus;
    resolution: OnChainResolution | null;
    bump: number;
    vaultBump: number;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a read-only provider (no wallet needed) for fetching accounts. */
export function getReadonlyProvider(): AnchorProvider {
  const conn = new Connection(DEVNET_ENDPOINT, 'confirmed');
  // Anchor requires a wallet-like object even for reads; use a dummy.
  const dummyWallet = {
    publicKey: PublicKey.default,
    signTransaction: async (tx: web3.Transaction) => tx,
    signAllTransactions: async (txs: web3.Transaction[]) => txs,
  };
  return new AnchorProvider(conn, dummyWallet as AnchorWallet, {
    commitment: 'confirmed',
  });
}

/** Build a signing provider from a connected wallet. */
export function getSigningProvider(wallet: AnchorWallet): AnchorProvider {
  const conn = new Connection(DEVNET_ENDPOINT, 'confirmed');
  return new AnchorProvider(conn, wallet, { commitment: 'confirmed' });
}

function getProgram(provider: AnchorProvider): Program {
  setProvider(provider);
  return new Program(IDL_JSON as Idl, provider);
}

// ─── PDA derivation helpers ───────────────────────────────────────────────────

export async function deriveBountyPda(
  submitter: PublicKey,
  bountyId: BN
): Promise<[PublicKey, number]> {
  const idBuf = Buffer.alloc(8);
  idBuf.writeBigUInt64LE(BigInt(bountyId.toString()));
  return PublicKey.findProgramAddressSync(
    [SEED_BOUNTY, submitter.toBuffer(), idBuf],
    PROGRAM_ID
  );
}

export async function deriveEscrowPda(
  bountyPda: PublicKey
): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(
    [SEED_ESCROW, bountyPda.toBuffer()],
    PROGRAM_ID
  );
}

export function deriveReputationPda(
  factChecker: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEED_REPUTATION, factChecker.toBuffer()],
    PROGRAM_ID
  );
}

// ─── Status helpers ───────────────────────────────────────────────────────────

export function statusToString(
  s: OnChainBountyStatus
): 'open' | 'in-review' | 'verdict-submitted' | 'resolved' {
  if ('open'             in s) return 'open';
  if ('claimed'          in s) return 'in-review';
  if ('verdictSubmitted' in s) return 'verdict-submitted';
  return 'resolved';
}

export function resolutionToString(
  r: OnChainResolution | null
): 'accepted' | 'rejected' | null {
  if (!r) return null;
  if ('accepted' in r) return 'accepted';
  return 'rejected';
}

// ─── Read operations ──────────────────────────────────────────────────────────

/**
 * Fetch all Bounty accounts from the program.
 * Uses a filter on the discriminator only (no extra filters).
 */
export async function fetchAllBounties(): Promise<OnChainBounty[]> {
  const provider = getReadonlyProvider();
  const program  = getProgram(provider);

  // @ts-ignore — account namespace typed at runtime
  const accounts = await program.account.bounty.all();
  return accounts as OnChainBounty[];
}

/**
 * Fetch a single Bounty account by its PDA public key.
 */
export async function fetchBountyByPda(
  pda: PublicKey
): Promise<OnChainBounty | null> {
  const provider = getReadonlyProvider();
  const program  = getProgram(provider);

  try {
    // @ts-ignore
    const account = await program.account.bounty.fetch(pda);
    return { publicKey: pda, account } as OnChainBounty;
  } catch {
    return null;
  }
}

/**
 * Fetch all bounties submitted by a specific wallet.
 */
export async function fetchBountiesBySubmitter(
  submitter: PublicKey
): Promise<OnChainBounty[]> {
  const all = await fetchAllBounties();
  return all.filter(b => b.account.submitter.equals(submitter));
}

/**
 * Fetch all bounties claimed by a specific wallet.
 */
export async function fetchBountiesByFactChecker(
  factChecker: PublicKey
): Promise<OnChainBounty[]> {
  const all = await fetchAllBounties();
  return all.filter(b => b.account.factChecker.equals(factChecker));
}

/**
 * Fetch the reputation score for a wallet (0 if no account yet).
 */
export async function fetchReputation(wallet: PublicKey): Promise<number> {
  const provider = getReadonlyProvider();
  const program  = getProgram(provider);
  const [repPda] = deriveReputationPda(wallet);

  try {
    // @ts-ignore
    const rep = await program.account.userReputation.fetch(repPda);
    return (rep.score as BN).toNumber();
  } catch {
    return 0;
  }
}

/**
 * Get SOL balance of a wallet in SOL (float).
 */
export async function fetchSolBalance(wallet: PublicKey): Promise<number> {
  const conn = new Connection(DEVNET_ENDPOINT, 'confirmed');
  const lamports = await conn.getBalance(wallet);
  return lamports / LAMPORTS_PER_SOL;
}

// ─── Write operations ─────────────────────────────────────────────────────────

/**
 * Create a new bounty and lock SOL in escrow.
 * Returns: { txSignature, bountyPda, bountyId }
 */
export async function createBounty(params: {
  wallet: AnchorWallet;
  stakeSOL: number;
}): Promise<{ txSignature: string; bountyPda: PublicKey; bountyId: BN }> {
  const { wallet, stakeSOL } = params;

  const provider = getSigningProvider(wallet);
  const program  = getProgram(provider);

  // Use a timestamp-based bounty ID to avoid collisions
  const bountyId = new BN(Date.now());
  const stakeLamports = new BN(Math.round(stakeSOL * LAMPORTS_PER_SOL));

  const [bountyPda] = await deriveBountyPda(wallet.publicKey, bountyId);
  const [escrowPda] = await deriveEscrowPda(bountyPda);

  // @ts-ignore
  const txSignature = await program.methods
    .createBounty(bountyId, stakeLamports)
    .accounts({
      submitter:    wallet.publicKey,
      bounty:       bountyPda,
      escrowVault:  escrowPda,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();

  return { txSignature, bountyPda, bountyId };
}

/**
 * Claim an open bounty as a fact-checker.
 * Returns the transaction signature.
 */
export async function claimBounty(params: {
  wallet: AnchorWallet;
  bountyPda: PublicKey;
}): Promise<string> {
  const { wallet, bountyPda } = params;
  const provider = getSigningProvider(wallet);
  const program  = getProgram(provider);

  // @ts-ignore
  const txSignature = await program.methods
    .claimBounty()
    .accounts({
      factChecker: wallet.publicKey,
      bounty:      bountyPda,
    })
    .rpc();

  return txSignature;
}

/**
 * Submit a verdict for a claimed bounty.
 * `verdict` = true means "claim is TRUE/Accepted", false means "FALSE/Rejected"
 * `evidenceIpfsHash` can be an IPFS CID or any ≤128-char string.
 */
export async function submitVerdict(params: {
  wallet: AnchorWallet;
  bountyPda: PublicKey;
  verdict: boolean;
  evidenceIpfsHash: string;
}): Promise<string> {
  const { wallet, bountyPda, verdict, evidenceIpfsHash } = params;
  const provider = getSigningProvider(wallet);
  const program  = getProgram(provider);

  // @ts-ignore
  const txSignature = await program.methods
    .submitVerdict(verdict, evidenceIpfsHash)
    .accounts({
      factChecker: wallet.publicKey,
      bounty:      bountyPda,
    })
    .rpc();

  return txSignature;
}
