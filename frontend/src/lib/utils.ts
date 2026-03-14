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
