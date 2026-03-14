"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SideNav } from "@/components/layout/SideNav";
import { useTradingStore } from "@/store/trading.store";
import { Asset, AssetCategory } from "@/types";
import { cn } from "@/lib/utils";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Filter, TrendingUp } from "lucide-react";

type SortKey = "symbol" | "name" | "price" | "change" | "changePercent" | "spread" | "leverage";
type SortDir = "asc" | "desc";

const CATEGORIES: AssetCategory[] = ["CRYPTO", "FOREX", "STOCKS", "INDICES", "COMMODITIES", "FUNDS"];
const CHANGE_FILTERS = [
  { label: "All", fn: () => true },
  { label: "↑ Gainers", fn: (c: number) => c > 0 },
  { label: "↓ Losers", fn: (c: number) => c < 0 },
  { label: "> 2%", fn: (c: number) => Math.abs(c) > 2 },
  { label: "> 5%", fn: (c: number) => Math.abs(c) > 5 },
];

export default function ScreenerPage() {
  const router = useRouter();
  const { assets, prices, setSelectedAsset } = useTradingStore();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<AssetCategory | "ALL">("ALL");
  const [changeFilterIdx, setChangeFilterIdx] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("changePercent");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const filtered = useMemo(() => {
    return assets
      .filter((a) => catFilter === "ALL" || a.category === catFilter)
      .filter((a) => {
        if (!search) return true;
        return a.symbol.toLowerCase().includes(search.toLowerCase()) ||
          a.name.toLowerCase().includes(search.toLowerCase());
      })
      .filter((a) => {
        const pd = prices[a.symbol];
        const chg = pd?.changePercent ?? 0;
        return CHANGE_FILTERS[changeFilterIdx].fn(chg);
      })
      .map((a) => {
        const pd = prices[a.symbol];
        return {
          ...a,
          price: pd?.price ?? 0,
          change: pd?.change ?? 0,
          changePercent: pd?.changePercent ?? 0,
        };
      })
      .sort((a, b) => {
        let va: any, vb: any;
        if (sortKey === "price") { va = a.price; vb = b.price; }
        else if (sortKey === "change") { va = a.change; vb = b.change; }
        else if (sortKey === "changePercent") { va = a.changePercent; vb = b.changePercent; }
        else if (sortKey === "spread") { va = a.spread; vb = b.spread; }
        else if (sortKey === "leverage") { va = a.maxLeverage; vb = b.maxLeverage; }
        else { va = (a as any)[sortKey]; vb = (b as any)[sortKey]; }
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
  }, [assets, prices, catFilter, search, changeFilterIdx, sortKey, sortDir]);

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
      : <ArrowUpDown className="h-3 w-3 opacity-30" />;

  const handleRowClick = (asset: Asset) => {
    setSelectedAsset(asset);
    router.push("/trade");
  };

  const colHdr = (label: string, k: SortKey, align: "left" | "right" = "right") => (
    <th
      className={cn("px-3 py-2 text-[10px] font-semibold uppercase tracking-wider cursor-pointer hover:text-[#2962ff] transition-colors select-none", align === "right" ? "text-right" : "text-left")}
      style={{ color: "var(--tv-muted)" }}
      onClick={() => handleSort(k)}
    >
      <span className="flex items-center gap-1 justify-end"><SortIcon k={k} />{label}</span>
    </th>
  );

  const CATEGORY_COLORS: Record<string, string> = {
    CRYPTO: "#f59e0b", FOREX: "#2962ff", STOCKS: "#26a69a",
    INDICES: "#9c27b0", COMMODITIES: "#ff9800", FUNDS: "#00bcd4",
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--tv-bg)" }}>
      <SideNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b shrink-0" style={{ borderColor: "var(--tv-border)", background: "var(--tv-bg2)" }}>
          <Filter className="h-5 w-5 text-[#2962ff]" />
          <div>
            <h1 className="text-base font-bold" style={{ color: "var(--tv-text-light)" }}>Screener</h1>
            <p className="text-xs" style={{ color: "var(--tv-muted)" }}>Filter and sort {assets.length} instruments</p>
          </div>
          <div className="flex-1" />
          {/* Search */}
          <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 border w-52"
            style={{ background: "var(--tv-bg3)", borderColor: "var(--tv-border)" }}>
            <Search className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--tv-muted)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search symbol or name..."
              className="flex-1 bg-transparent outline-none text-xs"
              style={{ color: "var(--tv-text-light)" }}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 px-6 py-2 border-b shrink-0 flex-wrap" style={{ borderColor: "var(--tv-border)", background: "var(--tv-bg2)" }}>
          {/* Category */}
          <div className="flex gap-1">
            <button
              onClick={() => setCatFilter("ALL")}
              className="px-2.5 py-1 rounded text-xs transition-colors"
              style={{ background: catFilter === "ALL" ? "#2962ff" : "var(--tv-bg3)", color: catFilter === "ALL" ? "white" : "var(--tv-text)" }}
            >
              All
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                className="px-2.5 py-1 rounded text-xs transition-colors font-medium"
                style={{
                  background: catFilter === c ? (CATEGORY_COLORS[c] + "33") : "var(--tv-bg3)",
                  color: catFilter === c ? CATEGORY_COLORS[c] : "var(--tv-text)",
                  borderWidth: catFilter === c ? 1 : 0,
                  borderStyle: "solid",
                  borderColor: catFilter === c ? CATEGORY_COLORS[c] : "transparent",
                }}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="h-4 w-px" style={{ background: "var(--tv-border)" }} />

          {/* Change filter */}
          <div className="flex gap-1">
            {CHANGE_FILTERS.map((f, i) => (
              <button
                key={i}
                onClick={() => setChangeFilterIdx(i)}
                className="px-2.5 py-1 rounded text-xs transition-colors"
                style={{
                  background: changeFilterIdx === i ? "#2962ff20" : "var(--tv-bg3)",
                  color: changeFilterIdx === i ? "#4d7cff" : "var(--tv-text)",
                  borderWidth: changeFilterIdx === i ? 1 : 0,
                  borderStyle: "solid",
                  borderColor: changeFilterIdx === i ? "#2962ff44" : "transparent",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <span className="ml-auto text-[11px]" style={{ color: "var(--tv-muted)" }}>{filtered.length} results</span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10 border-b" style={{ background: "var(--tv-bg2)", borderColor: "var(--tv-border)" }}>
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider cursor-pointer hover:text-[#2962ff]"
                  style={{ color: "var(--tv-muted)" }} onClick={() => handleSort("symbol")}>
                  <span className="flex items-center gap-1"><SortIcon k="symbol" />Symbol</span>
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider cursor-pointer hover:text-[#2962ff]"
                  style={{ color: "var(--tv-muted)" }} onClick={() => handleSort("name")}>
                  <span className="flex items-center gap-1"><SortIcon k="name" />Name</span>
                </th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tv-muted)" }}>Category</th>
                {colHdr("Price", "price")}
                {colHdr("Change", "change")}
                {colHdr("Change %", "changePercent")}
                {colHdr("Spread", "spread")}
                {colHdr("Max Lev", "leverage")}
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const isPos = a.changePercent >= 0;
                const catColor = CATEGORY_COLORS[a.category] || "#5d6673";
                const fmtPrice = a.price < 1 ? a.price.toFixed(5) : a.price < 100 ? a.price.toFixed(4) : a.price.toFixed(2);
                return (
                  <tr
                    key={a.id}
                    onClick={() => handleRowClick(a)}
                    className="border-b cursor-pointer hover:bg-[var(--tv-bg3)] transition-colors"
                    style={{ borderColor: "var(--tv-border)" }}
                  >
                    <td className="px-3 py-2.5">
                      <span className="text-xs font-bold" style={{ color: "var(--tv-text-light)" }}>{a.symbol}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs max-w-[200px] truncate" style={{ color: "var(--tv-text)" }}>{a.name}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: catColor + "22", color: catColor }}>
                        {a.category}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs font-medium" style={{ color: "var(--tv-text-light)" }}>
                      {a.price > 0 ? fmtPrice : "—"}
                    </td>
                    <td className={cn("px-3 py-2.5 text-right font-mono text-xs", isPos ? "text-[#26a69a]" : "text-[#ef5350]")}>
                      {a.change !== 0 ? `${isPos ? "+" : ""}${a.change.toFixed(a.price < 10 ? 5 : 2)}` : "—"}
                    </td>
                    <td className={cn("px-3 py-2.5 text-right font-mono text-xs font-bold", isPos ? "text-[#26a69a]" : "text-[#ef5350]")}>
                      {a.changePercent !== 0 ? `${isPos ? "+" : ""}${a.changePercent.toFixed(2)}%` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs" style={{ color: "var(--tv-muted)" }}>
                      {(a.spread * 100).toFixed(3)}%
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs" style={{ color: "var(--tv-text)" }}>{a.maxLeverage}×</td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRowClick(a); }}
                        className="opacity-0 group-hover:opacity-100 text-[10px] px-2 py-0.5 rounded bg-[#2962ff] text-white"
                      >
                        Trade
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <TrendingUp className="h-8 w-8 opacity-20" style={{ color: "var(--tv-muted)" }} />
              <span className="text-sm" style={{ color: "var(--tv-muted)" }}>No instruments match your filters</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
