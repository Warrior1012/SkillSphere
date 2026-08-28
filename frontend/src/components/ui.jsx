import { forwardRef } from 'react';
import { Loader2, ShieldCheck, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

const VARIANT_CLASSES = {
  primary: 'bg-ink text-paper hover:bg-ink-soft disabled:opacity-40',
  brass: 'bg-brass text-ink hover:brightness-95 disabled:opacity-40',
  outline: 'border border-slate/40 text-ink hover:bg-slate-soft/60 disabled:opacity-40',
  ghost: 'text-ink hover:bg-slate-soft/50 disabled:opacity-40',
  danger: 'bg-clay text-paper hover:brightness-110 disabled:opacity-40',
};

export const Button = forwardRef(function Button(
  { variant = 'primary', className = '', loading = false, children, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});

export const Input = forwardRef(function Input({ label, error, className = '', id, ...props }, ref) {
  const inputId = id || props.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`rounded-lg border bg-paper-raised px-3.5 py-2.5 text-sm text-ink placeholder:text-slate outline-none transition-colors focus:border-brass focus:ring-2 focus:ring-brass/20 ${
          error ? 'border-clay' : 'border-slate/30'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-clay">{error}</p>}
    </div>
  );
});

export function Card({ className = '', children, ...props }) {
  return (
    <div className={`rounded-2xl border border-slate/15 bg-paper-raised p-6 shadow-sm ${className}`} {...props}>
      {children}
    </div>
  );
}

export function Badge({ tone = 'slate', children, className = '' }) {
  const tones = {
    slate: 'bg-slate-soft text-ink',
    brass: 'bg-brass-soft text-ink',
    pine: 'bg-pine-soft text-pine',
    clay: 'bg-clay-soft text-clay',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

/** The recurring "verification seal" signature element — used on avatars and credential moments. */
export function VerifiedSeal({ size = 16 }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-brass text-ink"
      style={{ width: size, height: size }}
      title="Verified"
    >
      <ShieldCheck size={size * 0.68} strokeWidth={2.5} />
    </span>
  );
}

export function Spinner({ className = '' }) {
  return (
    <div className={`flex items-center justify-center py-10 ${className}`}>
      <div className="seal-spinner h-8 w-8 rounded-full border-2 border-brass border-t-transparent" />
    </div>
  );
}

const ALERT_STYLES = {
  info: { icon: Info, classes: 'bg-slate-soft/60 text-ink border-slate/20' },
  success: { icon: CheckCircle2, classes: 'bg-pine-soft text-pine border-pine/20' },
  warning: { icon: AlertTriangle, classes: 'bg-brass-soft/70 text-ink border-brass/30' },
  error: { icon: AlertTriangle, classes: 'bg-clay-soft text-clay border-clay/20' },
};

export function Alert({ type = 'info', children }) {
  const { icon: Icon, classes } = ALERT_STYLES[type];
  return (
    <div className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm ${classes}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
