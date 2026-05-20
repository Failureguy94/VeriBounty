// ─── On-chain status (mirrors the Anchor enum) ───────────────────────────────
export type ChainStatus =
  | 'open'
  | 'in-review'
  | 'verdict-submitted'
  | 'resolved';

// ─── UI-friendly status (kept for display / filter components) ───────────────
export type BountyStatus = 'open' | 'in-review' | 'resolved' | 'disputed';

// Map chain status → UI display status
export function chainStatusToUI(s: ChainStatus): BountyStatus {
  switch (s) {
    case 'open':              return 'open';
    case 'in-review':         return 'in-review';
    case 'verdict-submitted': return 'in-review'; // still under review
    case 'resolved':          return 'resolved';
    default:                  return 'open';
  }
}

// ─── Evidence (off-chain, stored in backend DB) ───────────────────────────────
export interface Evidence {
  id: string;
  submitter: string;
  content: string;
  url?: string;
  timestamp: number;
  upvotes: number;
}

// ─── Verdict (derived from on-chain + off-chain data) ────────────────────────
export interface Verdict {
  factChecker: string;
  result: 'true' | 'false' | 'misleading' | 'unverified';
  explanation: string;
  timestamp: number;
  confidence: number; // 0-100
}

// ─── Core Bounty type — mirrors the on-chain Bounty account ──────────────────
export interface Bounty {
  /** Base58 address of the Bounty PDA */
  id: string;
  /** On-chain bounty_id (u64 as string to avoid BigInt issues in JSON) */
  bountyId: string;
  claim: string;
  description: string;
  /** In SOL (converted from lamports) */
  stakeAmount: number;
  /** Raw lamports stored on chain */
  stakeLamports: string;
  status: BountyStatus;
  chainStatus: ChainStatus;
  /** Base58 address of the submitter wallet */
  submitter: string;
  /** Base58 address of the fact-checker wallet (default pubkey if unclaimed) */
  factChecker: string;
  /** Whether a verdict has been submitted on-chain */
  submittedVerdict: boolean | null;
  /** IPFS hash / evidence reference stored on-chain */
  evidenceIpfsHash: string;
  /** Resolution: 'accepted' | 'rejected' | null */
  resolution: 'accepted' | 'rejected' | null;
  createdAt: number;
  expiresAt: number;
  category: string;
  evidence: Evidence[];
  verdict?: Verdict;
  totalSubmissions: number;
  tags: string[];
}

// ─── User Profile ─────────────────────────────────────────────────────────────
export interface UserProfile {
  walletAddress: string;
  reputationScore: number;
  bountiesSubmitted: number;
  bountiesResolved: number;
  totalStaked: number;
  totalEarned: number;
  successRate: number; // percentage
  solBalance: number;
  badges: Badge[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: number;
}
