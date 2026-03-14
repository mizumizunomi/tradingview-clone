"use client";
import { useState } from "react";
import { useTradingStore } from "@/store/trading.store";
import { TradingChart } from "./TradingChart";
import { ChevronDown } from "lucide-react";
import { ChartLayout } from "@/types";
import { cn } from "@/lib/utils";

const LAYOUTS: { id: ChartLayout; label: string; icon: string }[] = [
  { id: "1x1", label: "Single", icon: "▣" },
  { id: "2x1", label: "2 Side by Side", icon: "▣▣" },
  { id: "2x2", label: "4 Charts", icon: "⊞" },
  { id: "3x1", label: "3 Side by Side", icon: "▣▣▣" },
];

const GRID_CLASSES: Record<ChartLayout, string> = {
  "1x1": "grid-cols-1 grid-rows-1",
  "2x1": "grid-cols-2 grid-rows-1",
  "2x2": "grid-cols-2 grid-rows-2",
  "3x1": "grid-cols-3 grid-rows-1",
};

export function MultiChartLayout() {
  const { chartLayout, chartPanels, activeChartId, setChartLayout, setActiveChartId, assets, updateChartPanel, setSelectedAsset, setTimeframe } = useTradingStore();
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);

  const handlePanelActivate = (panelId: string) => {
    setActiveChartId(panelId);
    if (panelId === "main") return; // main panel synced with global store
    const panel = chartPanels.find((p) => p.id === panelId);
    if (panel) {
      const asset = assets.find((a) => a.symbol === panel.symbol);
      if (asset) setSelectedAsset(asset);
    }
  };

  return (
    <div className="relative flex flex-col h-full">
      {/* Layout picker button */}
      {chartLayout !== "1x1" && (
        <div className="absolute top-1 right-1 z-20">
          <div className="relative">
            <button
              onClick={() => setShowLayoutPicker(!showLayoutPicker)}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] border"
              style={{ background: "var(--tv-bg2)", borderColor: "var(--tv-border)", color: "var(--tv-muted)" }}
            >
              {LAYOUTS.find((l) => l.id === chartLayout)?.icon}
              <ChevronDown className="h-3 w-3" />
            </button>
            {showLayoutPicker && (
              <div className="absolute top-7 right-0 z-30 rounded-lg border py-1 shadow-xl"
                style={{ background: "var(--tv-bg2)", borderColor: "var(--tv-border)" }}>
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

      <div className={`grid ${GRID_CLASSES[chartLayout]} h-full gap-px`} style={{ background: "var(--tv-border)" }}>
        {chartPanels.map((panel) => (
          <div
            key={panel.id}
            className="relative overflow-hidden"
            style={{
              background: "var(--tv-bg)",
              outline: activeChartId === panel.id && chartLayout !== "1x1" ? "2px solid #2962ff" : "none",
              outlineOffset: "-2px",
            }}
            onClick={() => handlePanelActivate(panel.id)}
          >
            {/* Per-panel symbol/timeframe selector (non-main panels only) */}
            {panel.id !== "main" && (
              <PanelHeader panel={panel} updateChartPanel={updateChartPanel} assets={assets} />
            )}
            <div className={panel.id !== "main" ? "h-[calc(100%-28px)]" : "h-full"}>
              <TradingChart />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelHeader({ panel, updateChartPanel, assets }: any) {
  const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1D", "1W"];
  return (
    <div className="flex items-center gap-1 px-2 border-b h-7 shrink-0 overflow-hidden"
      style={{ borderColor: "var(--tv-border)", background: "var(--tv-bg2)" }}>
      <select
        value={panel.symbol}
        onChange={(e) => updateChartPanel(panel.id, { symbol: e.target.value })}
        onClick={(e) => e.stopPropagation()}
        className="text-[10px] rounded px-1 py-0.5 border outline-none max-w-[80px]"
        style={{ background: "var(--tv-bg3)", borderColor: "var(--tv-border)", color: "var(--tv-text-light)" }}
      >
        {assets.slice(0, 30).map((a: any) => <option key={a.symbol} value={a.symbol}>{a.symbol}</option>)}
      </select>
      <div className="flex gap-px">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            onClick={(e) => { e.stopPropagation(); updateChartPanel(panel.id, { timeframe: tf }); }}
            className="px-1.5 py-0.5 rounded text-[9px] transition-colors"
            style={{
              background: panel.timeframe === tf ? "#2962ff" : "transparent",
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
