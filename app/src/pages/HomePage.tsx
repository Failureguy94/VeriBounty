import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import type { Bounty, ChainStatus } from '../types';
import { fetchBounties } from '../lib/blockchain';
import { CATEGORIES } from '../lib/constants';
import { formatSol } from '../lib/format';
import BountyRow from '../components/BountyRow';
import { STATUS_LABELS } from '../components/StatusBadge';
import { Button, Container, EmptyState, PageHeader, Skeleton, StatGrid, buttonClasses } from '../components/ui';

type StatusFilter = ChainStatus | 'all';
type SortKey = 'newest' | 'stake' | 'evidence';

const STATUS_FILTERS: StatusFilter[] = ['all', 'open', 'in-review', 'verdict-submitted', 'resolved'];

const HomePage = () => {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('newest');

  const load = () => {
    setLoading(true);
    setFailed(false);
    fetchBounties()
      .then(setBounties)
      .catch(err => {
        console.error(err);
        setFailed(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const stats = useMemo(() => {
    const unresolved = bounties.filter(b => b.chainStatus !== 'resolved');
    const accepted = bounties.filter(b => b.resolution === 'accepted');
    return {
      active: unresolved.length,
      inEscrow: unresolved.reduce((sum, b) => sum + b.stakeAmount, 0),
      resolved: bounties.length - unresolved.length,
      paidOut: accepted.reduce((sum, b) => sum + b.stakeAmount, 0),
    };
  }, [bounties]);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { all: bounties.length, open: 0, 'in-review': 0, 'verdict-submitted': 0, resolved: 0 };
    for (const b of bounties) c[b.chainStatus] += 1;
    return c;
  }, [bounties]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bounties
      .filter(b => status === 'all' || b.chainStatus === status)
      .filter(b => category === 'all' || b.category === category)
      .filter(
        b =>
          !q ||
          b.claim.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q) ||
          b.tags.some(t => t.toLowerCase().includes(q)),
      )
      .sort((a, b) => {
        if (sortBy === 'stake') return b.stakeAmount - a.stakeAmount;
        if (sortBy === 'evidence') return b.totalSubmissions - a.totalSubmissions;
        return b.createdAt - a.createdAt;
      });
  }, [bounties, search, category, status, sortBy]);

  const filtersActive = search.trim() !== '' || category !== 'all' || status !== 'all';
  const clearFilters = () => {
    setSearch('');
    setCategory('all');
    setStatus('all');
  };

  const show = (value: string) => (loading ? '—' : value);

  return (
    <Container className="py-10 sm:py-14">
      <PageHeader
        eyebrow="Solana devnet"
        title="Fact-checking bounties"
        description={
          <p>
            Stake SOL on a claim you want checked. A fact-checker claims it, investigates and submits a
            verdict. The stake is paid to them once the verdict is accepted, or returned to you if it is
            rejected.
          </p>
        }
        actions={
          <Link to="/submit" className={buttonClasses('primary')}>
            Submit a claim
          </Link>
        }
      />

      <div className="mt-8">
        <StatGrid
          items={[
            { label: 'Active bounties', value: show(String(stats.active)) },
            { label: 'Held in escrow', value: show(formatSol(stats.inEscrow)) },
            { label: 'Resolved', value: show(String(stats.resolved)) },
            { label: 'Paid to fact-checkers', value: show(formatSol(stats.paidOut)) },
          ]}
        />
      </div>

      <section className="mt-14" aria-labelledby="bounties-heading">
        <h2 id="bounties-heading" className="font-serif text-2xl font-semibold text-ink">
          Bounties
        </h2>

        {/* Filters */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_11rem_11rem]">
          <div className="relative col-span-2 sm:col-span-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search claims and tags"
              aria-label="Search claims and tags"
              className="input pl-9"
            />
          </div>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            aria-label="Category"
            className="input"
          >
            <option value="all">All categories</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortKey)}
            aria-label="Sort by"
            className="input"
          >
            <option value="newest">Newest first</option>
            <option value="stake">Highest stake</option>
            <option value="evidence">Most evidence</option>
          </select>
        </div>

        <div role="tablist" aria-label="Status" className="mt-5 flex gap-6 overflow-x-auto border-b border-rule [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={status === s}
              onClick={() => setStatus(s)}
              className={`-mb-px shrink-0 border-b-2 pb-2.5 text-sm transition-colors ${
                status === s ? 'border-ink font-medium text-ink' : 'border-transparent text-ink-2 hover:text-ink'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_LABELS[s]}
              {!loading && <span className="ml-1.5 tabular-nums text-ink-3">{counts[s]}</span>}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="mt-2">
          {loading ? (
            <ul className="divide-y divide-rule" aria-busy="true" aria-label="Loading bounties">
              {[0, 1, 2, 3].map(i => (
                <li key={i} className="py-5">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="mt-3 h-5 w-3/4" />
                  <Skeleton className="mt-2 h-3 w-1/2" />
                </li>
              ))}
            </ul>
          ) : failed ? (
            <div className="mt-6">
              <EmptyState
                title="Couldn't load bounties"
                action={<Button variant="secondary" onClick={load}>Try again</Button>}
              >
                The Solana devnet RPC didn't respond. This is usually temporary.
              </EmptyState>
            </div>
          ) : visible.length === 0 ? (
            <div className="mt-6">
              {filtersActive ? (
                <EmptyState
                  title="No bounties match these filters"
                  action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}
                />
              ) : (
                <EmptyState
                  title="No bounties yet"
                  action={
                    <Link to="/submit" className={buttonClasses('primary')}>
                      Submit the first claim
                    </Link>
                  }
                >
                  Bounties appear here as soon as they are created on-chain.
                </EmptyState>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-rule">
              {visible.map(b => (
                <BountyRow key={b.id} bounty={b} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </Container>
  );
};

export default HomePage;
