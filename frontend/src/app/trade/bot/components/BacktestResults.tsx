"use client";
import { TrendingUp, TrendingDown, BarChart2 } from "lucide-react";
import type { BacktestResult } from "@/types/bot";

interface Props {
  result: BacktestResult;
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg p-2.5" style={{ background: "#131722" }}>
      <div className="text-xs mb-1" style={{ color: "#5d6673" }}>{label}</div>
      <div className="text-sm font-semibold" style={{ color: color ?? "#d1d4dc" }}>{value}</div>
    </div>
  );
}

export default function BacktestResults({ result }: Props) {
  const pnlColor = result.totalReturn >= 0 ? "#26a69a" : "#ef5350";
  const winRatePct = (result.winRate * 100).toFixed(1);
  const maxDD = `${result.maxDrawdownPercent.toFixed(2)}%`;

  // Equity curve mini chart
  const curve = result.equityCurve;
  const minEq = Math.min(...curve.map((p) => p.equity));
  const maxEq = Math.max(...curve.map((p) => p.equity));
  const range = maxEq - minEq || 1;
  const W = 280;
  const H = 60;
  const points = curve
    .map((p, i) => {
      const x = (i / Math.max(curve.length - 1, 1)) * W;
      const y = H - ((p.equity - minEq) / range) * H;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="flex flex-col gap-4">
      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Total Return" value={`${result.totalReturn >= 0 ? "+" : ""}${result.totalReturn.toFixed(2)} (${result.totalReturnPercent.toFixed(2)}%)`} color={pnlColor} />
        <Stat label="Win Rate" value={`${winRatePct}% (${result.winCount}/${result.tradeCount})`} color={parseFloat(winRatePct) >= 50 ? "#26a69a" : "#ef5350"} />
        <Stat label="Max Drawdown" value={maxDD} color="#ef5350" />
        <Stat label="Sharpe Ratio" value={result.sharpeRatio.toFixed(2)} color={result.sharpeRatio > 1 ? "#26a69a" : result.sharpeRatio > 0 ? "#f59e0b" : "#ef5350"} />
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Total Trades" value={String(result.tradeCount)} />
        <Stat label="Avg Win" value={`+${result.avgWin.toFixed(2)}`} color="#26a69a" />
        <Stat label="Avg Loss" value={result.avgLoss.toFixed(2)} color="#ef5350" />
        <Stat label="Profit Factor" value={result.avgLoss !== 0 ? (result.avgWin / Math.abs(result.avgLoss)).toFixed(2) : "∞"} />
      </div>

      {/* Equity curve */}
      {curve.length > 1 && (
        <div className="rounded-xl p-3 border" style={{ background: "#131722", borderColor: "#2a2e39" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <BarChart2 size={13} color="#5d6673" />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#5d6673" }}>Equity Curve</span>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
            <defs>
              <linearGradient id="eq-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={pnlColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={pnlColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <polyline
              points={points}
              fill="none"
              stroke={pnlColor}
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
            <polygon
              points={`0,${H} ${points} ${W},${H}`}
              fill="url(#eq-grad)"
            />
          </svg>
        </div>
      )}

      {/* Trade list */}
      {result.trades.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#5d6673" }}>
            Recent Trades
          </h4>
          <div className="flex flex-col gap-1">
            {result.trades.slice(-10).reverse().map((t, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs"
                style={{ background: "#131722" }}
              >
                <div
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded"
                  style={{
                    background: t.action === "BUY" ? "rgba(38,166,154,0.12)" : "rgba(239,83,80,0.12)",
                    color: t.action === "BUY" ? "#26a69a" : "#ef5350",
                  }}
                >
                  {t.action === "BUY" ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {t.action}
                </div>
                <span style={{ color: "#5d6673" }}>{t.date.slice(0, 10)}</span>
                <span style={{ color: "#b2b5be" }}>@ {t.price.toFixed(2)}</span>
                <span className="ml-auto" style={{ color: t.pnl >= 0 ? "#26a69a" : "#ef5350" }}>
                  {t.pnl >= 0 ? "+" : ""}{t.pnl.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
