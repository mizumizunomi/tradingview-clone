"use client";
import { useState } from "react";
import { ChevronDown, Bookmark, Sun, Moon, Bell, Settings, Layers, PlayCircle, LayoutGrid, BookOpen } from "lucide-react";
import { useTradingStore } from "@/store/trading.store";
import { SymbolSearch } from "@/components/trading/SymbolSearch";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ChartLayout } from "@/types";

const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1D", "1W", "1M"];

const CATEGORY_ICONS: Record<string, string> = {
  CRYPTO: "₿", FOREX: "💱", STOCKS: "📈", INDICES: "📊",
  COMMODITIES: "🛢", FUNDS: "💼", FUTURES: "⚡", BONDS: "🏛", ECONOMY: "🌐",
};

const LAYOUTS: { id: ChartLayout; icon: string; label: string }[] = [
  { id: "1x1", icon: "▣", label: "1 Chart" },
  { id: "2x1", icon: "▣▣", label: "2 Side by Side" },
  { id: "2x2", icon: "⊞", label: "4 Charts" },
  { id: "3x1", icon: "▣▣▣", label: "3 Side by Side" },
];

export function TopToolbar() {
  const [showSearch, setShowSearch] = useState(false);
  const [showTfMenu, setShowTfMenu] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const {
    selectedAsset, timeframe, setTimeframe, prices, wallet, positions,
    theme, toggleTheme, alerts, setShowAlertModal, setShowChartSettings,
    showObjectTree, setShowObjectTree, replayMode, setReplayMode,
    chartLayout, setChartLayout, showDOMPanel, setShowDOMPanel,
  } = useTradingStore();

  const priceData = selectedAsset ? prices[selectedAsset.symbol] : null;
  const totalUnrealizedPnL = positions
    .filter((p) => p.isOpen)
    .reduce((sum, p) => {
      const pd = prices[p.symbol];
      if (!pd) return sum + p.unrealizedPnL;
      const diff = p.side === "BUY" ? pd.price - p.entryPrice : p.entryPrice - pd.price;
      return sum + diff * p.quantity * p.leverage - p.commission;
    }, 0);

  const activeAlerts = alerts.filter((a) => !a.triggered).length;
  const iconBtn = (onClick: () => void, icon: React.ReactNode, title: string, active = false, badge?: number) => (
    <button
      onClick={onClick}
      title={title}
      className="relative rounded p-1.5 shrink-0 transition-colors"
      style={{
        color: active ? "#2962ff" : "var(--tv-muted)",
        background: active ? "#2962ff15" : "transparent",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--tv-bg3)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = ""; }}
    >
      {icon}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#f59e0b] text-[8px] font-bold text-black">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );

  return (
    <>
      <div className="relative z-20 flex h-[38px] items-center border-b px-2 gap-1 overflow-x-auto shrink-0"
        style={{ borderColor: "var(--tv-border)", background: "var(--tv-bg2)" }}>

        {/* Symbol selector */}
        <button
          onClick={() => setShowSearch(true)}
          className="flex items-center gap-1.5 rounded px-2 py-1 transition-colors shrink-0 group"
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--tv-bg3)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
        >
          <span className="text-sm">{selectedAsset ? CATEGORY_ICONS[selectedAsset.category] || "📊" : "📊"}</span>
          <span className="text-sm font-bold text-white group-hover:text-[#4d7cff] transition-colors">
            {selectedAsset?.symbol || "Select Symbol"}
          </span>
          {priceData && (
            <>
              <span className="text-xs font-mono" style={{ color: "var(--tv-text-light)" }}>
                {priceData.price < 10 ? priceData.price.toFixed(5) : priceData.price.toFixed(2)}
              </span>
              <span className={cn("text-xs font-medium", priceData.changePercent >= 0 ? "text-[#26a69a]" : "text-[#ef5350]")}>
                {priceData.changePercent >= 0 ? "+" : ""}{priceData.changePercent.toFixed(2)}%
              </span>
            </>
          )}
          <ChevronDown className="h-3 w-3" style={{ color: "var(--tv-muted)" }} />
        </button>

        <div className="h-5 w-px shrink-0 mx-1" style={{ background: "var(--tv-border)" }} />

        {/* Timeframes */}
        <div className="flex items-center gap-0 shrink-0">
          {TIMEFRAMES.slice(0, 4).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf as any)}
              className={cn("px-2 py-1 rounded text-xs font-medium transition-colors", timeframe === tf ? "bg-[#2962ff] text-white" : "hover:bg-[var(--tv-bg3)]")}
              style={{ color: timeframe === tf ? "white" : "var(--tv-muted)" }}
            >
              {tf}
            </button>
          ))}
          <div className="relative">
            <button
              onClick={() => setShowTfMenu(!showTfMenu)}
              className="flex items-center gap-0.5 rounded px-2 py-1 text-xs hover:bg-[var(--tv-bg3)]"
              style={{ color: TIMEFRAMES.slice(4).includes(timeframe) ? "#2962ff" : "var(--tv-muted)" }}
            >
              {TIMEFRAMES.slice(4).includes(timeframe) ? timeframe : "···"}
              <ChevronDown className="h-3 w-3" />
            </button>
            {showTfMenu && (
              <div className="absolute top-8 left-0 z-20 rounded-lg border py-1 shadow-xl min-w-[80px]"
                style={{ background: "var(--tv-bg2)", borderColor: "var(--tv-border)" }}>
                {TIMEFRAMES.slice(4).map((tf) => (
                  <button key={tf} onClick={() => { setTimeframe(tf as any); setShowTfMenu(false); }}
                    className={cn("block w-full px-4 py-1.5 text-left text-xs hover:bg-[var(--tv-bg3)]")}
                    style={{ color: timeframe === tf ? "#2962ff" : "var(--tv-text-light)" }}>
                    {tf}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="h-5 w-px shrink-0 mx-1" style={{ background: "var(--tv-border)" }} />

        {/* Bookmark */}
        {iconBtn(() => {}, <Bookmark className="h-3.5 w-3.5" />, "Watchlist")}

        {/* Layout picker */}
        <div className="relative">
          {iconBtn(() => setShowLayoutMenu(!showLayoutMenu), <LayoutGrid className="h-3.5 w-3.5" />, "Chart Layout", showLayoutMenu)}
          {showLayoutMenu && (
            <div className="absolute top-8 left-0 z-20 rounded-lg border py-1 shadow-xl min-w-[160px]"
              style={{ background: "var(--tv-bg2)", borderColor: "var(--tv-border)" }}>
              {LAYOUTS.map((l) => (
                <button key={l.id} onClick={() => { setChartLayout(l.id); setShowLayoutMenu(false); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-[var(--tv-bg3)]"
                  style={{ color: chartLayout === l.id ? "#2962ff" : "var(--tv-text-light)" }}>
                  <span>{l.icon}</span><span>{l.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Replay */}
        {iconBtn(() => setReplayMode(!replayMode), <PlayCircle className="h-3.5 w-3.5" />, "Bar Replay", replayMode)}

        {/* Object Tree */}
        {iconBtn(() => setShowObjectTree(!showObjectTree), <Layers className="h-3.5 w-3.5" />, "Object Tree", showObjectTree)}

        {/* DOM */}
        {iconBtn(() => setShowDOMPanel(!showDOMPanel), <BookOpen className="h-3.5 w-3.5" />, "Order Book", showDOMPanel)}

        {/* Chart Settings */}
        {iconBtn(() => setShowChartSettings(true), <Settings className="h-3.5 w-3.5" />, "Chart Settings")}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Alerts */}
        {iconBtn(() => setShowAlertModal(true), <Bell className="h-3.5 w-3.5" />, "Price Alerts", false, activeAlerts)}

        {/* Theme */}
        {iconBtn(toggleTheme, theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />, theme === "dark" ? "Light Mode" : "Dark Mode")}

        {/* Account summary */}
        {wallet && (
          <div className="flex items-center gap-4 border-l pl-4 shrink-0" style={{ borderColor: "var(--tv-border)" }}>
            {[
              { label: "Balance", val: `$${formatPrice(wallet.balance)}`, color: "var(--tv-text-light)" },
              { label: "Equity", val: `$${formatPrice(wallet.equity)}`, color: "var(--tv-text-light)" },
              {
                label: "P&L",
                val: `${totalUnrealizedPnL >= 0 ? "+" : ""}$${formatPrice(Math.abs(totalUnrealizedPnL))}`,
                color: totalUnrealizedPnL >= 0 ? "#26a69a" : "#ef5350",
              },
              { label: "Free Margin", val: `$${formatPrice(wallet.freeMargin)}`, color: "var(--tv-text-light)" },
            ].map(({ label, val, color }) => (
              <div key={label}>
                <div className="text-[10px] leading-none mb-0.5" style={{ color: "var(--tv-muted)" }}>{label}</div>
                <div className="text-xs font-mono font-medium" style={{ color }}>{val}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showSearch && <SymbolSearch onClose={() => setShowSearch(false)} />}
    </>
  );
}
