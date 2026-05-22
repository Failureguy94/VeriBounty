/**
 * blockchain.ts  –  "Phase 2" real blockchain layer
 * ───────────────────────────────────────────────────
 * Replaces mockBlockchain.ts.  All reads come from the on-chain program;
 * off-chain metadata (claim text, description, category, tags) is stored in
 * the backend MongoDB via the REST API.
 */

import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import type { AnchorWallet } from '@solana/wallet-adapter-react';

import {
  fetchAllBounties,
  fetchBountyByPda,
  fetchBountiesBySubmitter,
  fetchBountiesByFactChecker,
  fetchReputation,
  fetchSolBalance,
  createBounty as anchorCreateBounty,
  claimBounty as anchorClaimBounty,
  submitVerdict as anchorSubmitVerdict,
  statusToString,
  resolutionToString,
  type OnChainBounty,
} from './anchorClient';

import type { Bounty, UserProfile, ChainStatus } from '../types';
import { chainStatusToUI } from '../types';

// ─── Config ───────────────────────────────────────────────────────────────────

const BACKEND_URL: string = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000';
const DEFAULT_PUBKEY = '11111111111111111111111111111111';

// ─── Off-chain metadata type (matches MongoDB Claim schema) ───────────────────

interface BountyMeta {
  bountyPDA:       string;
  claimText:       string;   // what the user typed as "claim"
  description:     string;
  category:        string;
  tags:            string[];
  submitterWallet: string;
  solAmount:       number;
  expiresAt:       number;
  createdAt:       number;
}

interface BackendEvidence {
  _id:              string;
  bountyPDA:        string;
  factCheckerWallet: string;
  evidenceText:     string;
  sourceURLs:       string[];
  ipfsHash:         string;
  verdict:          boolean;
  createdAt:        string;
}

// ─── Metadata helpers ─────────────────────────────────────────────────────────

async function fetchMeta(bountyPda: string): Promise<BountyMeta | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/claims/${bountyPda}`);
    if (!res.ok) return null;
    const d = await res.json();
    // Normalise date fields from ISO strings to timestamps
    return {
      ...d,
      createdAt: d.createdAt ? new Date(d.createdAt).getTime() : Date.now(),
      expiresAt: d.expiresAt ? new Date(d.expiresAt).getTime() : Date.now() + 30 * 24 * 60 * 60 * 1000,
    } as BountyMeta;
  } catch {
    return null;
  }
}

async function fetchAllMeta(): Promise<BountyMeta[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/claims`);
    if (!res.ok) return [];
    const arr: BountyMeta[] = await res.json();
    return arr.map(d => ({
      ...d,
      createdAt: d.createdAt ? new Date(d.createdAt).getTime() : Date.now(),
      expiresAt: d.expiresAt ? new Date(d.expiresAt).getTime() : Date.now() + 30 * 24 * 60 * 60 * 1000,
    }));
  } catch {
    return [];
  }
}

async function saveMeta(meta: BountyMeta): Promise<void> {
  await fetch(`${BACKEND_URL}/claims`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(meta),
  });
}

// ─── Evidence helpers ─────────────────────────────────────────────────────────

async function fetchEvidenceByPda(bountyPda: string): Promise<BackendEvidence[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/evidence/${bountyPda}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function fetchAllEvidence(): Promise<BackendEvidence[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/evidence`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

function adaptEvidence(be: BackendEvidence): import('../types').Evidence {
  return {
    id: be._id,
    submitter: be.factCheckerWallet,
    content: be.evidenceText,
    url: be.sourceURLs?.[0],
    timestamp: new Date(be.createdAt).getTime(),
    upvotes: 0,
  };
}

// ─── Adapter: OnChainBounty → Bounty ─────────────────────────────────────────

function adaptBounty(
  onChain: OnChainBounty,
  meta: BountyMeta | null,
  evidenceItems: import('../types').Evidence[] = [],
): Bounty {
  const pda    = onChain.publicKey.toBase58();
  const acc    = onChain.account;
  const cs     = statusToString(acc.status) as ChainStatus;
  const stakeLamports = acc.stakeLamports instanceof BN
    ? acc.stakeLamports
    : new BN(acc.stakeLamports.toString());

  const stakeSOL = stakeLamports.toNumber() / LAMPORTS_PER_SOL;
  const resolution = resolutionToString(acc.resolution);

  const factCheckerAddr = acc.factChecker.toBase58();
  const isUnclaimed     = factCheckerAddr === DEFAULT_PUBKEY;

  // If there's an on-chain verdict, synthesise a minimal Verdict object
  const verdict = acc.submittedVerdict !== null && !isUnclaimed
    ? {
        factChecker: factCheckerAddr,
        result: acc.submittedVerdict ? ('true' as const) : ('false' as const),
        explanation: acc.evidenceIpfsHash
          ? `Evidence: ${acc.evidenceIpfsHash}`
          : 'No explanation provided.',
        timestamp: Date.now(),
        confidence: 100,
      }
    : undefined;

  return {
    id:              pda,
    bountyId:        acc.bountyId.toString(),
    claim:           meta?.claimText   ?? `Bounty ${pda.slice(0, 8)}`,
    description:     meta?.description ?? 'No description stored.',
    stakeAmount:     stakeSOL,
    stakeLamports:   stakeLamports.toString(),
    status:          chainStatusToUI(cs),
    chainStatus:     cs,
    submitter:       acc.submitter.toBase58(),
    factChecker:     isUnclaimed ? '' : factCheckerAddr,
    submittedVerdict: acc.submittedVerdict,
    evidenceIpfsHash: acc.evidenceIpfsHash,
    resolution,
    createdAt:       meta?.createdAt   ?? Date.now(),
    expiresAt:       meta?.expiresAt   ?? Date.now() + 30 * 24 * 60 * 60 * 1000,
    category:        meta?.category    ?? 'Other',
    tags:            meta?.tags        ?? [],
    evidence:        evidenceItems,
    verdict,
    totalSubmissions: evidenceItems.length,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Fetch ALL on-chain bounties, enriched with off-chain metadata & evidence. */
export async function fetchBounties(): Promise<Bounty[]> {
  const [chainBounties, allMeta, allEvidence] = await Promise.all([
    fetchAllBounties(),
    fetchAllMeta(),
    fetchAllEvidence(),
  ]);

  const metaMap = new Map<string, BountyMeta>(
    allMeta.map(m => [m.bountyPDA, m])
  );

  // Group evidence by bountyPDA
  const evidenceMap = new Map<string, import('../types').Evidence[]>();
  for (const be of allEvidence) {
    const key = be.bountyPDA;
    if (!evidenceMap.has(key)) evidenceMap.set(key, []);
    evidenceMap.get(key)!.push(adaptEvidence(be));
  }

  return chainBounties.map(b => {
    const pda = b.publicKey.toBase58();
    return adaptBounty(
      b,
      metaMap.get(pda) ?? null,
      evidenceMap.get(pda) ?? [],
    );
  });
}

/** Fetch a single bounty by its PDA (base58). */
export async function fetchBountyById(id: string): Promise<Bounty | null> {
  let pda: PublicKey;
  try {
    pda = new PublicKey(id);
  } catch {
    return null;
  }

  const [onChain, meta, backendEvidence] = await Promise.all([
    fetchBountyByPda(pda),
    fetchMeta(id),
    fetchEvidenceByPda(id),
  ]);

  if (!onChain) return null;
  return adaptBounty(onChain, meta, backendEvidence.map(adaptEvidence));
}

/** Fetch on-chain profile data for a connected wallet. */
export async function fetchUserProfile(
  walletAddress: string
): Promise<UserProfile> {
  const pubkey = new PublicKey(walletAddress);

  const [submitted, claimed, repScore, solBalance] = await Promise.all([
    fetchBountiesBySubmitter(pubkey),
    fetchBountiesByFactChecker(pubkey),
    fetchReputation(pubkey),
    fetchSolBalance(pubkey),
  ]);

  const totalStaked = submitted.reduce((acc, b) => {
    const lamps = b.account.stakeLamports instanceof BN
      ? b.account.stakeLamports
      : new BN(b.account.stakeLamports.toString());
    return acc + lamps.toNumber() / LAMPORTS_PER_SOL;
  }, 0);

  const resolved = claimed.filter(
    b => 'resolved' in b.account.status
  );

  const successRate = claimed.length > 0
    ? Math.round((resolved.length / claimed.length) * 100)
    : 0;

  // Compute earned: sum lamports of resolved bounties where this wallet was
  // the fact-checker AND resolution was Accepted
  const totalEarned = resolved.reduce((acc, b) => {
    if (b.account.resolution && 'accepted' in b.account.resolution) {
      const lamps = b.account.stakeLamports instanceof BN
        ? b.account.stakeLamports
        : new BN(b.account.stakeLamports.toString());
      return acc + lamps.toNumber() / LAMPORTS_PER_SOL;
    }
    return acc;
  }, 0);

  // Dynamic badges based on on-chain activity
  const badges = [];
  if (submitted.length >= 1)
    badges.push({ id: 'first-submit', name: 'First Bounty', description: 'Submitted your first bounty on-chain', icon: '🚀', earnedAt: Date.now() });
  if (claimed.length >= 1)
    badges.push({ id: 'first-claim', name: 'First Claim', description: 'Claimed your first bounty as a fact-checker', icon: '🔍', earnedAt: Date.now() });
  if (repScore >= 5)
    badges.push({ id: 'rep5', name: 'Trusted Verifier', description: 'Earned a reputation score of 5+', icon: '🏆', earnedAt: Date.now() });
  if (totalStaked >= 1)
    badges.push({ id: 'staker', name: 'SOL Staker', description: 'Staked 1+ SOL across bounties', icon: '💎', earnedAt: Date.now() });

  return {
    walletAddress,
    reputationScore:    repScore,
    bountiesSubmitted:  submitted.length,
    bountiesResolved:   resolved.length,
    totalStaked:        parseFloat(totalStaked.toFixed(4)),
    totalEarned:        parseFloat(totalEarned.toFixed(4)),
    successRate,
    solBalance:         parseFloat(solBalance.toFixed(4)),
    badges,
  };
}

// ─── Write operations ─────────────────────────────────────────────────────────

/**
 * Submit a new claim bounty.
 * 1. Sends `create_bounty` tx → locks real SOL in escrow PDA.
 * 2. Stores off-chain metadata (claim text, description, tags…) in backend.
 */
export async function submitClaim(params: {
  wallet: AnchorWallet;
  claim: string;
  description: string;
  stakeAmount: number;  // SOL
  category: string;
  tags: string[];
}): Promise<{ txSignature: string; bountyId: string; bountyPda: string }> {
  const { wallet, claim, description, stakeAmount, category, tags } = params;

  // 1. On-chain: create the bounty & lock SOL
  const { txSignature, bountyPda, bountyId } = await anchorCreateBounty({
    wallet,
    stakeSOL: stakeAmount,
  });

  const pdaStr = bountyPda.toBase58();

  // 2. Off-chain: save metadata to backend
  const now = Date.now();
  await saveMeta({
    bountyPDA:       pdaStr,
    claimText:       claim,
    description,
    category,
    tags,
    submitterWallet: wallet.publicKey.toBase58(),
    solAmount:       stakeAmount,
    createdAt:       now,
    expiresAt:       now + 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  return {
    txSignature,
    bountyId: bountyId.toString(),
    bountyPda: pdaStr,
  };
}

/**
 * Claim an open bounty as a fact-checker.
 * Sends `claim_bounty` tx — no SOL movement, just updates on-chain state.
 */
export async function claimBounty(params: {
  wallet: AnchorWallet;
  bountyPda: string;
}): Promise<string> {
  return anchorClaimBounty({
    wallet: params.wallet,
    bountyPda: new PublicKey(params.bountyPda),
  });
}

/**
 * Submit a fact-checker verdict.
 * Sends `submit_verdict` tx — stores verdict & IPFS hash on-chain.
 */
export async function submitVerdict(params: {
  wallet: AnchorWallet;
  bountyPda: string;
  verdict: boolean;         // true = claim is TRUE
  evidenceIpfsHash: string; // IPFS CID or short description (≤128 chars)
}): Promise<string> {
  return anchorSubmitVerdict({
    wallet: params.wallet,
    bountyPda: new PublicKey(params.bountyPda),
    verdict: params.verdict,
    evidenceIpfsHash: params.evidenceIpfsHash,
  });
}
