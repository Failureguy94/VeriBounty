import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Bounty } from '../types';
import { fetchBountyById, claimBounty, submitVerdict, resolveBounty, cancelBounty } from '../lib/blockchain';
import { TRUSTED_RESOLVER } from '../lib/anchorClient';
import { useAnchorWallet, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import StatusBadge from '../components/StatusBadge';
import toast from 'react-hot-toast';
import {
  ArrowLeft, CheckCircle2, XCircle, AlertTriangle,
  HelpCircle, ThumbsUp, ExternalLink, Copy, Check, Shield, Zap, Gavel, Undo2,
} from 'lucide-react';

const verdictConfig = {
  true:       { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10 border-success/30',   label: '✅ True' },
  false:      { icon: XCircle,      color: 'text-danger',  bg: 'bg-danger/10 border-danger/30',     label: '❌ False' },
  misleading: { icon: AlertTriangle,color: 'text-warning', bg: 'bg-warning/10 border-warning/30',  label: '⚠️ Misleading' },
  unverified: { icon: HelpCircle,   color: 'text-textSecondary', bg: 'bg-surfaceLight border-border', label: '❓ Unverified' },
};

const BountyDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { connected, publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const navigate = useNavigate();

  const [bounty, setBounty] = useState<Bounty | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Claim panel state
  const [claiming, setClaiming] = useState(false);

  // Verdict panel state
  const [showVerdictForm, setShowVerdictForm] = useState(false);
  const [verdictChoice, setVerdictChoice] = useState<boolean | null>(null);
  const [evidenceText, setEvidenceText] = useState('');
  const [submittingVerdict, setSubmittingVerdict] = useState(false);

  // Resolver / cancel state
  const [resolving, setResolving] = useState<'accepted' | 'rejected' | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const loadBounty = () => {
    if (!id) return;
    setLoading(true);
    fetchBountyById(id).then(data => {
      setBounty(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadBounty(); }, [id]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  // ── Claim bounty ────────────────────────────────────────────────────────────
  const handleClaim = async () => {
    if (!anchorWallet || !bounty) return;
    setClaiming(true);
    const toastId = toast.loading('Requesting wallet approval…');
    try {
      const sig = await claimBounty({ wallet: anchorWallet, bountyPda: bounty.id });
      toast.success('Bounty claimed! You are now the fact-checker.', { id: toastId });
      console.log('Claim tx:', sig);
      loadBounty(); // refresh on-chain state
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transaction failed';
      if (msg.includes('User rejected')) toast.error('Transaction cancelled', { id: toastId });
      else toast.error(msg, { id: toastId });
    } finally {
      setClaiming(false);
    }
  };

  // ── Submit verdict ──────────────────────────────────────────────────────────
  const handleSubmitVerdict = async () => {
    if (!anchorWallet || !bounty || verdictChoice === null) return;
    if (!evidenceText.trim() || evidenceText.length > 128) {
      toast.error('Evidence must be 1–128 characters');
      return;
    }
    setSubmittingVerdict(true);
    const toastId = toast.loading('Submitting verdict on-chain…');
    try {
      const result = await submitVerdict({
        wallet: anchorWallet,
        bountyPda: bounty.id,
        verdict: verdictChoice,
        evidenceIpfsHash: evidenceText.trim(),
      });
      result.evidenceSaved ? toast.success('Verdict submitted and evidence synced.', { id: toastId }) : toast.error('Verdict is on-chain, but evidence sync failed.', { id: toastId, duration: 8000 });
      console.log('Verdict tx:', result.txSignature);
      setShowVerdictForm(false);
      loadBounty();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transaction failed';
      if (msg.includes('User rejected')) toast.error('Transaction cancelled', { id: toastId });
      else toast.error(msg, { id: toastId });
    } finally {
      setSubmittingVerdict(false);
    }
  };

  const showTxError = (err: unknown, toastId: string) => {
    const msg = err instanceof Error ? err.message : 'Transaction failed';
    if (msg.includes('User rejected')) toast.error('Transaction cancelled', { id: toastId });
    else toast.error(msg, { id: toastId });
  };

  // ── Resolve (trusted resolver only) ─────────────────────────────────────────
  const handleResolve = async (resolution: 'accepted' | 'rejected') => {
    if (!anchorWallet || !bounty) return;
    setResolving(resolution);
    const toastId = toast.loading('Resolving bounty on-chain…');
    try {
      const sig = await resolveBounty({ wallet: anchorWallet, bountyPda: bounty.id, resolution });
      toast.success(
        resolution === 'accepted' ? 'Verdict accepted — fact-checker paid.' : 'Bounty rejected — stake refunded to submitter.',
        { id: toastId },
      );
      console.log('Resolve tx:', sig);
      loadBounty();
    } catch (err) {
      showTxError(err, toastId);
    } finally {
      setResolving(null);
    }
  };

  // ── Cancel (submitter, open bounties only) ──────────────────────────────────
  const handleCancel = async () => {
    if (!anchorWallet || !bounty) return;
    if (!window.confirm('Cancel this bounty and refund your stake?')) return;
    setCancelling(true);
    const toastId = toast.loading('Cancelling bounty…');
    try {
      const sig = await cancelBounty({ wallet: anchorWallet, bountyPda: bounty.id });
      toast.success('Bounty cancelled — stake refunded.', { id: toastId });
      console.log('Cancel tx:', sig);
      navigate('/'); // the bounty account is closed on-chain
    } catch (err) {
      showTxError(err, toastId);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-surfaceLight rounded w-24" />
          <div className="h-8 bg-surfaceLight rounded w-3/4" />
          <div className="h-4 bg-surfaceLight rounded w-full" />
          <div className="h-48 bg-surfaceLight rounded" />
        </div>
      </div>
    );
  }

  if (!bounty) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-textPrimary mb-2">Bounty not found</h2>
          <p className="text-textSecondary mb-6">This bounty may not exist on-chain, or the ID is invalid.</p>
          <Link to="/" className="btn-primary">Back to Home</Link>
        </div>
      </div>
    );
  }

  const daysLeft = Math.ceil((bounty.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
  const walletAddr = publicKey?.toBase58();
  const isSubmitter   = walletAddr === bounty.submitter;
  const isFactChecker = walletAddr === bounty.factChecker;
  const canClaim      = connected && !isSubmitter && bounty.chainStatus === 'open';
  const canVerdict    = connected && isFactChecker && bounty.chainStatus === 'in-review';
  const isResolver    = walletAddr === TRUSTED_RESOLVER.toBase58();
  const canResolve    = connected && isResolver &&
    (bounty.chainStatus === 'verdict-submitted' || bounty.chainStatus === 'in-review');
  const explorerUrl   = `https://explorer.solana.com/address/${bounty.id}?cluster=devnet`;

  return (
    <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 animate-fadeIn">
      {/* Back */}
      <Link to="/" className="inline-flex items-center gap-1.5 text-textSecondary hover:text-textPrimary text-sm mb-6 transition-colors">
        <ArrowLeft size={15} /> Back to Bounties
      </Link>

      {/* Header */}
      <div className="card mb-6">
        <div className="flex items-center gap-3 mb-4">
          <StatusBadge status={bounty.status} size="md" />
          <span className="text-textSecondary text-sm">{bounty.category}</span>
          <span className="text-border">·</span>
          <span className="text-textSecondary text-sm">{formatDate(bounty.createdAt)}</span>
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-xs text-accent hover:text-accentLight inline-flex items-center gap-1 transition-colors"
          >
            Explorer <ExternalLink size={10} />
          </a>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-textPrimary leading-snug mb-3">
          {bounty.claim}
        </h1>

        <p className="text-textSecondary leading-relaxed mb-5">{bounty.description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-5">
          {bounty.tags.map(tag => (
            <span key={tag} className="text-xs px-2.5 py-1 rounded-md bg-surfaceLight text-textSecondary border border-border/60">
              #{tag}
            </span>
          ))}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border/40">
          <div className="text-center">
            <div className="text-primary font-bold text-lg">{bounty.stakeAmount.toFixed(4)} SOL</div>
            <div className="text-textSecondary text-xs mt-0.5">Staked</div>
          </div>
          <div className="text-center">
            <div className="text-textPrimary font-bold text-lg">{bounty.chainStatus}</div>
            <div className="text-textSecondary text-xs mt-0.5">Chain Status</div>
          </div>
          <div className="text-center">
            <div className="text-textPrimary font-bold text-lg">
              {bounty.resolution ?? '—'}
            </div>
            <div className="text-textSecondary text-xs mt-0.5">Resolution</div>
          </div>
          <div className="text-center">
            <div className={`font-bold text-lg ${daysLeft > 0 ? 'text-warning' : 'text-danger'}`}>
              {daysLeft > 0 ? `${daysLeft}d` : 'Expired'}
            </div>
            <div className="text-textSecondary text-xs mt-0.5">Remaining</div>
          </div>
        </div>
      </div>

      {/* ── ACTION PANELS ── */}

      {/* Claim bounty */}
      {bounty.chainStatus === 'open' && (
        <div className="card mb-6 border border-accent/30 bg-accent/5">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-textPrimary">Claim this Bounty</h2>
          </div>
          <p className="text-textSecondary text-sm mb-4">
            Claim this bounty to become the assigned fact-checker. You'll then need to investigate and submit a verdict on-chain.
          </p>
          {!connected ? (
            <WalletMultiButton />
          ) : isSubmitter ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-textSecondary text-xs italic flex-1">You submitted this bounty and cannot claim your own.</p>
              <button
                id="cancel-bounty-btn"
                onClick={handleCancel}
                disabled={cancelling}
                className="btn-secondary flex items-center gap-2"
              >
                {cancelling ? 'Cancelling…' : (<><Undo2 size={15} /> Cancel &amp; Refund</>)}
              </button>
            </div>
          ) : (
            <button
              id="claim-bounty-btn"
              onClick={handleClaim}
              disabled={claiming || !canClaim}
              className="btn-primary flex items-center gap-2"
            >
              {claiming ? (
                <><span className="w-4 h-4 border-2 border-background/40 border-t-background rounded-full animate-spin" /> Waiting…</>
              ) : (
                <><Shield size={15} /> Claim Bounty</>
              )}
            </button>
          )}
        </div>
      )}

      {/* Submit verdict (fact-checker only) */}
      {canVerdict && (
        <div className="card mb-6 border border-warning/30 bg-warning/5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={16} className="text-warning" />
            <h2 className="text-sm font-semibold text-textPrimary">Submit Your Verdict</h2>
          </div>

          {!showVerdictForm ? (
            <button
              id="open-verdict-form-btn"
              onClick={() => setShowVerdictForm(true)}
              className="btn-primary"
            >
              Open Verdict Form
            </button>
          ) : (
            <div className="space-y-4">
              {/* Verdict choice */}
              <div>
                <p className="label mb-2">Is the claim TRUE or FALSE?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setVerdictChoice(true)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                      verdictChoice === true
                        ? 'bg-success/20 border-success text-success'
                        : 'border-border text-textSecondary hover:border-success/50'
                    }`}
                  >
                    ✅ TRUE
                  </button>
                  <button
                    onClick={() => setVerdictChoice(false)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                      verdictChoice === false
                        ? 'bg-danger/20 border-danger text-danger'
                        : 'border-border text-textSecondary hover:border-danger/50'
                    }`}
                  >
                    ❌ FALSE
                  </button>
                </div>
              </div>

              {/* Evidence */}
              <div>
                <label className="label">Evidence / IPFS Hash <span className="text-textSecondary/60">(max 128 chars)</span></label>
                <input
                  type="text"
                  value={evidenceText}
                  onChange={e => setEvidenceText(e.target.value)}
                  className="input-field"
                  placeholder="Short evidence summary or IPFS CID…"
                  maxLength={128}
                />
                <span className="text-xs text-textSecondary mt-1 block">{evidenceText.length}/128</span>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowVerdictForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button
                  id="submit-verdict-btn"
                  onClick={handleSubmitVerdict}
                  disabled={submittingVerdict || verdictChoice === null || !evidenceText.trim()}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {submittingVerdict ? (
                    <><span className="w-4 h-4 border-2 border-background/40 border-t-background rounded-full animate-spin" /> Submitting…</>
                  ) : 'Submit Verdict On-Chain'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resolve (trusted resolver only) */}
      {canResolve && (
        <div className="card mb-6 border border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2 mb-3">
            <Gavel size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-textPrimary">Resolve Bounty</h2>
          </div>
          {bounty.chainStatus === 'verdict-submitted' ? (
            <>
              <p className="text-textSecondary text-sm mb-4">
                Accept pays {bounty.stakeAmount.toFixed(4)} SOL to the fact-checker and increases their reputation.
                Reject refunds the stake to the submitter.
              </p>
              <div className="flex gap-3">
                <button
                  id="resolve-accept-btn"
                  onClick={() => handleResolve('accepted')}
                  disabled={resolving !== null}
                  className="btn-primary flex-1"
                >
                  {resolving === 'accepted' ? 'Resolving…' : 'Accept Verdict'}
                </button>
                <button
                  id="resolve-reject-btn"
                  onClick={() => handleResolve('rejected')}
                  disabled={resolving !== null}
                  className="btn-secondary flex-1"
                >
                  {resolving === 'rejected' ? 'Resolving…' : 'Reject Verdict'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-textSecondary text-sm mb-4">
                This bounty was claimed but no verdict has been submitted. If the fact-checker has abandoned it,
                you can refund the stake to the submitter.
              </p>
              <button
                id="resolve-refund-btn"
                onClick={() => handleResolve('rejected')}
                disabled={resolving !== null}
                className="btn-secondary"
              >
                {resolving ? 'Refunding…' : 'Refund Submitter'}
              </button>
            </>
          )}
        </div>
      )}

      {/* On-chain verdict */}
      {bounty.verdict && (
        <div className={`card mb-6 border ${verdictConfig[bounty.verdict.result].bg}`}>
          <h2 className="text-sm font-semibold text-textSecondary uppercase tracking-wider mb-3">
            On-chain Verdict
          </h2>
          <div className={`text-2xl font-extrabold ${verdictConfig[bounty.verdict.result].color} mb-2`}>
            {verdictConfig[bounty.verdict.result].label}
          </div>
          <p className="text-textSecondary leading-relaxed mb-4">{bounty.verdict.explanation}</p>

          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-textSecondary">Fact-checker: </span>
              <button
                onClick={() => copyToClipboard(bounty.verdict!.factChecker)}
                className="font-mono text-accentLight hover:text-accent transition-colors inline-flex items-center gap-1"
              >
                {bounty.verdict.factChecker.slice(0, 8)}…{bounty.verdict.factChecker.slice(-4)}
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
            {bounty.evidenceIpfsHash && (
              <div>
                <span className="text-textSecondary">Evidence: </span>
                <code className="text-xs text-accent">{bounty.evidenceIpfsHash}</code>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Evidence list (off-chain) */}
      <div className="mb-6">
        <h2 className="section-title flex items-center gap-2">
          <ThumbsUp size={18} /> Evidence ({bounty.evidence.length})
        </h2>

        {bounty.evidence.length === 0 ? (
          <div className="card text-center py-10 text-textSecondary">
            <div className="text-3xl mb-3">📝</div>
            <p>No off-chain evidence submitted yet.</p>
          </div>
        ) : (
          <div className="space-y-4 stagger-children">
            {bounty.evidence.map((ev, i) => (
              <div key={ev.id} className="card animate-fadeInUp" style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <code className="text-xs text-accentLight font-mono">{ev.submitter}</code>
                  <div className="flex items-center gap-1 text-textSecondary text-xs">
                    <ThumbsUp size={12} />
                    {ev.upvotes}
                  </div>
                </div>
                <p className="text-textPrimary text-sm leading-relaxed mb-3">{ev.content}</p>
                <div className="flex items-center justify-between text-xs text-textSecondary">
                  <span>{formatDate(ev.timestamp)}</span>
                  {ev.url && (
                    <a href={ev.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-accent hover:text-accentLight transition-colors">
                      Source <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submitter */}
      <div className="card">
        <h2 className="text-sm font-semibold text-textSecondary uppercase tracking-wider mb-3">
          Submitted By
        </h2>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center">
            <span className="text-accentLight text-sm font-bold">
              {bounty.submitter.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <button
              onClick={() => copyToClipboard(bounty.submitter)}
              className="font-mono text-accentLight text-sm hover:text-accent transition-colors inline-flex items-center gap-1"
            >
              {bounty.submitter.slice(0, 8)}…{bounty.submitter.slice(-4)}
              <Copy size={11} />
            </button>
            <div className="text-textSecondary text-xs mt-0.5">{formatDate(bounty.createdAt)}</div>
          </div>
          {bounty.factChecker && (
            <div className="ml-auto text-right">
              <div className="text-xs text-textSecondary mb-0.5">Fact-checker</div>
              <code className="text-xs text-accent font-mono">
                {bounty.factChecker.slice(0, 8)}…{bounty.factChecker.slice(-4)}
              </code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BountyDetailPage;
