import { BountyStatus } from '../types';

interface Props {
  status: BountyStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<BountyStatus, { label: string; className: string; dot: string }> = {
  open: {
    label: 'Open',
    className: 'bg-success/10 text-success border border-success/30',
    dot: 'bg-success',
  },
  'in-review': {
    label: 'In Review',
    className: 'bg-warning/10 text-warning border border-warning/30',
    dot: 'bg-warning',
  },
  resolved: {
    label: 'Resolved',
    className: 'bg-accent/10 text-accentLight border border-accent/30',
    dot: 'bg-accentLight',
  },
  disputed: {
    label: 'Disputed',
    className: 'bg-danger/10 text-danger border border-danger/30',
    dot: 'bg-danger',
  },
};

const StatusBadge = ({ status, size = 'sm' }: Props) => {
  const config = statusConfig[status];
  const sizeClass = size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.className} ${sizeClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse-slow`} />
      {config.label}
    </span>
  );
};

export default StatusBadge;
