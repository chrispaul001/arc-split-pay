export type CurrencyCode = "USD" | "NGN" | "GHS" | "KES" | "ZAR";

export type Currency = {
  code: CurrencyCode;
  label: string;
  symbol: string;
  flag: string;
  /** local units per 1 USDC */
  rate: number;
};

export const CURRENCIES: Currency[] = [
  { code: "USD", label: "US Dollar", symbol: "$", flag: "🇺🇸", rate: 1 },
  { code: "NGN", label: "Nigerian Naira", symbol: "₦", flag: "🇳🇬", rate: 1543.2 },
  { code: "GHS", label: "Ghanaian Cedi", symbol: "GH₵", flag: "🇬🇭", rate: 12.42 },
  { code: "KES", label: "Kenyan Shilling", symbol: "KSh", flag: "🇰🇪", rate: 129.85 },
  { code: "ZAR", label: "South African Rand", symbol: "R", flag: "🇿🇦", rate: 18.06 },
];

export const getCurrency = (code: CurrencyCode) =>
  CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0]!;

export function formatLocal(usdc: number, code: CurrencyCode) {
  const c = getCurrency(code);
  const value = usdc * c.rate;
  return `${c.symbol}${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const formatUsdc = (n: number) =>
  `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
