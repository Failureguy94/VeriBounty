import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAnchorWallet, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import type { Bounty } from '../types';
import { cancelBounty, claimBounty, fetchBountyById, resolveBounty, submitVerdict } from '../lib/blockchain';
import { TRUSTED_RESOLVER } from '../lib/anchorClient';
import { formatDate, formatSol } from '../lib/format';
import StatusBadge from '../components/StatusBadge';
import {
  Address,
  Button,
  Container,
  DetailList,
  EmptyState,
  Field,
  Panel,
  Section,
  Skeleton,
  buttonClasses,
} from '../components/ui';

const EVIDENCE_MAX = 128;

const isUrl = (s: string) => /^https?:\/\/\S+$/i.test(s);

/** Show evidence text, linking it when it is a URL. */
const EvidenceText = ({ text }: { text: string }) =>
  isUrl(text) ? (
    <a href={text} target="_blank" rel="noopener noreferrer" className="link break-all">
      {text}
    </a>
  ) : (
    <span className="break-words">{text}</span>
  );

const BountyDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { connected, publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const navigate = useNavigate();

  const [bounty, setBounty] = useState<Bounty | null>(null);
  const [loading, setLoading] = useState(true);

  const [claiming, setClaiming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [resolving, setResolving] = useState<'accepted' | 'rejected' | null>(null);

  const [verdictChoice, setVerdictChoice] = useState<boolean | null>(null);
  const [evidenceText, setEvidenceText] = useState('');
  const [submittingVerdict, setSubmittingVerdict] = useState(false);

  const loadBounty = () => {
    if (!id) return;
    setLoading(true);
    fetchBountyById(id)
      .then(setBounty)
      .catch(() => setBounty(null))
      .finally(() => setLoading(false));
  };

  useEffect(loadBounty, [id]);

  const showTxError = (err: unknown, toastId: string) => {
    const msg = err instanceof Error ? err.message : 'Transaction failed';
    if (msg.includes('User rejected')) toast.error('Transaction cancelled.', { id: toastId });
    else toast.error(msg, { id: toastId });
  };

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleClaim = async () => {
    if (!anchorWallet || !bounty) return;
    setClaiming(true);
    const toastId = toast.loading('Waiting for wallet approval…');
    try {
      const sig = await claimBounty({ wallet: anchorWallet, bountyPda: bounty.id });
      toast.success('Bounty claimed. You are now its fact-checker.', { id: toastId });
      console.log('Claim tx:', sig);
      loadBounty();
    } catch (err) {
      showTxError(err, toastId);
    } finally {
      setClaiming(false);
    }
  };

  const handleSubmitVerdict = async () => {
    if (!anchorWallet || !bounty || verdictChoice === null) return;
    const evidence = evidenceText.trim();
    if (!evidence || evidence.length > EVIDENCE_MAX) {
      toast.error(`Evidence must be 1–${EVIDENCE_MAX} characters.`);
      return;
    }
    setSubmittingVerdict(true);
    const toastId = toast.loading('Submitting verdict…');
    try {
      const result = await submitVerdict({
        wallet: anchorWallet,
        bountyPda: bounty.id,
        verdict: verdictChoice,
        evidenceIpfsHash: evidence,
      });
      if (result.evidenceSaved) toast.success('Verdict submitted.', { id: toastId });
      else toast.error('Verdict is on-chain, but the evidence log could not be saved.', { id: toastId, duration: 8000 });
      console.log('Verdict tx:', result.txSignature);
      loadBounty();
    } catch (err) {
      showTxError(err, toastId);
    } finally {
      setSubmittingVerdict(false);
    }
  };

  const handleResolve = async (resolution: 'accepted' | 'rejected') => {
    if (!anchorWallet || !bounty) return;
    setResolving(resolution);
    const toastId = toast.loading('Resolving bounty…');
    try {
      const sig = await resolveBounty({ wallet: anchorWallet, bountyPda: bounty.id, resolution });
      toast.success(
        resolution === 'accepted'
          ? 'Verdict accepted. The fact-checker has been paid.'
          : 'Stake returned to the submitter.',
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

  const handleCancel = async () => {
    if (!anchorWallet || !bounty) return;
    if (!window.confirm('Cancel this bounty and return your stake?')) return;
    setCancelling(true);
    const toastId = toast.loading('Cancelling bounty…');
    try {
      const sig = await cancelBounty({ wallet: anchorWallet, bountyPda: bounty.id });
      toast.success('Bounty cancelled. Your stake has been returned.', { id: toastId });
      console.log('Cancel tx:', sig);
      navigate('/'); // the bounty account is closed on-chain
    } catch (err) {
      showTxError(err, toastId);
    } finally {
      setCancelling(false);
    }
  };

  // ── Loading / not found ──────────────────────────────────────────────────────

  if (loading && !bounty) {
    return (
      <Container className="py-10 sm:py-14" >
        <div aria-busy="true" aria-label="Loading bounty">
          <Skeleton className="h-3 w-28" />
          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <Skeleton className="h-3 w-40" />
              <Skeleton className="mt-4 h-8 w-5/6" />
              <Skeleton className="mt-6 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-4/5" />
            </div>
            <Skeleton className="h-56" />
          </div>
        </div>
      </Container>
    );
  }

  if (!bounty) {
    return (
      <Container className="py-16">
        <EmptyState
          title="Bounty not found"
          action={<Link to="/" className={buttonClasses('secondary')}>Back to bounties</Link>}
        >
          It may have been cancelled, or the address is wrong.
        </EmptyState>
      </Container>
    );
  }

  // ── Derived state ────────────────────────────────────────────────────────────

  const walletAddr = publicKey?.toBase58();
  const isSubmitter = walletAddr === bounty.submitter;
  const isFactChecker = !!bounty.factChecker && walletAddr === bounty.factChecker;
  const isResolver = walletAddr === TRUSTED_RESOLVER.toBase58();
  const stake = formatSol(bounty.stakeAmount);

  const resolutionText =
    bounty.resolution === 'accepted'
      ? 'Accepted — paid to fact-checker'
      : bounty.resolution === 'rejected'
        ? 'Rejected — returned to submitter'
        : 'Pending';

  // The one action panel for this viewer and bounty state.
  let action: { title: string; body: ReactNode } | null = null;

  if (bounty.chainStatus === 'open') {
    if (!connected) {
      action = {
        title: 'Claim this bounty',
        body: (
          <>
            <p className="mb-4 text-sm text-ink-2">Connect a wallet to claim this bounty and become its fact-checker.</p>
            <WalletMultiButton />
          </>
        ),
      };
    } else if (isSubmitter) {
      action = {
        title: 'Your bounty',
        body: (
          <>
            <p className="mb-4 text-sm text-ink-2">
              Nobody has claimed this yet. You can cancel it and get your {stake} back.
            </p>
            <Button variant="danger" loading={cancelling} onClick={handleCancel} className="w-full">
              Cancel and refund
            </Button>
          </>
        ),
      };
    } else {
      action = {
        title: 'Claim this bounty',
        body: (
          <>
            <p className="mb-4 text-sm text-ink-2">
              Claiming makes you the only wallet that can submit a verdict. You earn {stake} if it is accepted.
            </p>
            <Button loading={claiming} onClick={handleClaim} className="w-full">
              Claim bounty
            </Button>
          </>
        ),
      };
    }
  } else if (bounty.chainStatus === 'in-review') {
    if (isFactChecker) {
      action = {
        title: 'Submit your verdict',
        body: (
          <div className="space-y-4">
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-ink">Is the claim true?</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: true, label: 'True', active: 'border-positive bg-positive-wash text-positive' },
                  { value: false, label: 'False', active: 'border-negative bg-negative-wash text-negative' },
                ].map(opt => (
                  <button
                    key={opt.label}
                    type="button"
                    aria-pressed={verdictChoice === opt.value}
                    onClick={() => setVerdictChoice(opt.value)}
                    className={`h-10 rounded border text-sm font-medium transition-colors ${
                      verdictChoice === opt.value ? opt.active : 'border-rule-strong text-ink-2 hover:border-ink'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <Field
              label="Evidence"
              htmlFor="evidence"
              hint="A source URL, IPFS CID or short summary. Stored on-chain."
              counter={`${evidenceText.length}/${EVIDENCE_MAX}`}
            >
              <input
                id="evidence"
                type="text"
                value={evidenceText}
                onChange={e => setEvidenceText(e.target.value)}
                maxLength={EVIDENCE_MAX}
                aria-describedby="evidence-hint"
                className="input"
              />
            </Field>

            <Button
              loading={submittingVerdict}
              disabled={verdictChoice === null || !evidenceText.trim()}
              onClick={handleSubmitVerdict}
              className="w-full"
            >
              Submit verdict
            </Button>
          </div>
        ),
      };
    } else if (isResolver) {
      action = {
        title: 'Resolve',
        body: (
          <>
            <p className="mb-4 text-sm text-ink-2">
              This bounty was claimed but has no verdict. If the fact-checker has abandoned it, return the stake to
              the submitter.
            </p>
            <Button variant="secondary" loading={resolving === 'rejected'} onClick={() => handleResolve('rejected')} className="w-full">
              Refund submitter
            </Button>
          </>
        ),
      };
    } else {
      action = {
        title: 'In progress',
        body: <p className="text-sm text-ink-2">A fact-checker has claimed this bounty and is working on a verdict.</p>,
      };
    }
  } else if (bounty.chainStatus === 'verdict-submitted') {
    if (isResolver) {
      action = {
        title: 'Resolve',
        body: (
          <>
            <p className="mb-4 text-sm text-ink-2">
              Accepting pays {stake} to the fact-checker and raises their reputation. Rejecting returns it to the
              submitter.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button loading={resolving === 'accepted'} disabled={resolving !== null} onClick={() => handleResolve('accepted')}>
                Accept
              </Button>
              <Button variant="danger" loading={resolving === 'rejected'} disabled={resolving !== null} onClick={() => handleResolve('rejected')}>
                Reject
              </Button>
            </div>
          </>
        ),
      };
    } else {
      action = {
        title: 'Awaiting resolution',
        body: <p className="text-sm text-ink-2">The verdict is in. The resolver will accept or reject it.</p>,
      };
    }
  }

  return (
    <Container className="py-10 sm:py-14">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft size={14} /> All bounties
      </Link>

      {/* Phones: header → sidebar → verdict/evidence. Desktop: sidebar spans the right column. */}
      <div className="mt-8 grid gap-y-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-[auto_1fr] lg:gap-x-14 lg:gap-y-12">
        <header className="min-w-0 lg:col-start-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
            <StatusBadge status={bounty.chainStatus} resolution={bounty.resolution} />
            <span>{bounty.category}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={new Date(bounty.createdAt).toISOString()}>{formatDate(bounty.createdAt)}</time>
          </div>

          <h1 className="mt-4 font-serif text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
            {bounty.claim}
          </h1>

          {bounty.description ? (
            <p className="mt-5 whitespace-pre-line text-[1.0625rem] leading-relaxed text-ink-2">{bounty.description}</p>
          ) : (
            <p className="mt-5 text-sm italic text-ink-3">No context was saved for this bounty.</p>
          )}

          {bounty.tags.length > 0 && (
            <p className="mt-4 text-sm text-ink-3">{bounty.tags.map(t => `#${t}`).join('  ')}</p>
          )}
        </header>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <Panel>
            <p className="eyebrow">Reward</p>
            <p className="mt-1 font-mono text-2xl font-medium tabular-nums text-ink">{stake}</p>
            <div className="mt-5 border-t border-rule pt-4">
              <DetailList
                items={[
                  { label: 'Submitted by', value: <Address value={bounty.submitter} explorer /> },
                  {
                    label: 'Fact-checker',
                    value: bounty.factChecker ? <Address value={bounty.factChecker} explorer /> : <span className="text-ink-3">Not claimed</span>,
                  },
                  { label: 'Resolution', value: resolutionText },
                  { label: 'Bounty account', value: <Address value={bounty.id} explorer /> },
                ]}
              />
            </div>
          </Panel>

          {action && <Panel title={action.title}>{action.body}</Panel>}
        </aside>

        <div className="min-w-0 space-y-12 lg:col-start-1">
          {bounty.submittedVerdict !== null && bounty.factChecker && (
            <Section title="Fact-checker's verdict">
              <p className={`font-serif text-2xl font-semibold ${bounty.submittedVerdict ? 'text-positive' : 'text-negative'}`}>
                {bounty.submittedVerdict ? 'The claim is true' : 'The claim is false'}
              </p>
              {bounty.evidenceIpfsHash && (
                <p className="mt-2 text-sm text-ink-2">
                  <span className="text-ink-3">Evidence: </span>
                  <EvidenceText text={bounty.evidenceIpfsHash} />
                </p>
              )}
            </Section>
          )}

          <Section title="Evidence log" aside={`${bounty.evidence.length} ${bounty.evidence.length === 1 ? 'entry' : 'entries'}`}>
            {bounty.evidence.length === 0 ? (
              <p className="text-sm text-ink-3">Nothing submitted yet.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {bounty.evidence.map(ev => (
                  <li key={ev.id} className="py-4 first:pt-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-3">
                      <Address value={ev.submitter} />
                      <time dateTime={new Date(ev.timestamp).toISOString()}>{formatDate(ev.timestamp)}</time>
                    </div>
                    <p className="mt-1.5 text-sm text-ink">
                      <EvidenceText text={ev.content} />
                    </p>
                    {ev.url && (
                      <a href={ev.url} target="_blank" rel="noopener noreferrer" className="link mt-1 inline-block text-sm">
                        Source
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </Container>
  );
};

export default BountyDetailPage;
