"use client";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { TechnicalAnalysis } from "@/types/bot";

interface Props {
  data: TechnicalAnalysis;
}

const SIGNAL_STYLE = {
  BULLISH: { color: "#26a69a", bg: "rgba(38,166,154,0.1)", Icon: TrendingUp },
  BEARISH: { color: "#ef5350", bg: "rgba(239,83,80,0.1)", Icon: TrendingDown },
  NEUTRAL: { color: "#5d6673", bg: "#2a2e39", Icon: Minus },
} as const;

const TREND_STYLE = {
  UPTREND: { color: "#26a69a", label: "Uptrend" },
  DOWNTREND: { color: "#ef5350", label: "Downtrend" },
  SIDEWAYS: { color: "#f59e0b", label: "Sideways" },
} as const;

function fmt(n: number | number[] | null): string {
  if (n == null) return "—";
  if (Array.isArray(n)) return n.map((v) => v.toFixed(4)).join(" / ");
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

export default function TechnicalView({ data }: Props) {
  const trendStyle = TREND_STYLE[data.trend] ?? TREND_STYLE.SIDEWAYS;
  const scoreColor = data.compositeScore > 0.15
    ? "#26a69a"
    : data.compositeScore < -0.15
    ? "#ef5350"
    : "#f59e0b";

  const bullish = data.indicators.filter((i) => i.signal === "BULLISH").length;
  const bearish = data.indicators.filter((i) => i.signal === "BEARISH").length;

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header row */}
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <div className="text-xs mb-1" style={{ color: "#5d6673" }}>Trend</div>
          <div className="text-sm font-semibold" style={{ color: trendStyle.color }}>{trendStyle.label}</div>
        </div>
        <div>
          <div className="text-xs mb-1" style={{ color: "#5d6673" }}>Composite Score</div>
          <div className="text-sm font-semibold" style={{ color: scoreColor }}>
            {data.compositeScore >= 0 ? "+" : ""}{data.compositeScore.toFixed(3)}
          </div>
        </div>
        <div>
          <div className="text-xs mb-1" style={{ color: "#5d6673" }}>ATR</div>
          <div className="text-sm font-semibold" style={{ color: "#d1d4dc" }}>{data.atr.toFixed(4)}</div>
        </div>
        <div className="ml-auto flex gap-3 text-xs">
          <span style={{ color: "#26a69a" }}>{bullish} Bullish</span>
          <span style={{ color: "#ef5350" }}>{bearish} Bearish</span>
          <span style={{ color: "#5d6673" }}>{data.indicators.length - bullish - bearish} Neutral</span>
        </div>
      </div>

      {/* Score bar */}
      <div>
        <div className="flex justify-between text-xs mb-1" style={{ color: "#5d6673" }}>
          <span>-1.0 (Strong Sell)</span>
          <span>+1.0 (Strong Buy)</span>
        </div>
        <div className="relative h-2 rounded-full" style={{ background: "#2a2e39" }}>
          <div
            className="absolute top-0 h-2 rounded-full transition-all"
            style={{
              left: "50%",
              width: `${Math.abs(data.compositeScore) * 50}%`,
              transform: data.compositeScore >= 0 ? "none" : "translateX(-100%)",
              background: scoreColor,
            }}
          />
          <div className="absolute top-[-3px] h-3 w-0.5 rounded-full" style={{ left: "50%", background: "#363a45" }} />
        </div>
      </div>

      {/* Indicator grid */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#5d6673" }}>
          Indicators ({data.indicators.length})
        </h4>
        <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
          {data.indicators.map((ind) => {
            const s = SIGNAL_STYLE[ind.signal] ?? SIGNAL_STYLE.NEUTRAL;
            return (
              <div
                key={ind.name}
                className="flex items-center gap-3 px-3 py-2 rounded-lg"
                style={{ background: "#131722" }}
              >
                <s.Icon size={12} color={s.color} className="shrink-0" />
                <span className="text-xs flex-1" style={{ color: "#b2b5be" }}>{ind.name}</span>
                <span className="text-xs font-mono" style={{ color: "#d1d4dc" }}>{fmt(ind.value)}</span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0"
                  style={{ background: s.bg, color: s.color }}
                >
                  {ind.signal}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Support / Resistance */}
      {(data.supportLevels.length > 0 || data.resistanceLevels.length > 0) && (
        <div className="flex gap-4">
          {data.supportLevels.length > 0 && (
            <div className="flex-1">
              <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#5d6673" }}>Support</h4>
              <div className="flex flex-wrap gap-1.5">
                {data.supportLevels.slice(0, 4).map((l, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(38,166,154,0.1)", color: "#26a69a" }}>
                    {l.toFixed(4)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {data.resistanceLevels.length > 0 && (
            <div className="flex-1">
              <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#5d6673" }}>Resistance</h4>
              <div className="flex flex-wrap gap-1.5">
                {data.resistanceLevels.slice(0, 4).map((l, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(239,83,80,0.1)", color: "#ef5350" }}>
                    {l.toFixed(4)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Patterns */}
      {data.patterns.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#5d6673" }}>Patterns</h4>
          <div className="flex flex-wrap gap-1.5">
            {data.patterns.map((p, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded" style={{ background: "#2a2e39", color: "#b2b5be" }}>
                {p}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
