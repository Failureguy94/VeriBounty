export const formatSol = (sol: number): string =>
  `${sol.toLocaleString('en-US', { maximumFractionDigits: 4 })} SOL`;

export const formatDate = (ts: number): string =>
  new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

export const shortAddress = (address: string, chars = 4): string =>
  address.length > chars * 2 + 1 ? `${address.slice(0, chars)}…${address.slice(-chars)}` : address;

export const explorerUrl = (kind: 'address' | 'tx', id: string): string =>
  `https://explorer.solana.com/${kind}/${id}?cluster=devnet`;
