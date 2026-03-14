"use client";
import { X } from "lucide-react";
import { useTradingStore } from "@/store/trading.store";

export function ChartSettingsModal() {
  const { showChartSettings, setShowChartSettings, chartSettings, setChartSettings } = useTradingStore();
  if (!showChartSettings) return null;

  const Row = ({ label, colorKey }: { label: string; colorKey: keyof typeof chartSettings }) => {
    const val = chartSettings[colorKey];
    if (typeof val !== "string") return null;
    return (
      <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--tv-border)" }}>
        <span className="text-xs" style={{ color: "var(--tv-text-light)" }}>{label}</span>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded border" style={{ background: val, borderColor: "var(--tv-border2)" }} />
          <input
            type="color"
            value={val}
            onChange={(e) => setChartSettings({ [colorKey]: e.target.value })}
            className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowChartSettings(false)} />
      <div className="relative w-[360px] rounded-xl shadow-2xl border overflow-hidden"
        style={{ background: "var(--tv-bg2)", borderColor: "var(--tv-border)" }}>
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--tv-border)" }}>
          <span className="font-semibold text-sm" style={{ color: "var(--tv-text-light)" }}>Chart Settings</span>
          <div className="flex-1" />
          <button onClick={() => setShowChartSettings(false)} className="p-1 rounded hover:bg-[var(--tv-bg3)]">
            <X className="h-4 w-4" style={{ color: "var(--tv-muted)" }} />
          </button>
        </div>

        <div className="p-4 space-y-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--tv-muted)" }}>Colors</div>
          <Row label="Background" colorKey="bgColor" />
          <Row label="Grid" colorKey="gridColor" />
          <Row label="Bullish candle" colorKey="upColor" />
          <Row label="Bearish candle" colorKey="downColor" />
          <Row label="Bullish wick" colorKey="wickUpColor" />
          <Row label="Bearish wick" colorKey="wickDownColor" />

          <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--tv-muted)" }}>Scale</div>
          <label className="flex items-center justify-between py-2 cursor-pointer">
            <span className="text-xs" style={{ color: "var(--tv-text-light)" }}>Logarithmic Scale</span>
            <div
              onClick={() => setChartSettings({ logScale: !chartSettings.logScale })}
              className={`relative w-9 h-5 rounded-full transition-colors ${chartSettings.logScale ? "bg-[#2962ff]" : "bg-[var(--tv-bg3)]"}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${chartSettings.logScale ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
          </label>
          <label className="flex items-center justify-between py-2 cursor-pointer">
            <span className="text-xs" style={{ color: "var(--tv-text-light)" }}>Percentage Scale</span>
            <div
              onClick={() => setChartSettings({ percentScale: !chartSettings.percentScale })}
              className={`relative w-9 h-5 rounded-full transition-colors ${chartSettings.percentScale ? "bg-[#2962ff]" : "bg-[var(--tv-bg3)]"}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${chartSettings.percentScale ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
          </label>
        </div>

        <div className="flex gap-2 px-4 py-3 border-t" style={{ borderColor: "var(--tv-border)" }}>
          <button
            onClick={() => setChartSettings({
              bgColor: "#131722", gridColor: "#1e222d",
              upColor: "#26a69a", downColor: "#ef5350",
              wickUpColor: "#26a69a", wickDownColor: "#ef5350",
            })}
            className="flex-1 py-1.5 rounded text-xs border transition-colors hover:bg-[var(--tv-bg3)]"
            style={{ borderColor: "var(--tv-border)", color: "var(--tv-text)" }}
          >
            Reset Defaults
          </button>
          <button
            onClick={() => setShowChartSettings(false)}
            className="flex-1 py-1.5 rounded text-xs font-semibold bg-[#2962ff] text-white hover:bg-[#1e4dd8] transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
