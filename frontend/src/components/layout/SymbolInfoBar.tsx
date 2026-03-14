"use client";
import { useTradingStore } from "@/store/trading.store";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, string> = {
  CRYPTO: "#f59e0b", FOREX: "#2962ff", STOCKS: "#26a69a",
  INDICES: "#9c27b0", COMMODITIES: "#ff9800", FUNDS: "#00bcd4",
};

export function SymbolInfoBar() {
  const { selectedAsset, prices } = useTradingStore();
  if (!selectedAsset) return null;
  const pd = prices[selectedAsset.symbol];
  if (!pd) return null;

  const isPos = pd.changePercent >= 0;
  const spread = (selectedAsset.spread * pd.price).toFixed(selectedAsset.spread < 0.001 ? 5 : 2);
  const catColor = CATEGORY_COLORS[selectedAsset.category] || "#5d6673";

  return (
    <div
      className="flex items-center gap-4 px-4 h-7 border-b shrink-0 overflow-x-auto"
      style={{ background: "var(--tv-bg2)", borderColor: "var(--tv-border)" }}
    >
      {/* Category badge */}
      <span
        className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
        style={{ background: catColor + "22", color: catColor }}
      >
        {selectedAsset.category}
      </span>

      {/* Full name */}
      <span className="text-[11px] font-medium shrink-0" style={{ color: "var(--tv-text)" }}>
        {selectedAsset.name}
      </span>

      <div className="h-4 w-px shrink-0" style={{ background: "var(--tv-border)" }} />

      {/* Price */}
      <span className="font-mono text-[11px] font-bold shrink-0" style={{ color: "var(--tv-text-light)" }}>
        {pd.price < 1 ? pd.price.toFixed(5) : pd.price < 100 ? pd.price.toFixed(4) : pd.price.toFixed(2)}
      </span>

      {/* Change */}
      <span className={cn("text-[11px] font-medium shrink-0", isPos ? "text-[#26a69a]" : "text-[#ef5350]")}>
        {isPos ? "▲" : "▼"} {Math.abs(pd.change).toFixed(pd.price < 10 ? 5 : 2)} ({isPos ? "+" : ""}{pd.changePercent.toFixed(2)}%)
      </span>

      <div className="h-4 w-px shrink-0" style={{ background: "var(--tv-border)" }} />

      {/* Spread */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[10px]" style={{ color: "var(--tv-muted)" }}>Spread</span>
        <span className="font-mono text-[10px]" style={{ color: "var(--tv-text)" }}>{spread}</span>
      </div>

      {/* Bid / Ask */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] text-[#ef5350]">Bid <span className="font-mono">{pd.bid?.toFixed(pd.bid < 10 ? 5 : 2)}</span></span>
        <span className="text-[10px] text-[#26a69a]">Ask <span className="font-mono">{pd.ask?.toFixed(pd.ask < 10 ? 5 : 2)}</span></span>
      </div>

      {/* Broker */}
      <span className="text-[10px] ml-auto shrink-0" style={{ color: "var(--tv-muted)" }}>
        {selectedAsset.broker}
      </span>
    </div>
  );
}
