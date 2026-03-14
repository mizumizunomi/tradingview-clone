"use client";
import { useState } from "react";
import { ChevronDown, Bookmark, Sun, Moon } from "lucide-react";
import { useTradingStore } from "@/store/trading.store";
import { SymbolSearch } from "@/components/trading/SymbolSearch";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1D", "1W", "1M"];

const CATEGORY_ICONS: Record<string, string> = {
  CRYPTO: "₿", FOREX: "💱", STOCKS: "📈", INDICES: "📊",
  COMMODITIES: "🛢", FUNDS: "💼", FUTURES: "⚡", BONDS: "🏛", ECONOMY: "🌐",
};

export function TopToolbar() {
  const [showSearch, setShowSearch] = useState(false);
  const [showTfMenu, setShowTfMenu] = useState(false);
  const { selectedAsset, timeframe, setTimeframe, prices, wallet, positions, theme, toggleTheme } = useTradingStore();

  const priceData = selectedAsset ? prices[selectedAsset.symbol] : null;

  const totalUnrealizedPnL = positions
    .filter((p) => p.isOpen)
    .reduce((sum, p) => {
      const pd = prices[p.symbol];
      if (!pd) return sum + p.unrealizedPnL;
      const diff = p.side === "BUY" ? pd.price - p.entryPrice : p.entryPrice - pd.price;
      return sum + diff * p.quantity * p.leverage - p.commission;
    }, 0);

  return (
    <>
      <div className="flex h-[38px] items-center border-b border-[#363a45] bg-[#1e222d] px-2 gap-1 overflow-x-auto shrink-0">
        {/* Symbol selector */}
        <button
          onClick={() => setShowSearch(true)}
          className="flex items-center gap-1.5 rounded px-2 py-1 hover:bg-[#2a2e39] transition-colors shrink-0 group"
        >
          <span className="text-sm">{selectedAsset ? CATEGORY_ICONS[selectedAsset.category] || "📊" : "📊"}</span>
          <span className="text-sm font-bold text-white group-hover:text-[#4d7cff] transition-colors">
            {selectedAsset?.symbol || "Select Symbol"}
          </span>
          {priceData && (
            <>
              <span className="text-xs font-mono text-[#d1d4dc]">
                {priceData.price < 10 ? priceData.price.toFixed(5) : priceData.price.toFixed(2)}
              </span>
              <span className={cn("text-xs font-medium", priceData.changePercent >= 0 ? "text-[#26a69a]" : "text-[#ef5350]")}>
                {priceData.changePercent >= 0 ? "+" : ""}{priceData.changePercent.toFixed(2)}%
              </span>
            </>
          )}
          {selectedAsset && <span className="text-[10px] text-[#5d6673]">{selectedAsset.broker}</span>}
          <ChevronDown className="h-3 w-3 text-[#5d6673]" />
        </button>

        <div className="h-5 w-px bg-[#363a45] shrink-0 mx-1" />

        {/* Timeframe buttons */}
        <div className="flex items-center gap-0 shrink-0">
          {TIMEFRAMES.slice(0, 6).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf as any)}
              className={cn(
                "px-2 py-1 rounded text-xs font-medium transition-colors",
                timeframe === tf
                  ? "bg-[#2962ff] text-white"
                  : "text-[#5d6673] hover:bg-[#2a2e39] hover:text-[#b2b5be]"
              )}
            >
              {tf}
            </button>
          ))}
          <div className="relative">
            <button
              onClick={() => setShowTfMenu(!showTfMenu)}
              className="flex items-center gap-0.5 rounded px-2 py-1 text-xs text-[#5d6673] hover:bg-[#2a2e39] hover:text-[#b2b5be]"
            >
              {TIMEFRAMES.slice(6).includes(timeframe) ? timeframe : "···"}
              <ChevronDown className="h-3 w-3" />
            </button>
            {showTfMenu && (
              <div className="absolute top-8 left-0 z-20 rounded-lg border border-[#363a45] bg-[#1e222d] py-1 shadow-xl min-w-[80px]">
                {TIMEFRAMES.slice(6).map((tf) => (
                  <button key={tf} onClick={() => { setTimeframe(tf as any); setShowTfMenu(false); }}
                    className={cn("block w-full px-4 py-1.5 text-left text-xs hover:bg-[#2a2e39]", timeframe === tf ? "text-[#2962ff]" : "text-[#b2b5be]")}>
                    {tf}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="h-5 w-px bg-[#363a45] shrink-0 mx-1" />

        <button className="rounded p-1.5 shrink-0 transition-colors" style={{ color: "var(--tv-muted)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--tv-bg3)")}
          onMouseLeave={e => (e.currentTarget.style.background = "")}>
          <Bookmark className="h-3.5 w-3.5" />
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="rounded p-1.5 shrink-0 transition-colors"
          style={{ color: "var(--tv-muted)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--tv-bg3)")}
          onMouseLeave={e => (e.currentTarget.style.background = "")}
        >
          {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>

        {/* Account summary */}
        {wallet && (
          <div className="flex items-center gap-4 border-l border-[#363a45] pl-4 shrink-0">
            <div>
              <div className="text-[10px] text-[#5d6673] leading-none mb-0.5">Balance</div>
              <div className="text-xs font-mono font-medium text-[#d1d4dc]">${formatPrice(wallet.balance)}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#5d6673] leading-none mb-0.5">Equity</div>
              <div className="text-xs font-mono font-medium text-[#d1d4dc]">${formatPrice(wallet.equity)}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#5d6673] leading-none mb-0.5">P&L</div>
              <div className={cn("text-xs font-mono font-bold", totalUnrealizedPnL >= 0 ? "text-[#26a69a]" : "text-[#ef5350]")}>
                {totalUnrealizedPnL >= 0 ? "+" : ""}${formatPrice(Math.abs(totalUnrealizedPnL))}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#5d6673] leading-none mb-0.5">Free Margin</div>
              <div className="text-xs font-mono font-medium text-[#d1d4dc]">${formatPrice(wallet.freeMargin)}</div>
            </div>
          </div>
        )}
      </div>

      {showSearch && <SymbolSearch onClose={() => setShowSearch(false)} />}
    </>
  );
}
