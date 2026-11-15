import { Link } from 'react-router-dom';
import type { Bounty } from '../types';
import StatusBadge from './StatusBadge';
import { formatDate, formatSol } from '../lib/format';

/** One bounty in the home page list. */
const BountyRow = ({ bounty }: { bounty: Bounty }) => (
  <li>
    <Link
      to={`/bounty/${bounty.id}`}
      className="group -mx-3 grid gap-3 rounded px-3 py-5 transition-colors hover:bg-surface sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-8"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
          <StatusBadge status={bounty.chainStatus} resolution={bounty.resolution} />
          <span>{bounty.category}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={new Date(bounty.createdAt).toISOString()}>{formatDate(bounty.createdAt)}</time>
        </div>

        <h3 className="mt-2 font-serif text-lg font-semibold leading-snug text-ink group-hover:text-accent">
          {bounty.claim}
        </h3>

        {bounty.description && (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-2">{bounty.description}</p>
        )}

        {bounty.tags.length > 0 && (
          <p className="mt-2 text-xs text-ink-3">{bounty.tags.map(t => `#${t}`).join('  ')}</p>
        )}
      </div>

      <div className="flex items-baseline gap-3 sm:block sm:text-right">
        <p className="font-mono text-base font-medium tabular-nums text-ink">{formatSol(bounty.stakeAmount)}</p>
        <p className="text-xs text-ink-3 sm:mt-1">
          {bounty.totalSubmissions} {bounty.totalSubmissions === 1 ? 'evidence entry' : 'evidence entries'}
        </p>
      </div>
    </Link>
  </li>
);

export default BountyRow;
