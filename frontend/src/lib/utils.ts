import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number, decimals = 2): string {
  if (!price) return "0.00";
  return price.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPnL(pnl: number): string {
  const sign = pnl >= 0 ? "+" : "";
  return `${sign}${formatPrice(pnl)}`;
}

export function formatPercent(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

export function getPriceDecimals(symbol: string): number {
  if (symbol.includes("JPY")) return 3;
  if (["BTCUSD", "ETHUSD"].includes(symbol)) return 2;
  if (symbol.startsWith("XAU")) return 2;
  if (symbol.includes("USD") && !symbol.startsWith("USD")) return 5;
  return 2;
}

/** Asset category for spread formatting */
type AssetCategory =
  | "CRYPTO" | "FOREX" | "STOCKS" | "FUTURES"
  | "INDICES" | "COMMODITIES" | "FUNDS" | "BONDS"
  | "ECONOMY" | "OPTIONS";

/**
 * Format spread for display. Forex = pips, others = price units (e.g. 7.18 for BTC).
 */
export function formatSpread(
  spread: number,
  category?: AssetCategory | null,
  price?: number
): string {
  if (spread <= 0) return "0";
  if (category === "FOREX") {
    // JPY pairs: 1 pip ≈ 0.01; others 1 pip = 0.0001
    const pips = price && price >= 100 ? spread * 100 : spread * 10000;
    return `${pips.toFixed(1)} pips`;
  }
  // CRYPTO, STOCKS, COMMODITIES, INDICES, etc.: show spread in price units
  if (spread >= 1) return spread.toFixed(2);
  if (spread >= 0.01) return spread.toFixed(4);
  return spread.toFixed(5);
}
