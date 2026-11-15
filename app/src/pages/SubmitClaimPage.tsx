import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAnchorWallet, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import toast from 'react-hot-toast';
import { submitClaim } from '../lib/blockchain';
import { CATEGORIES } from '../lib/constants';
import { explorerUrl, formatSol } from '../lib/format';
import { Address, Button, Container, DetailList, Field, PageHeader, Panel, buttonClasses } from '../components/ui';

const CLAIM_MIN = 20;
const CLAIM_MAX = 200;
const CONTEXT_MIN = 50;
const CONTEXT_MAX = 1000;
const MIN_STAKE = 0.1;

interface FormData {
  claim: string;
  description: string;
  stakeAmount: string;
  category: string;
  tags: string;
}

type Errors = Partial<Record<keyof FormData, string>>;

const EMPTY_FORM: FormData = { claim: '', description: '', stakeAmount: '', category: CATEGORIES[0], tags: '' };

const validate = (form: FormData): Errors => {
  const errors: Errors = {};
  const stake = parseFloat(form.stakeAmount);
  if (form.claim.trim().length < CLAIM_MIN) errors.claim = `Write at least ${CLAIM_MIN} characters.`;
  if (form.description.trim().length < CONTEXT_MIN) errors.description = `Write at least ${CONTEXT_MIN} characters.`;
  if (Number.isNaN(stake) || stake < MIN_STAKE) errors.stakeAmount = `The minimum stake is ${MIN_STAKE} SOL.`;
  return errors;
};

const SubmitClaimPage = () => {
  const { connected } = useWallet();
  const anchorWallet = useAnchorWallet();

  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{
    txSignature: string;
    bountyPda: string;
    stake: number;
    metadataSaved: boolean;
  } | null>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormData]) setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!connected || !anchorWallet) {
      toast.error('Connect a wallet first.');
      return;
    }

    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const stake = parseFloat(form.stakeAmount);
    setLoading(true);
    const toastId = toast.loading('Waiting for wallet approval…');

    try {
      const result = await submitClaim({
        wallet: anchorWallet,
        claim: form.claim.trim(),
        description: form.description.trim(),
        stakeAmount: stake,
        category: form.category,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      toast.dismiss(toastId);
      setSuccess({ txSignature: result.txSignature, bountyPda: result.bountyPda, stake, metadataSaved: result.metadataSaved });
      window.scrollTo({ top: 0 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transaction failed';
      // System program error 0x1 = insufficient funds for the escrow transfer
      if (/insufficient lamports|no record of a prior credit|custom program error: 0x1$/im.test(msg)) {
        toast.error('Not enough SOL in your wallet for this stake.', { id: toastId });
      } else if (msg.includes('User rejected')) {
        toast.error('Transaction cancelled.', { id: toastId });
      } else {
        toast.error(msg, { id: toastId });
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Success ──────────────────────────────────────────────────────────────────
  if (success) {
    return (
      <Container className="py-10 sm:py-14">
        <div className="max-w-2xl">
          <PageHeader
            eyebrow="Bounty created"
            title="Your claim is open for fact-checking"
            description={<p>{formatSol(success.stake)} is now locked in escrow. You can cancel and get it back until someone claims the bounty.</p>}
          />

          {!success.metadataSaved && (
            <p className="mt-6 rounded border border-pending/30 bg-pending-wash px-4 py-3 text-sm text-pending">
              The bounty exists on-chain, but its text couldn't be saved to the server, so it will show without a
              description. Keep the transaction link below.
            </p>
          )}

          <div className="mt-6">
            <DetailList
              items={[
                { label: 'Bounty account', value: <Address value={success.bountyPda} explorer /> },
                {
                  label: 'Transaction',
                  value: (
                    <a href={explorerUrl('tx', success.txSignature)} target="_blank" rel="noopener noreferrer" className="link font-mono text-[0.8125rem]">
                      {success.txSignature.slice(0, 16)}…
                    </a>
                  ),
                },
              ]}
            />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={`/bounty/${success.bountyPda}`} className={buttonClasses('primary')}>
              View bounty
            </Link>
            <Button
              variant="secondary"
              onClick={() => {
                setSuccess(null);
                setForm(EMPTY_FORM);
              }}
            >
              Submit another
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  const stake = parseFloat(form.stakeAmount);
  const stakeValid = !Number.isNaN(stake) && stake >= MIN_STAKE;

  return (
    <Container className="py-10 sm:py-14">
      <div className="max-w-2xl">
        <PageHeader
          eyebrow="New bounty"
          title="Submit a claim"
          description={
            <p>
              Describe a claim you want verified and lock SOL as the reward. The stake stays in escrow until a
              verdict is accepted or rejected, and you can cancel any time before someone claims it.
            </p>
          }
        />

        {!connected && (
          <Panel className="mt-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink-2">Connect a Solana wallet on devnet to submit a claim.</p>
              <WalletMultiButton />
            </div>
          </Panel>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-6">
          <Field
            label="Claim"
            htmlFor="claim"
            hint="One specific, checkable statement."
            counter={`${form.claim.length}/${CLAIM_MAX}`}
            error={errors.claim}
          >
            <input
              id="claim"
              name="claim"
              type="text"
              value={form.claim}
              onChange={handleChange}
              maxLength={CLAIM_MAX}
              placeholder="e.g. The city's new bridge cost twice its approved budget"
              aria-invalid={!!errors.claim}
              aria-describedby="claim-hint"
              className="input"
            />
          </Field>

          <Field
            label="Context"
            htmlFor="description"
            hint="Where the claim appeared and what a fact-checker should look at."
            counter={`${form.description.length}/${CONTEXT_MAX}`}
            error={errors.description}
          >
            <textarea
              id="description"
              name="description"
              rows={5}
              value={form.description}
              onChange={handleChange}
              maxLength={CONTEXT_MAX}
              aria-invalid={!!errors.description}
              aria-describedby="description-hint"
              className="input resize-y leading-relaxed"
            />
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Category" htmlFor="category">
              <select id="category" name="category" value={form.category} onChange={handleChange} className="input">
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Stake" htmlFor="stakeAmount" hint={`Minimum ${MIN_STAKE} SOL`} error={errors.stakeAmount}>
              <div className="relative">
                <input
                  id="stakeAmount"
                  name="stakeAmount"
                  type="number"
                  inputMode="decimal"
                  min={MIN_STAKE}
                  step="0.01"
                  value={form.stakeAmount}
                  onChange={handleChange}
                  placeholder="0.10"
                  aria-invalid={!!errors.stakeAmount}
                  aria-describedby="stakeAmount-hint"
                  className="input pr-12 font-mono"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-3">SOL</span>
              </div>
            </Field>
          </div>

          <Field label="Tags" htmlFor="tags" optional hint="Separate with commas.">
            <input
              id="tags"
              name="tags"
              type="text"
              value={form.tags}
              onChange={handleChange}
              placeholder="infrastructure, budget"
              aria-describedby="tags-hint"
              className="input"
            />
          </Field>

          <div className="flex flex-col-reverse gap-4 border-t border-rule pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-2">
              {stakeValid
                ? `${formatSol(stake)} will be locked in escrow. Your wallet will ask you to approve.`
                : 'Your wallet will ask you to approve the transaction.'}
            </p>
            <Button type="submit" loading={loading} disabled={!connected} className="shrink-0">
              {loading ? 'Waiting for wallet' : 'Submit and lock stake'}
            </Button>
          </div>
        </form>
      </div>
    </Container>
  );
};

export default SubmitClaimPage;
