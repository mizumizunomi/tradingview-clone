"use client";
import { useState } from "react";
import { Star, Search, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useTradingStore } from "@/store/trading.store";
import { cn } from "@/lib/utils";

const FEATURED_SYMBOLS = [
  "BTCUSD", "ETHUSD", "SOLUSD", "XRPUSD", "BNBUSD", "ADAUSD", "DOGEUSD",
  "EURUSD", "GBPUSD", "USDJPY", "AUDUSD",
  "XAUUSD", "USOIL", "XAGUSD",
  "AAPL", "MSFT", "NVDA", "TSLA", "GOOGL", "META",
  "SPX500", "NAS100", "DJI",
];

function formatWatchPrice(price: number): string {
  if (price >= 10000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (price >= 100) return price.toFixed(2);
  if (price >= 1) return price.toFixed(3);
  return price.toFixed(5);
}

export function Watchlist() {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const { assets, prices, setSelectedAsset, selectedAsset } = useTradingStore();

  const watchlistAssets = assets
    .filter((a) => FEATURED_SYMBOLS.includes(a.symbol))
    .filter((a) =>
      search === "" ||
      a.symbol.toLowerCase().includes(search.toLowerCase()) ||
      a.name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => FEATURED_SYMBOLS.indexOf(a.symbol) - FEATURED_SYMBOLS.indexOf(b.symbol));

  if (collapsed) {
    return (
      <div
        className="flex flex-col items-center gap-2 border-r border-[#363a45] bg-[#1e222d] py-2"
        style={{ width: 28 }}
      >
        <button
          onClick={() => setCollapsed(false)}
          className="rounded p-1 text-[#5d6673] hover:text-white hover:bg-[#2a2e39] transition-colors"
          title="Expand watchlist"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <div
          className="text-[9px] font-bold uppercase tracking-widest text-[#5d6673]"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          Watchlist
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col border-r border-[#363a45] bg-[#1e222d]"
      style={{ width: 185, minWidth: 160 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#363a45] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Star className="h-3 w-3 text-[#f59e0b]" fill="#f59e0b" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#b2b5be]">Watchlist</span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="text-[#5d6673] hover:text-white transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-[#363a45] px-2 py-1.5">
        <div className="flex items-center gap-1.5 rounded bg-[#131722] border border-[#363a45] px-2 py-1">
          <Search className="h-3 w-3 shrink-0 text-[#5d6673]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter..."
            className="flex-1 bg-transparent text-[11px] text-[#d1d4dc] outline-none placeholder:text-[#5d6673] min-w-0"
          />
        </div>
      </div>

      {/* Asset list */}
      <div className="flex-1 overflow-y-auto">
        {watchlistAssets.map((asset) => {
          const pd = prices[asset.symbol];
          const isSelected = selectedAsset?.symbol === asset.symbol;
          const isPositive = (pd?.changePercent ?? 0) >= 0;

          return (
            <button
              key={asset.symbol}
              onClick={() => setSelectedAsset(asset)}
              className={cn(
                "group flex w-full items-center justify-between px-3 py-2 text-left transition-all",
                isSelected
                  ? "bg-[#2962ff15] border-l-2 border-[#2962ff]"
                  : "border-l-2 border-transparent hover:bg-[#2a2e39]"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className={cn(
                  "text-xs font-bold leading-tight",
                  isSelected ? "text-white" : "text-[#d1d4dc] group-hover:text-white"
                )}>
                  {asset.symbol}
                </div>
                <div className="truncate text-[10px] text-[#5d6673] leading-tight mt-0.5">
                  {asset.name.split(" ").slice(0, 3).join(" ")}
                </div>
              </div>

              <div className="ml-2 shrink-0 text-right">
                {pd ? (
                  <>
                    <div className="font-mono text-[11px] font-medium text-[#d1d4dc] leading-tight">
                      {formatWatchPrice(pd.price)}
                    </div>
                    <div className={cn(
                      "flex items-center justify-end gap-0.5 text-[10px] font-medium leading-tight",
                      isPositive ? "text-[#26a69a]" : "text-[#ef5350]"
                    )}>
                      {isPositive
                        ? <ArrowUpRight className="h-2.5 w-2.5" />
                        : <ArrowDownRight className="h-2.5 w-2.5" />}
                      {Math.abs(pd.changePercent).toFixed(2)}%
                    </div>
                  </>
                ) : (
                  <div className="text-[11px] text-[#5d6673]">—</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
