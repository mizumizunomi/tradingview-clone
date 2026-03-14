"use client";
import { useState } from "react";
import { useTradingStore, Indicator } from "@/store/trading.store";
import { X, Search, Eye, EyeOff, Settings, Trash2, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface IndicatorDef {
  type: string;
  label: string;
  description: string;
  category: string;
  pane: Indicator["pane"];
  defaultParams: Record<string, number | string>;
  paramDefs: { key: string; label: string; type: "number" | "color"; min?: number; max?: number }[];
  colors: string[];
}

const INDICATOR_DEFS: IndicatorDef[] = [
  // Overlays
  {
    type: "ema", label: "EMA", description: "Exponential Moving Average", category: "Moving Averages",
    pane: "main", defaultParams: { period: 20 }, colors: ["#f59e0b"],
    paramDefs: [{ key: "period", label: "Period", type: "number", min: 1, max: 500 }],
  },
  {
    type: "sma", label: "SMA", description: "Simple Moving Average", category: "Moving Averages",
    pane: "main", defaultParams: { period: 20 }, colors: ["#2962ff"],
    paramDefs: [{ key: "period", label: "Period", type: "number", min: 1, max: 500 }],
  },
  {
    type: "wma", label: "WMA", description: "Weighted Moving Average", category: "Moving Averages",
    pane: "main", defaultParams: { period: 20 }, colors: ["#9c27b0"],
    paramDefs: [{ key: "period", label: "Period", type: "number", min: 1, max: 500 }],
  },
  {
    type: "vwap", label: "VWAP", description: "Volume Weighted Average Price", category: "Moving Averages",
    pane: "main", defaultParams: {}, colors: ["#ff9800"],
    paramDefs: [],
  },
  {
    type: "bb", label: "Bollinger Bands", description: "Bollinger Bands (BB)", category: "Volatility",
    pane: "main", defaultParams: { period: 20, stddev: 2 }, colors: ["#2962ff", "#2962ff55", "#2962ff"],
    paramDefs: [
      { key: "period", label: "Period", type: "number", min: 1, max: 500 },
      { key: "stddev", label: "Std Dev", type: "number", min: 0.1, max: 10 },
    ],
  },
  {
    type: "keltner", label: "Keltner Channels", description: "Keltner Channels", category: "Volatility",
    pane: "main", defaultParams: { period: 20, mult: 2 }, colors: ["#ff9800"],
    paramDefs: [
      { key: "period", label: "Period", type: "number", min: 1, max: 500 },
      { key: "mult", label: "Multiplier", type: "number", min: 0.1, max: 10 },
    ],
  },
  {
    type: "ichimoku", label: "Ichimoku Cloud", description: "Ichimoku Kinko Hyo", category: "Trend",
    pane: "main", defaultParams: { tenkan: 9, kijun: 26, senkou: 52 }, colors: ["#26a69a", "#ef5350"],
    paramDefs: [
      { key: "tenkan", label: "Tenkan", type: "number", min: 1, max: 100 },
      { key: "kijun", label: "Kijun", type: "number", min: 1, max: 100 },
      { key: "senkou", label: "Senkou B", type: "number", min: 1, max: 200 },
    ],
  },
  {
    type: "parabolicsar", label: "Parabolic SAR", description: "Parabolic SAR", category: "Trend",
    pane: "main", defaultParams: { step: 0.02, max: 0.2 }, colors: ["#f59e0b"],
    paramDefs: [
      { key: "step", label: "Step", type: "number", min: 0.001, max: 0.1 },
      { key: "max", label: "Maximum", type: "number", min: 0.1, max: 0.5 },
    ],
  },
  // Oscillators
  {
    type: "rsi", label: "RSI", description: "Relative Strength Index", category: "Oscillators",
    pane: "rsi", defaultParams: { period: 14 }, colors: ["#f59e0b"],
    paramDefs: [{ key: "period", label: "Period", type: "number", min: 2, max: 100 }],
  },
  {
    type: "macd", label: "MACD", description: "Moving Average Convergence Divergence", category: "Oscillators",
    pane: "macd", defaultParams: { fast: 12, slow: 26, signal: 9 }, colors: ["#2962ff", "#ef5350", "#26a69a"],
    paramDefs: [
      { key: "fast", label: "Fast Period", type: "number", min: 1, max: 100 },
      { key: "slow", label: "Slow Period", type: "number", min: 1, max: 200 },
      { key: "signal", label: "Signal Period", type: "number", min: 1, max: 50 },
    ],
  },
  {
    type: "stoch", label: "Stochastic", description: "Stochastic Oscillator", category: "Oscillators",
    pane: "stoch", defaultParams: { period: 14, smoothK: 3, smoothD: 3 }, colors: ["#2962ff", "#ef5350"],
    paramDefs: [
      { key: "period", label: "Period", type: "number", min: 1, max: 100 },
      { key: "smoothK", label: "Smooth K", type: "number", min: 1, max: 20 },
      { key: "smoothD", label: "Smooth D", type: "number", min: 1, max: 20 },
    ],
  },
  {
    type: "wr", label: "Williams %R", description: "Williams Percent Range", category: "Oscillators",
    pane: "wr", defaultParams: { period: 14 }, colors: ["#9c27b0"],
    paramDefs: [{ key: "period", label: "Period", type: "number", min: 2, max: 100 }],
  },
  {
    type: "cci", label: "CCI", description: "Commodity Channel Index", category: "Oscillators",
    pane: "rsi", defaultParams: { period: 20 }, colors: ["#26a69a"],
    paramDefs: [{ key: "period", label: "Period", type: "number", min: 2, max: 200 }],
  },
  {
    type: "mfi", label: "MFI", description: "Money Flow Index", category: "Oscillators",
    pane: "rsi", defaultParams: { period: 14 }, colors: ["#2962ff"],
    paramDefs: [{ key: "period", label: "Period", type: "number", min: 2, max: 100 }],
  },
  // Volume
  {
    type: "obv", label: "OBV", description: "On Balance Volume", category: "Volume",
    pane: "vol", defaultParams: {}, colors: ["#2962ff"],
    paramDefs: [],
  },
  {
    type: "atr", label: "ATR", description: "Average True Range", category: "Volatility",
    pane: "rsi", defaultParams: { period: 14 }, colors: ["#ff9800"],
    paramDefs: [{ key: "period", label: "Period", type: "number", min: 1, max: 100 }],
  },
  {
    type: "adx", label: "ADX", description: "Average Directional Index", category: "Trend",
    pane: "rsi", defaultParams: { period: 14 }, colors: ["#f59e0b"],
    paramDefs: [{ key: "period", label: "Period", type: "number", min: 2, max: 100 }],
  },
];

const CATEGORIES = ["All", ...Array.from(new Set(INDICATOR_DEFS.map((d) => d.category)))];
const INDICATOR_COLORS: string[] = [
  "#2962ff", "#f59e0b", "#26a69a", "#ef5350", "#9c27b0", "#ff9800",
  "#00bcd4", "#e91e63", "#4caf50", "#ff5722",
];

export function IndicatorsModal() {
  const { showIndicatorsModal, setShowIndicatorsModal, indicators, addIndicator, removeIndicator, updateIndicator, toggleIndicator } = useTradingStore();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  if (!showIndicatorsModal) return null;

  const filtered = INDICATOR_DEFS.filter((def) => {
    const matchSearch = def.label.toLowerCase().includes(search.toLowerCase()) ||
      def.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "All" || def.category === category;
    return matchSearch && matchCat;
  });

  const grouped: Record<string, IndicatorDef[]> = {};
  filtered.forEach((def) => {
    if (!grouped[def.category]) grouped[def.category] = [];
    grouped[def.category].push(def);
  });

  const addNew = (def: IndicatorDef) => {
    const id = `${def.type}_${Date.now()}`;
    addIndicator({
      id,
      type: def.type,
      label: def.label,
      params: { ...def.defaultParams },
      visible: true,
      color: def.colors[0],
      pane: def.pane,
    });
  };

  const configuringIndicator = indicators.find((i) => i.id === configuring);
  const configuringDef = configuringIndicator ? INDICATOR_DEFS.find((d) => d.type === configuringIndicator.type) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowIndicatorsModal(false)} />
      <div
        className="relative w-[640px] max-h-[70vh] flex flex-col rounded-xl shadow-2xl border overflow-hidden"
        style={{ background: "var(--tv-bg2)", borderColor: "var(--tv-border)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--tv-border)" }}>
          <span className="font-semibold text-sm" style={{ color: "var(--tv-text-light)" }}>Indicators</span>
          <div
            className="flex items-center gap-2 flex-1 rounded-lg px-3 py-1.5 border"
            style={{ background: "var(--tv-bg3)", borderColor: "var(--tv-border)" }}
          >
            <Search className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--tv-muted)" }} />
            <input
              autoFocus
              type="text"
              placeholder="Search indicators..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent outline-none text-xs"
              style={{ color: "var(--tv-text-light)" }}
            />
          </div>
          <button onClick={() => setShowIndicatorsModal(false)} className="p-1 rounded hover:bg-[var(--tv-bg3)]">
            <X className="h-4 w-4" style={{ color: "var(--tv-muted)" }} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Category sidebar */}
          <div className="w-36 border-r flex-shrink-0 py-2 overflow-y-auto" style={{ borderColor: "var(--tv-border)" }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn("w-full text-left px-3 py-1.5 text-xs rounded-none transition-colors")}
                style={{
                  color: category === cat ? "#2962ff" : "var(--tv-text)",
                  background: category === cat ? "#2962ff15" : "transparent",
                  fontWeight: category === cat ? 600 : 400,
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-y-auto">
            {/* Active indicators */}
            {indicators.length > 0 && (
              <div className="border-b" style={{ borderColor: "var(--tv-border)" }}>
                <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--tv-muted)" }}>
                  Active Indicators
                </div>
                {indicators.map((ind) => (
                  <div
                    key={ind.id}
                    className="flex items-center gap-2 px-4 py-2 border-b last:border-0 group"
                    style={{ borderColor: "var(--tv-border)" }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ind.color || "#2962ff" }} />
                    <span className="flex-1 text-xs font-medium" style={{ color: "var(--tv-text-light)" }}>
                      {ind.label}
                      {Object.entries(ind.params).length > 0 && (
                        <span className="ml-1.5 text-[10px]" style={{ color: "var(--tv-muted)" }}>
                          ({Object.values(ind.params).join(", ")})
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleIndicator(ind.id)}
                        className="p-1 rounded hover:bg-[var(--tv-bg3)]"
                        title={ind.visible ? "Hide" : "Show"}
                      >
                        {ind.visible
                          ? <Eye className="h-3.5 w-3.5" style={{ color: "var(--tv-muted)" }} />
                          : <EyeOff className="h-3.5 w-3.5" style={{ color: "var(--tv-muted)" }} />}
                      </button>
                      <button
                        onClick={() => setConfiguring(configuring === ind.id ? null : ind.id)}
                        className="p-1 rounded hover:bg-[var(--tv-bg3)]"
                        title="Settings"
                      >
                        <Settings className="h-3.5 w-3.5" style={{ color: configuring === ind.id ? "#2962ff" : "var(--tv-muted)" }} />
                      </button>
                      <button
                        onClick={() => { removeIndicator(ind.id); if (configuring === ind.id) setConfiguring(null); }}
                        className="p-1 rounded hover:bg-[var(--tv-bg3)]"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-[#ef5350]" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Inline config */}
                {configuring && configuringDef && configuringIndicator && (
                  <div className="px-4 py-3 bg-[var(--tv-bg3)] border-t" style={{ borderColor: "var(--tv-border)" }}>
                    <div className="flex items-center gap-4 flex-wrap">
                      {configuringDef.paramDefs.map((p) => (
                        <label key={p.key} className="flex items-center gap-2">
                          <span className="text-[11px]" style={{ color: "var(--tv-muted)" }}>{p.label}</span>
                          <input
                            type="number"
                            min={p.min}
                            max={p.max}
                            value={configuringIndicator.params[p.key] as number}
                            onChange={(e) =>
                              updateIndicator(configuring!, {
                                params: { ...configuringIndicator.params, [p.key]: parseFloat(e.target.value) },
                              })
                            }
                            className="w-16 rounded px-2 py-1 text-xs border outline-none"
                            style={{ background: "var(--tv-bg2)", borderColor: "var(--tv-border)", color: "var(--tv-text-light)" }}
                          />
                        </label>
                      ))}
                      <label className="flex items-center gap-2">
                        <span className="text-[11px]" style={{ color: "var(--tv-muted)" }}>Color</span>
                        <div className="flex gap-1">
                          {INDICATOR_COLORS.map((c) => (
                            <button
                              key={c}
                              onClick={() => updateIndicator(configuring!, { color: c })}
                              className="w-4 h-4 rounded-full border-2 transition-all"
                              style={{
                                background: c,
                                borderColor: configuringIndicator.color === c ? "white" : "transparent",
                              }}
                            />
                          ))}
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Available indicators */}
            {Object.entries(grouped).map(([cat, defs]) => (
              <div key={cat}>
                <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--tv-muted)" }}>
                  {cat}
                </div>
                {defs.map((def) => {
                  const alreadyAdded = indicators.some((i) => i.type === def.type);
                  return (
                    <button
                      key={def.type}
                      onClick={() => addNew(def)}
                      className="flex items-center gap-3 w-full px-4 py-2 text-left hover:bg-[var(--tv-bg3)] transition-colors group"
                    >
                      <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: def.colors[0] }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium" style={{ color: "var(--tv-text-light)" }}>{def.label}</div>
                        <div className="text-[11px] truncate" style={{ color: "var(--tv-muted)" }}>{def.description}</div>
                      </div>
                      <div className={cn(
                        "flex-shrink-0 h-6 w-6 rounded flex items-center justify-center transition-colors",
                        alreadyAdded ? "text-[#26a69a]" : "opacity-0 group-hover:opacity-100"
                      )}
                        style={{ background: alreadyAdded ? "#26a69a20" : "var(--tv-bg3)" }}>
                        <Plus className="h-3.5 w-3.5" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
