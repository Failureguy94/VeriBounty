import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bounty, BountyStatus } from '../types';
import { fetchBounties } from '../lib/mockBlockchain';
import BountyCard from '../components/BountyCard';
import { Search, Filter, TrendingUp, Shield, Zap, Award } from 'lucide-react';

const CATEGORIES = ['All', 'Technology', 'Health', 'Finance', 'Policy', 'Science'];
const STATUSES: (BountyStatus | 'all')[] = ['all', 'open', 'in-review', 'resolved', 'disputed'];

const statsData = [
  { label: 'Active Bounties', value: '127', icon: Shield, color: 'text-primary' },
  { label: 'Total Staked', value: '1,842 SOL', icon: TrendingUp, color: 'text-accent' },
  { label: 'Claims Verified', value: '4,391', icon: Award, color: 'text-success' },
  { label: 'Avg. Resolution', value: '3.2 days', icon: Zap, color: 'text-warning' },
];

const HomePage = () => {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [filtered, setFiltered] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState<BountyStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'stake' | 'submissions'>('newest');

  useEffect(() => {
    fetchBounties().then(data => {
      setBounties(data);
      setFiltered(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    let result = [...bounties];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        b =>
          b.claim.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q) ||
          b.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    if (category !== 'All') {
      result = result.filter(b => b.category === category);
    }

    if (status !== 'all') {
      result = result.filter(b => b.status === status);
    }

    result.sort((a, b) => {
      if (sortBy === 'newest') return b.createdAt - a.createdAt;
      if (sortBy === 'stake') return b.stakeAmount - a.stakeAmount;
      return b.totalSubmissions - a.totalSubmissions;
    });

    setFiltered(result);
  }, [bounties, search, category, status, sortBy]);

  return (
    <div className="flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-gradient py-20 px-4">
        {/* Decorative orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-primary/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-surfaceLight border border-border rounded-full px-4 py-1.5 text-xs text-textSecondary mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Live on Solana Devnet
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-5">
            <span className="gradient-text">Stake SOL</span>
            <br />
            <span className="text-textPrimary">to Verify Facts</span>
          </h1>

          <p className="text-textSecondary text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
            Submit claims, provide evidence, and earn SOL rewards by fact-checking on a decentralized, transparent platform.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/submit" className="btn-primary inline-flex items-center gap-2 justify-center text-base px-8 py-3">
              <Zap size={16} />
              Submit a Claim
            </Link>
            <a href="#bounties" className="btn-secondary inline-flex items-center gap-2 justify-center text-base px-8 py-3">
              <Search size={16} />
              Browse Bounties
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="relative max-w-5xl mx-auto mt-16 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsData.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card text-center">
              <Icon size={20} className={`${color} mx-auto mb-2`} />
              <div className={`text-2xl font-extrabold ${color} mb-0.5`}>{value}</div>
              <div className="text-textSecondary text-xs">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Bounties List */}
      <section id="bounties" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-textSecondary" />
              <input
                type="text"
                placeholder="Search claims, tags..."
                className="input-field pl-10"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Sort */}
            <select
              className="input-field sm:w-48"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
            >
              <option value="newest">Newest First</option>
              <option value="stake">Highest Stake</option>
              <option value="submissions">Most Evidence</option>
            </select>
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2 items-center">
            <Filter size={14} className="text-textSecondary" />
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 border ${
                  category === cat
                    ? 'bg-primary text-background border-primary'
                    : 'border-border text-textSecondary hover:border-accent hover:text-accent'
                }`}
              >
                {cat}
              </button>
            ))}
            <span className="text-border mx-1">|</span>
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 border capitalize ${
                  status === s
                    ? 'bg-accent/20 text-accentLight border-accent/50'
                    : 'border-border text-textSecondary hover:border-accent hover:text-accent'
                }`}
              >
                {s === 'all' ? 'All Status' : s}
              </button>
            ))}
          </div>
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-textPrimary">
            {loading ? 'Loading...' : `${filtered.length} Bount${filtered.length !== 1 ? 'ies' : 'y'}`}
          </h2>
          <Link to="/submit" className="text-sm text-primary hover:text-primaryHover font-medium transition-colors">
            + Submit New
          </Link>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card h-52 animate-pulse">
                <div className="h-4 bg-surfaceLight rounded w-1/3 mb-3" />
                <div className="h-5 bg-surfaceLight rounded w-full mb-2" />
                <div className="h-5 bg-surfaceLight rounded w-3/4 mb-4" />
                <div className="h-3 bg-surfaceLight rounded w-full mb-2" />
                <div className="h-3 bg-surfaceLight rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-textSecondary text-lg mb-4">No bounties match your filters.</p>
            <button
              onClick={() => { setSearch(''); setCategory('All'); setStatus('all'); }}
              className="btn-secondary"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 stagger-children">
            {filtered.map((bounty, i) => (
              <BountyCard key={bounty.id} bounty={bounty} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;
