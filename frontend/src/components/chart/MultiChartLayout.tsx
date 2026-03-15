"use client";
import { useState } from "react";
import { useTradingStore } from "@/store/trading.store";
import { TradingChart } from "./TradingChart";
import { PanelChart } from "./PanelChart";
import { ChevronDown } from "lucide-react";
import { ChartLayout } from "@/types";
import { cn } from "@/lib/utils";

const LAYOUTS: { id: ChartLayout; label: string; icon: string }[] = [
  { id: "1x1", label: "Single", icon: "▣" },
  { id: "2x1", label: "2 Side by Side", icon: "▣▣" },
  { id: "2x2", label: "4 Charts", icon: "⊞" },
  { id: "3x1", label: "3 Side by Side", icon: "▣▣▣" },
];

function getGridStyle(layout: ChartLayout): React.CSSProperties {
  switch (layout) {
    case "2x1": return { gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr" };
    case "2x2": return { gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr" };
    case "3x1": return { gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "1fr" };
    default:    return { gridTemplateColumns: "1fr", gridTemplateRows: "1fr" };
  }
}

export function MultiChartLayout() {
  const { chartLayout, chartPanels, activeChartId, setChartLayout, setActiveChartId, assets, updateChartPanel } = useTradingStore();
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);

  const handlePanelActivate = (panelId: string) => {
    setActiveChartId(panelId);
  };

  return (
    <div className="relative flex flex-col h-full">
      {/* Layout picker — only shown when multi-panel */}
      {chartLayout !== "1x1" && (
        <div className="absolute top-1 right-1 z-[100]">
          <div className="relative">
            <button
              onClick={() => setShowLayoutPicker((v) => !v)}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-colors duration-150 hover:bg-[var(--tv-bg3)]"
              style={{ background: "var(--tv-bg2)", borderColor: "var(--tv-border)", color: "var(--tv-muted)" }}
            >
              {LAYOUTS.find((l) => l.id === chartLayout)?.icon}
              <ChevronDown className="h-3 w-3" />
            </button>
            {showLayoutPicker && (
              <div
                className="absolute top-full right-0 mt-1 z-[200] rounded-lg border py-1 shadow-xl min-w-[150px]"
                style={{ background: "var(--tv-bg2)", borderColor: "var(--tv-border)" }}
              >
                {LAYOUTS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => { setChartLayout(l.id); setShowLayoutPicker(false); }}
                    className={cn("flex items-center gap-2 w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--tv-bg3)]")}
                    style={{ color: chartLayout === l.id ? "#2962ff" : "var(--tv-text-light)" }}
                  >
                    <span>{l.icon}</span><span>{l.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grid */}
      <div
        className="min-h-0"
        style={{
          display: "grid",
          ...getGridStyle(chartLayout),
          height: "100%",
          gap: "2px",
          background: "var(--tv-border)",
        }}
      >
        {chartPanels.map((panel) => {
          const isMain = panel.id === "main";
          const isActive = activeChartId === panel.id;
          return (
            <div
              key={panel.id}
              className="relative overflow-hidden chart-panel transition-all duration-150 ease-out"
              style={{
                background: "var(--tv-bg)",
                outline: isActive && chartLayout !== "1x1" ? "2px solid var(--tv-blue)" : "2px solid transparent",
                outlineOffset: "-2px",
              }}
              onClick={() => handlePanelActivate(panel.id)}
            >
              {/* Panel header for non-main panels */}
              {!isMain && (
                <PanelHeader panel={panel} updateChartPanel={updateChartPanel} assets={assets} />
              )}

              {/* Chart content */}
              <div className={!isMain ? "h-[calc(100%-2rem)]" : "h-full"}>
                {isMain ? (
                  <TradingChart />
                ) : (
                  <PanelChart symbol={panel.symbol} timeframe={panel.timeframe} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PanelHeader({ panel, updateChartPanel, assets }: any) {
  const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1D", "1W"];
  return (
    <div
      className="flex items-center gap-2 px-2 border-b h-8 shrink-0 overflow-hidden"
      style={{ borderColor: "var(--tv-border)", background: "var(--tv-bg2)" }}
    >
      <select
        value={panel.symbol}
        onChange={(e) => updateChartPanel(panel.id, { symbol: e.target.value })}
        onClick={(e) => e.stopPropagation()}
        className="text-[10px] rounded px-2 py-1 border outline-none max-w-[90px] transition-colors duration-150"
        style={{ background: "var(--tv-bg3)", borderColor: "var(--tv-border)", color: "var(--tv-text-light)" }}
      >
        {assets.slice(0, 30).map((a: any) => (
          <option key={a.symbol} value={a.symbol}>{a.symbol}</option>
        ))}
      </select>
      <div className="flex gap-0.5">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            onClick={(e) => { e.stopPropagation(); updateChartPanel(panel.id, { timeframe: tf }); }}
            className="px-2 py-1 rounded text-[9px] font-medium transition-all duration-150"
            style={{
              background: panel.timeframe === tf ? "var(--tv-blue)" : "transparent",
              color: panel.timeframe === tf ? "white" : "var(--tv-muted)",
            }}
          >
            {tf}
          </button>
        ))}
      </div>
    </div>
  );
}
