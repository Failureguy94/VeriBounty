import { Link } from 'react-router-dom';
import { Bounty } from '../types';
import StatusBadge from './StatusBadge';
import { ArrowRight, Users, Clock, Coins } from 'lucide-react';

interface Props {
  bounty: Bounty;
  index?: number;
}

const categoryIcons: Record<string, string> = {
  Technology: '💻',
  Health: '🏥',
  Finance: '💰',
  Policy: '⚖️',
  Science: '🔬',
  Politics: '🏛️',
};

const BountyCard = ({ bounty, index = 0 }: Props) => {
  const daysLeft = Math.ceil((bounty.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <Link
      to={`/bounty/${bounty.id}`}
      className="card-hover block group animate-fadeInUp"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg" title={bounty.category}>
            {categoryIcons[bounty.category] ?? '📋'}
          </span>
          <span className="text-xs text-textSecondary font-medium uppercase tracking-wider">
            {bounty.category}
          </span>
        </div>
        <StatusBadge status={bounty.status} />
      </div>

      {/* Claim */}
      <h3 className="text-textPrimary font-semibold text-base leading-snug mb-3 line-clamp-2 group-hover:text-primary transition-colors duration-150">
        {bounty.claim}
      </h3>

      {/* Description */}
      <p className="text-textSecondary text-sm leading-relaxed line-clamp-2 mb-4">
        {bounty.description}
      </p>

      {/* Tags */}
      {bounty.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {bounty.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-md bg-surfaceLight text-textSecondary border border-border/60"
            >
              #{tag}
            </span>
          ))}
          {bounty.tags.length > 3 && (
            <span className="text-xs px-2 py-0.5 rounded-md bg-surfaceLight text-textSecondary border border-border/60">
              +{bounty.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer stats */}
      <div className="flex items-center justify-between pt-3 border-t border-border/40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-primary">
            <Coins size={14} />
            <span className="text-sm font-bold">{bounty.stakeAmount} SOL</span>
          </div>
          <div className="flex items-center gap-1.5 text-textSecondary">
            <Users size={13} />
            <span className="text-xs">{bounty.totalSubmissions}</span>
          </div>
          {daysLeft > 0 && (
            <div className="flex items-center gap-1.5 text-textSecondary">
              <Clock size={13} />
              <span className="text-xs">{daysLeft}d left</span>
            </div>
          )}
        </div>
        <ArrowRight
          size={16}
          className="text-textSecondary group-hover:text-primary group-hover:translate-x-1 transition-all duration-150"
        />
      </div>
    </Link>
  );
};

export default BountyCard;
