import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { fetchUserProfile } from '../lib/blockchain';
import { UserProfile } from '../types';
import {
  TrendingUp, Shield, Award, Coins, Star,
  CheckCircle2, BarChart2, Calendar, RefreshCw, ExternalLink,
} from 'lucide-react';

const MyProfilePage = () => {
  const { connected, publicKey } = useWallet();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const walletDisplay = publicKey
    ? `${publicKey.toBase58().slice(0, 6)}...${publicKey.toBase58().slice(-4)}`
    : '—';

  const loadProfile = () => {
    if (!connected || !publicKey) return;
    setLoading(true);
    setError(null);
    fetchUserProfile(publicKey.toBase58())
      .then(p => { setProfile(p); setLoading(false); })
      .catch(err => {
        console.error(err);
        setError('Failed to load on-chain data. Make sure you are on Devnet.');
        setLoading(false);
      });
  };

  useEffect(() => { loadProfile(); }, [connected, publicKey]);

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

  const explorerUrl = publicKey
    ? `https://explorer.solana.com/address/${publicKey.toBase58()}?cluster=devnet`
    : '#';

  if (!connected) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="card max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center mx-auto mb-5">
            <Shield size={28} className="text-accent" />
          </div>
          <h2 className="text-xl font-bold text-textPrimary mb-2">Connect Your Wallet</h2>
          <p className="text-textSecondary text-sm mb-6">
            Connect your Solana wallet to view your on-chain reputation, staking history, and earned rewards.
          </p>
          <WalletMultiButton />
        </div>
      </div>
    );
  }

  if (loading || !profile) {
    return (
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-12">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-surfaceLight" />
            <div className="space-y-2">
              <div className="h-5 bg-surfaceLight rounded w-32" />
              <div className="h-3 bg-surfaceLight rounded w-24" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-surfaceLight rounded-xl" />)}
          </div>
          <p className="text-textSecondary text-sm text-center mt-4">Fetching on-chain data from Devnet…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="card max-w-sm w-full text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-bold text-textPrimary mb-2">Could not load profile</h2>
          <p className="text-textSecondary text-sm mb-4">{error}</p>
          <button onClick={loadProfile} className="btn-primary flex items-center gap-2 mx-auto">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Reputation Score', value: profile.reputationScore.toLocaleString(), icon: Star, color: 'text-primary' },
    { label: 'SOL Balance',      value: `${profile.solBalance} SOL`,              icon: Coins, color: 'text-accent' },
    { label: 'Total Earned',     value: `${profile.totalEarned} SOL`,             icon: TrendingUp, color: 'text-success' },
    { label: 'Success Rate',     value: `${profile.successRate}%`,                icon: BarChart2, color: 'text-warning' },
  ];

  return (
    <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-12 animate-fadeIn">
      {/* Profile header */}
      <div className="card mb-6">
        <div className="flex items-center gap-5 mb-5">
          <div className="w-16 h-16 rounded-full bg-gold-gradient flex items-center justify-center shadow-glow-gold flex-shrink-0">
            <span className="text-2xl font-extrabold text-background">
              {walletDisplay.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-textPrimary font-mono">{walletDisplay}</h1>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accentLight text-xs hover:text-accent transition-colors inline-flex items-center gap-1 mt-0.5"
            >
              View on Explorer <ExternalLink size={10} />
            </a>
            <div className="flex items-center gap-1.5 mt-1 text-textSecondary text-xs">
              <Calendar size={12} />
              Live on Solana Devnet
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-1">
            <div className="text-3xl font-extrabold text-primary">{profile.reputationScore}</div>
            <div className="text-textSecondary text-xs">Rep Score</div>
            <button
              onClick={loadProfile}
              className="text-xs text-textSecondary hover:text-textPrimary transition-colors flex items-center gap-1 mt-1"
            >
              <RefreshCw size={10} /> Refresh
            </button>
          </div>
        </div>

        {/* Success rate bar */}
        {profile.bountiesResolved + profile.bountiesSubmitted > 0 && (
          <div>
            <div className="flex justify-between text-xs text-textSecondary mb-1.5">
              <span>Success Rate</span>
              <span className="font-medium text-textPrimary">{profile.successRate}%</span>
            </div>
            <div className="h-2 bg-surfaceLight rounded-full overflow-hidden">
              <div
                className="h-full bg-gold-gradient rounded-full transition-all duration-700"
                style={{ width: `${profile.successRate}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card text-center">
            <Icon size={18} className={`${color} mx-auto mb-2`} />
            <div className={`text-xl font-extrabold ${color} mb-0.5`}>{value}</div>
            <div className="text-textSecondary text-xs">{label}</div>
          </div>
        ))}
      </div>

      {/* Activity row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-accent" />
            <h3 className="text-sm font-semibold text-textPrimary">Bounties Submitted</h3>
          </div>
          <div className="text-3xl font-extrabold text-textPrimary">{profile.bountiesSubmitted}</div>
          <div className="text-textSecondary text-xs mt-1">
            Total: {profile.totalStaked} SOL staked
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={16} className="text-success" />
            <h3 className="text-sm font-semibold text-textPrimary">Verdicts Resolved</h3>
          </div>
          <div className="text-3xl font-extrabold text-success">{profile.bountiesResolved}</div>
          <div className="text-textSecondary text-xs mt-1">Accepted on-chain</div>
        </div>
      </div>

      {/* Badges */}
      <div className="card">
        <h2 className="text-sm font-semibold text-textPrimary flex items-center gap-2 mb-4">
          <Award size={16} className="text-primary" /> Badges ({profile.badges.length})
        </h2>
        {profile.badges.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-3xl mb-2">🎯</div>
            <p className="text-textSecondary text-sm">No badges yet. Submit or verify your first bounty!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {profile.badges.map(badge => (
              <div key={badge.id} className="flex items-center gap-3 bg-surfaceLight rounded-lg p-3 border border-border/40">
                <span className="text-2xl flex-shrink-0">{badge.icon}</span>
                <div className="min-w-0">
                  <p className="text-textPrimary text-sm font-medium">{badge.name}</p>
                  <p className="text-textSecondary text-xs truncate">{badge.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyProfilePage;
