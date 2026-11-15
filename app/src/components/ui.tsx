/**
 * Shared layout and UI primitives. Pages are built only from these plus
 * Tailwind utilities, so spacing, borders and type stay consistent.
 */
import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { explorerUrl, shortAddress } from '../lib/format';

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

// ─── Layout ───────────────────────────────────────────────────────────────────

export const Container = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cx('mx-auto w-full max-w-5xl px-4 sm:px-6', className)}>{children}</div>
);

export const PageHeader = ({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) => (
  <header className="flex flex-col gap-5 border-b border-rule pb-8 sm:flex-row sm:items-end sm:justify-between">
    <div className="max-w-2xl">
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
        {title}
      </h1>
      {description && <div className="mt-3 leading-relaxed text-ink-2">{description}</div>}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
  </header>
);

export const Section = ({
  title,
  aside,
  children,
  className,
}: {
  title: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <section className={className}>
    <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-rule pb-2">
      <h2 className="eyebrow">{title}</h2>
      {aside && <div className="text-xs text-ink-3">{aside}</div>}
    </div>
    {children}
  </section>
);

/** The one bordered box in the system: used for sidebars, forms and notices. */
export const Panel = ({
  title,
  children,
  className,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <div className={cx('rounded border border-rule bg-surface p-5', className)}>
    {title && <h2 className="mb-3 font-serif text-lg font-semibold text-ink">{title}</h2>}
    {children}
  </div>
);

// ─── Buttons ──────────────────────────────────────────────────────────────────

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md';

const variantClasses: Record<Variant, string> = {
  primary: 'bg-ink text-paper hover:bg-ink-2',
  secondary: 'border border-rule-strong bg-surface text-ink hover:border-ink',
  danger: 'border border-negative/40 bg-surface text-negative hover:bg-negative-wash',
  ghost: 'text-ink-2 hover:bg-rule/50 hover:text-ink',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
};

/** Classes for anything that should look like a button (e.g. a router Link). */
export const buttonClasses = (variant: Variant = 'primary', size: Size = 'md', className?: string) =>
  cx(
    'inline-flex items-center justify-center gap-2 rounded font-medium transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-50',
    variantClasses[variant],
    sizeClasses[size],
    className,
  );

export const Spinner = () => (
  <span
    aria-hidden="true"
    className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
  />
);

export const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}) => (
  <button
    type="button"
    {...props}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={buttonClasses(variant, size, className)}
  >
    {loading && <Spinner />}
    {children}
  </button>
);

// ─── Forms ────────────────────────────────────────────────────────────────────

export const Field = ({
  label,
  htmlFor,
  hint,
  counter,
  error,
  optional,
  children,
}: {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  counter?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) => (
  <div>
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
      {label}
      {optional && <span className="ml-1.5 font-normal text-ink-3">optional</span>}
    </label>
    {children}
    {(hint || counter || error) && (
      <div className="mt-1.5 flex justify-between gap-4 text-xs">
        <span id={`${htmlFor}-hint`} className={error ? 'text-negative' : 'text-ink-3'}>
          {error ?? hint}
        </span>
        {counter && <span className="shrink-0 tabular-nums text-ink-3">{counter}</span>}
      </div>
    )}
  </div>
);

// ─── Data display ─────────────────────────────────────────────────────────────

/** A row of figures separated by hairlines. */
export const StatGrid = ({ items }: { items: { label: string; value: ReactNode }[] }) => (
  <dl className="grid grid-cols-2 gap-px overflow-hidden rounded border border-rule bg-rule sm:grid-cols-4">
    {items.map(({ label, value }) => (
      <div key={label} className="bg-surface px-4 py-4">
        <dt className="eyebrow">{label}</dt>
        <dd className="mt-1.5 font-serif text-2xl tabular-nums text-ink">{value}</dd>
      </div>
    ))}
  </dl>
);

/** Label/value rows, e.g. bounty details in a sidebar. */
export const DetailList = ({ items }: { items: { label: string; value: ReactNode }[] }) => (
  <dl className="divide-y divide-rule">
    {items.map(({ label, value }) => (
      <div key={label} className="flex items-baseline justify-between gap-4 py-2.5 text-sm first:pt-0 last:pb-0">
        <dt className="shrink-0 text-ink-3">{label}</dt>
        <dd className="min-w-0 text-right text-ink">{value}</dd>
      </div>
    ))}
  </dl>
);

/** A Solana address in monospace, with copy and optional explorer link. */
export const Address = ({ value, explorer = false, full = false }: { value: string; explorer?: boolean; full?: boolean }) => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <span className="inline-flex max-w-full items-center gap-1.5 font-mono text-[0.8125rem]">
      <span className={full ? 'break-all' : 'truncate'} title={value}>
        {full ? value : shortAddress(value)}
      </span>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 text-ink-3 transition-colors hover:text-ink"
        aria-label={copied ? 'Copied' : 'Copy address'}
        title={copied ? 'Copied' : 'Copy'}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
      {explorer && (
        <a
          href={explorerUrl('address', value)}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-ink-3 transition-colors hover:text-ink"
          aria-label="View on Solana Explorer"
          title="View on Solana Explorer"
        >
          <ExternalLink size={13} />
        </a>
      )}
    </span>
  );
};

export const EmptyState = ({
  title,
  children,
  action,
}: {
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}) => (
  <div className="rounded border border-dashed border-rule-strong px-6 py-12 text-center">
    <p className="font-serif text-lg text-ink">{title}</p>
    {children && <div className="mx-auto mt-1.5 max-w-md text-sm text-ink-2">{children}</div>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

/** Placeholder bar for loading states. */
export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cx('animate-pulse rounded-sm bg-rule/70', className)} />
);
