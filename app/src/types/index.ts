export type BountyStatus = 'open' | 'in-review' | 'resolved' | 'disputed';

export interface Evidence {
  id: string;
  submitter: string;
  content: string;
  url?: string;
  timestamp: number;
  upvotes: number;
}

export interface Verdict {
  factChecker: string;
  result: 'true' | 'false' | 'misleading' | 'unverified';
  explanation: string;
  timestamp: number;
  confidence: number; // 0-100
}

export interface Bounty {
  id: string;
  claim: string;
  description: string;
  stakeAmount: number; // SOL
  status: BountyStatus;
  submitter: string;
  createdAt: number;
  expiresAt: number;
  category: string;
  evidence: Evidence[];
  verdict?: Verdict;
  totalSubmissions: number;
  tags: string[];
}

export interface UserProfile {
  walletAddress: string;
  username: string;
  reputationScore: number;
  bountiesSubmitted: number;
  bountiesResolved: number;
  totalStaked: number;
  totalEarned: number;
  successRate: number; // percentage
  joinedAt: number;
  badges: Badge[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: number;
}
