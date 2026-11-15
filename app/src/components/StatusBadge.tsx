import type { ChainStatus } from '../types';

interface Props {
  status: ChainStatus;
  resolution?: 'accepted' | 'rejected' | null;
}

export const STATUS_LABELS: Record<ChainStatus, string> = {
  open: 'Open',
  'in-review': 'Claimed',
  'verdict-submitted': 'Awaiting resolution',
  resolved: 'Resolved',
};

const tone = {
  accent: 'bg-accent-wash text-accent',
  pending: 'bg-pending-wash text-pending',
  positive: 'bg-positive-wash text-positive',
  negative: 'bg-negative-wash text-negative',
} as const;

/** Status of a bounty, labelled from its on-chain state. */
const StatusBadge = ({ status, resolution }: Props) => {
  let label = STATUS_LABELS[status];
  let className: string = tone.pending;

  if (status === 'open') className = tone.accent;
  if (status === 'resolved') {
    label = resolution === 'accepted' ? 'Accepted' : resolution === 'rejected' ? 'Rejected' : 'Resolved';
    className = resolution === 'rejected' ? tone.negative : tone.positive;
  }

  return (
    <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[0.6875rem] font-medium uppercase tracking-[0.06em] ${className}`}>
      {label}
    </span>
  );
};

export default StatusBadge;
