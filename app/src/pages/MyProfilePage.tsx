import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Check } from 'lucide-react';
import { fetchUserProfile } from '../lib/blockchain';
import { formatSol } from '../lib/format';
import type { UserProfile } from '../types';
import { Address, Button, Container, DetailList, EmptyState, PageHeader, Section, Skeleton, StatGrid } from '../components/ui';

const MyProfilePage = () => {
  const { connected, publicKey } = useWallet();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const address = publicKey?.toBase58();

  const loadProfile = () => {
    if (!address) return;
    setLoading(true);
    setFailed(false);
    fetchUserProfile(address)
      .then(setProfile)
      .catch(err => {
        console.error(err);
        setFailed(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setProfile(null);
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  if (!connected || !address) {
    return (
      <Container className="py-10 sm:py-14">
        <div className="max-w-2xl">
          <PageHeader
            eyebrow="Profile"
            title="Your activity"
            description={<p>Connect a wallet to see your bounties, reputation and earnings on devnet.</p>}
          />
          <div className="mt-8">
            <WalletMultiButton />
          </div>
        </div>
      </Container>
    );
  }

  if (failed) {
    return (
      <Container className="py-16">
        <EmptyState title="Couldn't load your profile" action={<Button variant="secondary" onClick={loadProfile}>Try again</Button>}>
          Check that your wallet is set to Solana devnet.
        </EmptyState>
      </Container>
    );
  }

  const show = (value: string) => (profile ? value : '—');

  return (
    <Container className="py-10 sm:py-14">
      <PageHeader
        eyebrow="Profile"
        title={<span className="font-mono text-2xl font-medium sm:text-3xl">{address.slice(0, 4)}…{address.slice(-4)}</span>}
        description={<Address value={address} explorer full />}
        actions={
          <Button variant="secondary" size="sm" loading={loading && !!profile} onClick={loadProfile}>
            Refresh
          </Button>
        }
      />

      <div className="mt-8">
        <StatGrid
          items={[
            { label: 'Reputation', value: show(String(profile?.reputationScore ?? 0)) },
            { label: 'Balance', value: show(formatSol(profile?.solBalance ?? 0)) },
            { label: 'Earned', value: show(formatSol(profile?.totalEarned ?? 0)) },
            {
              label: 'Acceptance rate',
              value: show(profile && profile.verdictsResolved > 0 ? `${profile.successRate}%` : 'None yet'),
            },
          ]}
        />
      </div>

      <div className="mt-12 grid gap-12 md:grid-cols-2">
        <Section title="Activity">
          {!profile ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map(i => (
                <Skeleton key={i} className="h-4" />
              ))}
            </div>
          ) : (
            <DetailList
              items={[
                { label: 'Bounties created', value: profile.bountiesSubmitted },
                { label: 'Total staked', value: formatSol(profile.totalStaked) },
                { label: 'Bounties claimed', value: profile.bountiesClaimed },
                { label: 'Verdicts resolved', value: profile.verdictsResolved },
                { label: 'Verdicts accepted', value: profile.bountiesResolved },
              ]}
            />
          )}
        </Section>

        <Section title="Milestones">
          {!profile ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map(i => (
                <Skeleton key={i} className="h-4" />
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-rule">
              {profile.badges.map(badge => (
                <li key={badge.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
                      badge.earned ? 'border-positive bg-positive text-surface' : 'border-rule-strong'
                    }`}
                    aria-hidden="true"
                  >
                    {badge.earned && <Check size={11} strokeWidth={3} />}
                  </span>
                  <div className="text-sm">
                    <p className={badge.earned ? 'font-medium text-ink' : 'text-ink-2'}>
                      {badge.name}
                      <span className="sr-only">{badge.earned ? ' (earned)' : ' (not yet earned)'}</span>
                    </p>
                    <p className="text-ink-3">{badge.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </Container>
  );
};

export default MyProfilePage;
