"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SideNav } from "@/components/layout/SideNav";
import { useTradingStore } from "@/store/trading.store";
import { api } from "@/lib/api";
import { TrendingUp, TrendingDown, Minus, ExternalLink, RefreshCw, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { label: "All", value: "ALL" },
  { label: "Crypto", value: "CRYPTO" },
  { label: "Forex", value: "FOREX" },
  { label: "Stocks", value: "STOCKS" },
  { label: "Indices", value: "INDICES" },
  { label: "Commodities", value: "COMMODITIES" },
  { label: "Economy", value: "ECONOMY" },
];

const CATEGORY_COLOR: Record<string, string> = {
  CRYPTO: "#f59e0b",
  FOREX: "#2962ff",
  STOCKS: "#26a69a",
  INDICES: "#a78bfa",
  COMMODITIES: "#fb923c",
  ECONOMY: "#34d399",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: string;
  publishedAt: string;
  sentiment: "bullish" | "bearish" | "neutral";
  relatedSymbols: string[];
}

export default function NewsPage() {
  const router = useRouter();
  const { token, setSelectedAsset, assets } = useTradingStore();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [category, setCategory] = useState("ALL");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) { router.replace("/auth/login"); return; }
    fetchNews(category);
  }, [token]);

  const fetchNews = async (cat: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/news${cat !== "ALL" ? `?category=${cat}` : ""}`);
      setNews(res.data);
    } catch { setNews([]); }
    finally { setLoading(false); }
  };

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    fetchNews(cat);
  };

  const handleSymbolClick = (symbol: string) => {
    const asset = assets.find((a) => a.symbol === symbol);
    if (asset) {
      setSelectedAsset(asset);
      router.push("/trade");
    }
  };

  const sentimentIcon = (s: string) => {
    if (s === "bullish") return <TrendingUp className="h-3.5 w-3.5 text-[#26a69a]" />;
    if (s === "bearish") return <TrendingDown className="h-3.5 w-3.5 text-[#ef5350]" />;
    return <Minus className="h-3.5 w-3.5 text-[#5d6673]" />;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#131722]">
      <SideNav />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#363a45] bg-[#1e222d] px-6 py-3">
          <div>
            <h1 className="text-base font-bold text-white">Market News</h1>
            <p className="text-xs text-[#5d6673]">Real-time financial news & market insights</p>
          </div>
          <button
            onClick={() => fetchNews(category)}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-[#363a45] bg-[#2a2e39] px-3 py-1.5 text-xs text-[#b2b5be] hover:border-[#434651] hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex border-b border-[#363a45] bg-[#1e222d] px-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => handleCategoryChange(cat.value)}
              className={cn(
                "px-3 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors",
                category === cat.value
                  ? "border-[#2962ff] text-[#2962ff]"
                  : "border-transparent text-[#5d6673] hover:text-[#b2b5be]"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* News grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-2 text-[#5d6673]">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading news...</span>
              </div>
            </div>
          ) : news.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#5d6673]">
              <div className="text-4xl mb-3">📰</div>
              <div className="text-sm">No news available</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {/* Featured article (first item) */}
              {news.slice(0, 1).map((item) => (
                <div
                  key={item.id}
                  className="lg:col-span-2 xl:col-span-2 rounded-xl border border-[#363a45] bg-[#1e222d] p-5 hover:border-[#434651] transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded px-2 py-0.5 text-[10px] font-bold uppercase"
                        style={{
                          background: `${CATEGORY_COLOR[item.category] || "#5d6673"}20`,
                          color: CATEGORY_COLOR[item.category] || "#5d6673",
                        }}
                      >
                        {item.category}
                      </span>
                      <div className="flex items-center gap-1">
                        {sentimentIcon(item.sentiment)}
                        <span className={cn(
                          "text-[10px] font-medium capitalize",
                          item.sentiment === "bullish" ? "text-[#26a69a]" : item.sentiment === "bearish" ? "text-[#ef5350]" : "text-[#5d6673]"
                        )}>
                          {item.sentiment}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-[#5d6673] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>

                  <h2 className="text-sm font-bold text-white mb-2 leading-snug group-hover:text-[#4d7cff] transition-colors">
                    {item.title}
                  </h2>
                  <p className="text-xs text-[#b2b5be] leading-relaxed mb-3">{item.summary}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-[#5d6673]">{item.source}</span>
                      <span className="text-[#363a45]">·</span>
                      <span className="flex items-center gap-1 text-[11px] text-[#5d6673]">
                        <Clock className="h-3 w-3" />{timeAgo(item.publishedAt)}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {item.relatedSymbols.slice(0, 3).map((sym) => (
                        <button
                          key={sym}
                          onClick={(e) => { e.stopPropagation(); handleSymbolClick(sym); }}
                          className="rounded bg-[#2a2e39] px-1.5 py-0.5 text-[10px] font-mono font-medium text-[#b2b5be] hover:bg-[#2962ff] hover:text-white transition-colors"
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {/* Regular articles */}
              {news.slice(1).map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-[#363a45] bg-[#1e222d] p-4 hover:border-[#434651] transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                      style={{
                        background: `${CATEGORY_COLOR[item.category] || "#5d6673"}20`,
                        color: CATEGORY_COLOR[item.category] || "#5d6673",
                      }}
                    >
                      {item.category}
                    </span>
                    {sentimentIcon(item.sentiment)}
                  </div>

                  <h3 className="text-xs font-bold text-white mb-1.5 leading-snug group-hover:text-[#4d7cff] transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-[#5d6673] leading-relaxed mb-3 line-clamp-2">{item.summary}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-[#5d6673]">{item.source}</span>
                      <span className="text-[10px] text-[#5d6673]">· {timeAgo(item.publishedAt)}</span>
                    </div>
                    <div className="flex gap-1">
                      {item.relatedSymbols.slice(0, 2).map((sym) => (
                        <button
                          key={sym}
                          onClick={(e) => { e.stopPropagation(); handleSymbolClick(sym); }}
                          className="rounded bg-[#2a2e39] px-1.5 py-0.5 text-[9px] font-mono text-[#b2b5be] hover:bg-[#2962ff] hover:text-white transition-colors"
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
