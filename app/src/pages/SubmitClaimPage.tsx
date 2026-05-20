import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { submitClaim } from '../lib/blockchain';
import toast from 'react-hot-toast';
import { FileText, Coins, Tag, ChevronDown, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

const CATEGORIES = ['Technology', 'Health', 'Finance', 'Policy', 'Science', 'Politics', 'Environment', 'Other'];

interface FormData {
  claim: string;
  description: string;
  stakeAmount: string;
  category: string;
  tags: string;
}

const SubmitClaimPage = () => {
  const { connected } = useWallet();
  const anchorWallet = useAnchorWallet();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormData>({
    claim: '',
    description: '',
    stakeAmount: '',
    category: 'Technology',
    tags: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{
    txSignature: string;
    bountyId: string;
    bountyPda: string;
  } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connected || !anchorWallet) {
      toast.error('Please connect your wallet first');
      return;
    }

    const stake = parseFloat(form.stakeAmount);
    if (!form.claim.trim() || form.claim.length < 20) {
      toast.error('Claim must be at least 20 characters');
      return;
    }
    if (!form.description.trim() || form.description.length < 50) {
      toast.error('Description must be at least 50 characters');
      return;
    }
    if (isNaN(stake) || stake < 0.1) {
      toast.error('Minimum stake is 0.1 SOL');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Requesting wallet approval…');

    try {
      const result = await submitClaim({
        wallet:      anchorWallet,
        claim:       form.claim.trim(),
        description: form.description.trim(),
        stakeAmount: stake,
        category:    form.category,
        tags:        form.tags.split(',').map(t => t.trim()).filter(Boolean),
      });

      toast.success('Bounty created & SOL locked on-chain! 🎉', { id: toastId });
      setSuccess(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transaction failed';
      // Surface user-friendly message for common Anchor errors
      if (msg.includes('0x1')) {
        toast.error('Insufficient SOL balance', { id: toastId });
      } else if (msg.includes('User rejected')) {
        toast.error('Transaction cancelled', { id: toastId });
      } else {
        toast.error(msg, { id: toastId });
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const explorerUrl = `https://explorer.solana.com/tx/${success.txSignature}?cluster=devnet`;
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="card max-w-md w-full text-center animate-fadeInUp">
          <div className="w-16 h-16 rounded-full bg-success/15 border border-success/30 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={32} className="text-success" />
          </div>
          <h2 className="text-2xl font-bold text-textPrimary mb-1">Bounty Created!</h2>
          <p className="text-textSecondary mb-6 text-sm">
            SOL has been locked in the escrow vault on Solana Devnet.
          </p>

          <div className="bg-surfaceLight rounded-lg p-4 mb-6 text-left space-y-3">
            <div>
              <span className="label">Bounty PDA</span>
              <code className="text-primary font-mono text-xs break-all">{success.bountyPda}</code>
            </div>
            <div>
              <span className="label">Bounty ID</span>
              <code className="text-accentLight font-mono text-sm">{success.bountyId}</code>
            </div>
            <div>
              <span className="label">Transaction</span>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-accent hover:text-accentLight text-xs font-mono break-all transition-colors"
              >
                {success.txSignature.slice(0, 32)}…
                <ExternalLink size={11} />
              </a>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setSuccess(null);
                setForm({ claim: '', description: '', stakeAmount: '', category: 'Technology', tags: '' });
              }}
              className="btn-secondary flex-1"
            >
              Submit Another
            </button>
            <button onClick={() => navigate('/')} className="btn-primary flex-1">
              Browse Bounties
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-textPrimary mb-2">Submit a Claim</h1>
        <p className="text-textSecondary">
          Stake <strong>real SOL</strong> to open a fact-checking bounty on Solana Devnet. Fact-checkers investigate and earn rewards.
        </p>
      </div>

      {/* Wallet gate */}
      {!connected && (
        <div className="card mb-6 flex items-center gap-4 bg-warning/5 border-warning/30">
          <AlertCircle size={20} className="text-warning flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-textPrimary font-medium">Wallet not connected</p>
            <p className="text-xs text-textSecondary">Connect your Solana wallet to submit a claim and stake SOL</p>
          </div>
          <WalletMultiButton />
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="card space-y-5">
        {/* Claim */}
        <div>
          <label className="label flex items-center gap-1.5">
            <FileText size={13} /> Claim Statement *
          </label>
          <input
            type="text"
            name="claim"
            value={form.claim}
            onChange={handleChange}
            className="input-field"
            placeholder="Enter the specific claim you want fact-checked..."
            maxLength={200}
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-textSecondary">Min 20 characters</span>
            <span className="text-xs text-textSecondary">{form.claim.length}/200</span>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="label flex items-center gap-1.5">
            <FileText size={13} /> Detailed Description *
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            className="input-field resize-none"
            placeholder="Provide context about where this claim appeared, why it's important to verify..."
            maxLength={1000}
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-textSecondary">Min 50 characters</span>
            <span className="text-xs text-textSecondary">{form.description.length}/1000</span>
          </div>
        </div>

        {/* Category + Stake */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Category *</label>
            <div className="relative">
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="input-field appearance-none pr-9"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="label flex items-center gap-1.5">
              <Coins size={13} /> Stake Amount (SOL) *
            </label>
            <input
              type="number"
              name="stakeAmount"
              value={form.stakeAmount}
              onChange={handleChange}
              className="input-field"
              placeholder="e.g. 0.1"
              min="0.1"
              step="0.01"
            />
            <span className="text-xs text-textSecondary mt-1 block">Min 0.1 SOL • Locked in escrow</span>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="label flex items-center gap-1.5">
            <Tag size={13} /> Tags <span className="text-textSecondary/60">(optional)</span>
          </label>
          <input
            type="text"
            name="tags"
            value={form.tags}
            onChange={handleChange}
            className="input-field"
            placeholder="Bitcoin, Elon Musk, Climate (comma-separated)"
          />
        </div>

        {/* Bounty preview */}
        {(form.stakeAmount || form.claim) && (
          <div className="bg-surfaceLight rounded-lg p-4 border border-border/40 text-sm space-y-2">
            <p className="text-textSecondary font-medium text-xs uppercase tracking-wider mb-2">Transaction Preview</p>
            {form.stakeAmount && parseFloat(form.stakeAmount) > 0 && (
              <p className="text-textSecondary">
                You will stake: <span className="text-primary font-bold">{form.stakeAmount} SOL</span>
                {' '}→ locked in escrow PDA
              </p>
            )}
            <p className="text-textSecondary text-xs">
              A Solana wallet approval dialog will appear. Once confirmed, SOL is transferred to the program escrow on Devnet.
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          id="submit-claim-btn"
          className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
          disabled={loading || !connected}
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-background/40 border-t-background rounded-full animate-spin" />
              Waiting for wallet…
            </>
          ) : (
            <>
              <Coins size={16} />
              Submit & Stake SOL On-Chain
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default SubmitClaimPage;
