"use client";
import { useState, useEffect, useRef } from "react";
import { Search, X, TrendingUp, TrendingDown } from "lucide-react";
import { api, endpoints } from "@/lib/api";
import { useTradingStore } from "@/store/trading.store";
import { Asset } from "@/types";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "All", value: "ALL" },
  { label: "Crypto", value: "CRYPTO" },
  { label: "Forex", value: "FOREX" },
  { label: "Stocks", value: "STOCKS" },
  { label: "Indices", value: "INDICES" },
  { label: "Commodities", value: "COMMODITIES" },
  { label: "Funds", value: "FUNDS" },
  { label: "Futures", value: "FUTURES" },
];

const CATEGORY_COLOR: Record<string, string> = {
  CRYPTO: "#f59e0b",
  FOREX: "#2962ff",
  STOCKS: "#26a69a",
  INDICES: "#a78bfa",
  COMMODITIES: "#fb923c",
  FUNDS: "#34d399",
  FUTURES: "#f472b6",
  BONDS: "#94a3b8",
};

const CATEGORY_ABBR: Record<string, string> = {
  CRYPTO: "₿", FOREX: "FX", STOCKS: "ST", INDICES: "IDX",
  COMMODITIES: "CM", FUNDS: "FD", FUTURES: "FT", BONDS: "BD",
};

interface SymbolSearchProps {
  onClose: () => void;
}

export function SymbolSearch({ onClose }: SymbolSearchProps) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const { setSelectedAsset, prices } = useTradingStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    inputRef.current?.focus();
    fetchAssets("", "ALL");
  }, []);

  const fetchAssets = async (q: string, category: string) => {
    setLoading(true);
    try {
      const url = q
        ? `${endpoints.assets}/search?q=${encodeURIComponent(q)}&category=${category}`
        : `${endpoints.assets}?category=${category === "ALL" ? "" : category}`;
      const res = await api.get(url);
      setAssets(res.data);
    } catch {
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleQueryChange = (q: string) => {
    setQuery(q);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchAssets(q, activeTab), 200);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    fetchAssets(query, tab);
  };

  const handleSelect = (asset: Asset) => {
    setSelectedAsset(asset);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="flex w-[580px] flex-col rounded-xl border border-[#363a45] bg-[#1e222d] shadow-2xl overflow-hidden"
        style={{ maxHeight: "65vh" }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-[#363a45] px-4 py-3 bg-[#131722]">
          <Search className="h-4 w-4 shrink-0 text-[#5d6673]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search symbol, name..."
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#5d6673]"
          />
          {loading && (
            <svg className="h-3.5 w-3.5 animate-spin text-[#5d6673]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          )}
          <button onClick={onClose} className="text-[#5d6673] hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-0 border-b border-[#363a45] bg-[#1e222d] px-2 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={cn(
                "whitespace-nowrap px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab.value
                  ? "border-[#2962ff] text-[#2962ff]"
                  : "border-transparent text-[#5d6673] hover:text-[#b2b5be]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {assets.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#5d6673]">
              <Search className="h-8 w-8 mb-2 opacity-30" />
              <div className="text-sm">No symbols found</div>
            </div>
          ) : (
            <div className="divide-y divide-[#1e222d]">
              {assets.map((asset) => {
                const pd = prices[asset.symbol];
                const isPositive = (pd?.changePercent ?? 0) >= 0;
                const color = CATEGORY_COLOR[asset.category] || "#b2b5be";
                return (
                  <button
                    key={asset.id}
                    onClick={() => handleSelect(asset)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[#2a2e39] transition-colors group"
                  >
                    {/* Category badge */}
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold"
                      style={{ background: `${color}20`, color }}
                    >
                      {CATEGORY_ABBR[asset.category] || "—"}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{asset.symbol}</span>
                        <span
                          className="rounded px-1 py-0.5 text-[9px] font-bold uppercase"
                          style={{ background: `${color}20`, color }}
                        >
                          {asset.category}
                        </span>
                      </div>
                      <div className="truncate text-xs text-[#5d6673]">{asset.name}</div>
                    </div>

                    {/* Broker + Price */}
                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-[#5d6673] mb-0.5">{asset.broker}</div>
                      {pd ? (
                        <>
                          <div className="font-mono text-xs font-medium text-white">
                            {pd.price >= 1000
                              ? pd.price.toLocaleString("en-US", { maximumFractionDigits: 0 })
                              : pd.price < 10
                              ? pd.price.toFixed(5)
                              : pd.price.toFixed(2)}
                          </div>
                          <div className={cn("text-[10px] font-medium", isPositive ? "text-[#26a69a]" : "text-[#ef5350]")}>
                            {isPositive ? "+" : ""}{pd.changePercent.toFixed(2)}%
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-[#5d6673]">—</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
