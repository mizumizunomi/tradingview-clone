"use client";
import { useTradingStore } from "@/store/trading.store";
import { useSimulatedOrderBook } from "@/hooks/useSimulatedOrderBook";
import { X } from "lucide-react";

export function DOMPanel() {
  const { selectedAsset, prices, showDOMPanel, setShowDOMPanel } = useTradingStore();
  const pd = selectedAsset ? prices[selectedAsset.symbol] : null;
  const { bids, asks } = useSimulatedOrderBook(pd?.bid ?? 0, pd?.ask ?? 0, 10);

  if (!showDOMPanel) return null;

  const maxTotal = Math.max(...bids.map((b) => b.total), ...asks.map((a) => a.total));
  const fmt = (p: number) => p < 1 ? p.toFixed(5) : p < 100 ? p.toFixed(4) : p.toFixed(2);

  return (
    <div
      className="flex flex-col border-l shrink-0"
      style={{ width: 180, background: "var(--tv-bg)", borderColor: "var(--tv-border)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b shrink-0"
        style={{ borderColor: "var(--tv-border)", background: "var(--tv-bg2)" }}>
        <span className="text-[11px] font-semibold" style={{ color: "var(--tv-text-light)" }}>Order Book</span>
        <button onClick={() => setShowDOMPanel(false)} className="p-0.5 rounded hover:bg-[var(--tv-bg3)]">
          <X className="h-3 w-3" style={{ color: "var(--tv-muted)" }} />
        </button>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-3 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider border-b"
        style={{ color: "var(--tv-muted)", borderColor: "var(--tv-border)" }}>
        <span>Size</span>
        <span className="text-center">Price</span>
        <span className="text-right">Total</span>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Asks (reversed so lowest ask is at bottom) */}
        <div className="flex-1 flex flex-col-reverse overflow-hidden">
          {asks.map((row, i) => (
            <div key={i} className="relative grid grid-cols-3 px-2 py-px hover:bg-[var(--tv-bg3)] cursor-default">
              <div className="absolute inset-0 right-auto opacity-10"
                style={{ width: `${(row.total / maxTotal) * 100}%`, background: "#ef5350" }} />
              <span className="relative text-[10px] font-mono" style={{ color: "var(--tv-text)" }}>{row.size.toFixed(3)}</span>
              <span className="relative text-[10px] font-mono text-center text-[#ef5350]">{fmt(row.price)}</span>
              <span className="relative text-[10px] font-mono text-right" style={{ color: "var(--tv-muted)" }}>{row.total.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Spread */}
        {pd && (
          <div className="flex items-center justify-center gap-2 py-1 border-y"
            style={{ borderColor: "var(--tv-border)", background: "var(--tv-bg2)" }}>
            <span className="text-[9px]" style={{ color: "var(--tv-muted)" }}>Spread</span>
            <span className="text-[10px] font-mono font-bold" style={{ color: "var(--tv-text-light)" }}>
              {(pd.ask - pd.bid).toFixed(pd.price < 10 ? 5 : 2)}
            </span>
          </div>
        )}

        {/* Bids */}
        <div className="flex-1 overflow-hidden">
          {bids.map((row, i) => (
            <div key={i} className="relative grid grid-cols-3 px-2 py-px hover:bg-[var(--tv-bg3)] cursor-default">
              <div className="absolute inset-0 right-auto opacity-10"
                style={{ width: `${(row.total / maxTotal) * 100}%`, background: "#26a69a" }} />
              <span className="relative text-[10px] font-mono" style={{ color: "var(--tv-text)" }}>{row.size.toFixed(3)}</span>
              <span className="relative text-[10px] font-mono text-center text-[#26a69a]">{fmt(row.price)}</span>
              <span className="relative text-[10px] font-mono text-right" style={{ color: "var(--tv-muted)" }}>{row.total.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
