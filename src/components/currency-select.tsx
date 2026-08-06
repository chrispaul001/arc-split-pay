import { CURRENCIES, getCurrency, type CurrencyCode } from "@/lib/currency";

export function CurrencySelect({
  value,
  onChange,
  className = "",
}: {
  value: CurrencyCode;
  onChange: (c: CurrencyCode) => void;
  className?: string;
}) {
  const active = getCurrency(value);
  return (
    <label className={`relative inline-flex shrink-0 items-center ${className}`}>
      <span className="pointer-events-none absolute left-3 text-sm">{active.flag}</span>
      <select
        aria-label="Display currency"
        value={value}
        onChange={(e) => onChange(e.target.value as CurrencyCode)}
        className="appearance-none rounded-full border border-border bg-secondary/60 py-1.5 pr-7 pl-8 text-xs font-semibold outline-none transition-colors hover:bg-secondary/80 focus:ring-2 focus:ring-ring"
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2.5 size-3 opacity-60"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden
      >
        <path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </label>
  );
}

export function CurrencyPills({
  value,
  onChange,
}: {
  value: CurrencyCode;
  onChange: (c: CurrencyCode) => void;
}) {
  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {CURRENCIES.map((c) => (
        <button
          key={c.code}
          onClick={() => onChange(c.code)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
            c.code === value
              ? "bg-primary text-primary-foreground shadow-[0_6px_18px_-8px_var(--electric)]"
              : "bg-secondary/60 text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
          }`}
        >
          {c.flag} {c.code}
        </button>
      ))}
    </div>
  );
}
