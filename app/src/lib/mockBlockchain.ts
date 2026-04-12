import { Bounty, UserProfile } from '../types';
import { mockBounties, mockUserProfile } from './mockData';

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function fetchBounties(): Promise<Bounty[]> {
  await delay(600);
  return [...mockBounties];
}

export async function fetchBountyById(id: string): Promise<Bounty | null> {
  await delay(400);
  return mockBounties.find(b => b.id === id) ?? null;
}

export async function fetchUserProfile(_walletAddress?: string): Promise<UserProfile> {
  await delay(500);
  return { ...mockUserProfile };
}

export async function submitClaim(params: {
  claim: string;
  description: string;
  stakeAmount: number;
  category: string;
  tags: string[];
}): Promise<{ txSignature: string; bountyId: string }> {
  await delay(1200);
  // Simulate occasional failure for demo
  if (Math.random() < 0.05) {
    throw new Error('Transaction failed: insufficient funds');
  }
  return {
    txSignature: `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
    bountyId: Math.random().toString(36).substring(2, 9),
  };
}

export async function stakeSol(params: {
  bountyId: string;
  amount: number;
  walletAddress: string;
}): Promise<{ txSignature: string }> {
  await delay(800);
  console.log('[mock] Staking SOL:', params);
  return {
    txSignature: `${Math.random().toString(36).substring(2, 15)}`,
  };
}

export async function submitEvidence(params: {
  bountyId: string;
  content: string;
  url?: string;
  walletAddress: string;
}): Promise<{ evidenceId: string }> {
  await delay(700);
  console.log('[mock] Submitting evidence:', params);
  return { evidenceId: Math.random().toString(36).substring(2, 9) };
}
