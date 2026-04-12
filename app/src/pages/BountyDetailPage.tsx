import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Bounty } from '../types';
import { fetchBountyById } from '../lib/mockBlockchain';
import StatusBadge from '../components/StatusBadge';
import {
  ArrowLeft,
  Coins,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  ThumbsUp,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

const verdictConfig = {
  true: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10 border-success/30', label: '✅ True' },
  false: { icon: XCircle, color: 'text-danger', bg: 'bg-danger/10 border-danger/30', label: '❌ False' },
  misleading: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10 border-warning/30', label: '⚠️ Misleading' },
  unverified: { icon: HelpCircle, color: 'text-textSecondary', bg: 'bg-surfaceLight border-border', label: '❓ Unverified' },
};

const BountyDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [bounty, setBounty] = useState<Bounty | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchBountyById(id).then(data => {
      setBounty(data);
      setLoading(false);
    });
  }, [id]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

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
          <p className="text-textSecondary mb-6">This bounty may have been removed or doesn't exist.</p>
          <Link to="/" className="btn-primary">Back to Home</Link>
        </div>
      </div>
    );
  }

  const daysLeft = Math.ceil((bounty.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));

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
            <div className="text-primary font-bold text-lg">{bounty.stakeAmount} SOL</div>
            <div className="text-textSecondary text-xs mt-0.5">Staked</div>
          </div>
          <div className="text-center">
            <div className="text-textPrimary font-bold text-lg">{bounty.evidence.length}</div>
            <div className="text-textSecondary text-xs mt-0.5">Evidence</div>
          </div>
          <div className="text-center">
            <div className="text-textPrimary font-bold text-lg">{bounty.totalSubmissions}</div>
            <div className="text-textSecondary text-xs mt-0.5">Submissions</div>
          </div>
          <div className="text-center">
            <div className={`font-bold text-lg ${daysLeft > 0 ? 'text-warning' : 'text-danger'}`}>
              {daysLeft > 0 ? `${daysLeft}d` : 'Expired'}
            </div>
            <div className="text-textSecondary text-xs mt-0.5">Remaining</div>
          </div>
        </div>
      </div>

      {/* Verdict */}
      {bounty.verdict && (
        <div className={`card mb-6 border ${verdictConfig[bounty.verdict.result].bg}`}>
          <h2 className="text-sm font-semibold text-textSecondary uppercase tracking-wider mb-3 flex items-center gap-2">
            Verdict
          </h2>
          <div className={`text-2xl font-extrabold ${verdictConfig[bounty.verdict.result].color} mb-2`}>
            {verdictConfig[bounty.verdict.result].label}
          </div>
          <p className="text-textSecondary leading-relaxed mb-4">{bounty.verdict.explanation}</p>

          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-textSecondary">Confidence: </span>
              <span className={`font-bold ${verdictConfig[bounty.verdict.result].color}`}>
                {bounty.verdict.confidence}%
              </span>
            </div>
            <div>
              <span className="text-textSecondary">Fact-checker: </span>
              <button
                onClick={() => copyToClipboard(bounty.verdict!.factChecker)}
                className="font-mono text-accentLight hover:text-accent transition-colors inline-flex items-center gap-1"
              >
                {bounty.verdict.factChecker}
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
            <div>
              <span className="text-textSecondary">Verified: </span>
              <span className="text-textPrimary">{formatDate(bounty.verdict.timestamp)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Evidence */}
      <div className="mb-6">
        <h2 className="section-title flex items-center gap-2">
          <Users size={18} /> Evidence ({bounty.evidence.length})
        </h2>

        {bounty.evidence.length === 0 ? (
          <div className="card text-center py-10 text-textSecondary">
            <div className="text-3xl mb-3">📝</div>
            <p>No evidence submitted yet. Be the first to contribute!</p>
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
                    <a
                      href={ev.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-accent hover:text-accentLight transition-colors"
                    >
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
            <code className="text-accentLight font-mono text-sm">{bounty.submitter}</code>
            <div className="text-textSecondary text-xs mt-0.5">{formatDate(bounty.createdAt)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BountyDetailPage;
