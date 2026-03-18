"use client";
import { useEffect, useState, useMemo } from "react";
import { PieChart, TrendingUp, TrendingDown, DollarSign, BarChart2, X, Loader2 } from "lucide-react";
import { SideNav } from "@/components/layout/SideNav";
import { useTradingStore } from "@/store/trading.store";
import { api, endpoints } from "@/lib/api";
import { formatPrice, formatPnL } from "@/lib/utils";
import type { Position, Wallet } from "@/types";

// ─── Time filter helpers ─────────────────────────────────────────────────────
type TimeFilter = "1W" | "1M" | "3M" | "ALL";

function filterByTime(positions: Position[], filter: TimeFilter): Position[] {
  if (filter === "ALL") return positions;
  const now = Date.now();
  const ms: Record<TimeFilter, number> = {
    "1W": 7 * 24 * 60 * 60 * 1000,
    "1M": 30 * 24 * 60 * 60 * 1000,
    "3M": 90 * 24 * 60 * 60 * 1000,
    ALL: 0,
  };
  const cutoff = now - ms[filter];
  return positions.filter((p) => p.closedAt && new Date(p.closedAt).getTime() >= cutoff);
}

// ─── Plan badge ──────────────────────────────────────────────────────────────
function PlanBadge({ plan }: { plan?: string }) {
  const tier = (plan ?? "none").toLowerCase();
  const colors: Record<string, { bg: string; text: string }> = {
    platinum: { bg: "rgba(168,85,247,0.15)", text: "#a855f7" },
    gold:     { bg: "rgba(234,179,8,0.15)",  text: "#eab308" },
    silver:   { bg: "rgba(148,163,184,0.15)", text: "#94a3b8" },
    default:  { bg: "rgba(41,98,255,0.12)",   text: "#2962ff" },
    none:     { bg: "rgba(93,102,115,0.15)",   text: "#5d6673" },
  };
  const c = colors[tier] ?? colors.none;
  return (
    <span
      className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded"
      style={{ background: c.bg, color: c.text }}
    >
      {tier === "none" ? "Free" : tier}
    </span>
  );
}

// ─── Overview stat card ──────────────────────────────────────────────────────
function StatCard({
  label, value, sub, positive,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{ background: "#1e222d", border: "1px solid #363a45" }}
    >
      <span className="text-xs" style={{ color: "#5d6673" }}>{label}</span>
      <span
        className="text-xl font-semibold"
        style={{ color: positive === undefined ? "#d1d4dc" : positive ? "#26a69a" : "#ef5350" }}
      >
        {value}
      </span>
      {sub && <span className="text-[11px]" style={{ color: "#5d6673" }}>{sub}</span>}
    </div>
  );
}

// ─── Equity curve chart ──────────────────────────────────────────────────────
function EquityChart({
  closedPositions,
  timeFilter,
  onFilterChange,
}: {
  closedPositions: Position[];
  timeFilter: TimeFilter;
  onFilterChange: (f: TimeFilter) => void;
}) {
  const filtered = filterByTime(closedPositions, timeFilter);

  // Build cumulative PnL series sorted by closedAt
  const sorted = [...filtered].sort(
    (a, b) => new Date(a.closedAt!).getTime() - new Date(b.closedAt!).getTime()
  );

  const points = useMemo(() => {
    const pts: { x: number; y: number; label: string; value: number }[] = [];
    let cumulative = 0;
    pts.push({ x: 0, y: 0, label: "", value: 0 });
    sorted.forEach((p) => {
      cumulative += p.realizedPnL;
      pts.push({
        x: new Date(p.closedAt!).getTime(),
        y: cumulative,
        label: new Date(p.closedAt!).toLocaleDateString(),
        value: cumulative,
      });
    });
    return pts;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered.length, timeFilter]);

  const W = 800;
  const H = 160;
  const PAD = { top: 12, right: 16, bottom: 24, left: 52 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const isEmpty = sorted.length === 0;

  const minY = isEmpty ? -10 : Math.min(0, ...points.map((p) => p.y));
  const maxY = isEmpty ? 10 : Math.max(0, ...points.map((p) => p.y));
  const rangeY = maxY - minY || 1;

  const scaleX = (i: number) =>
    PAD.left + (points.length <= 1 ? 0 : (i / (points.length - 1)) * chartW);
  const scaleY = (v: number) =>
    PAD.top + chartH - ((v - minY) / rangeY) * chartH;

  const polylinePoints = points
    .map((p, i) => `${scaleX(i)},${scaleY(p.y)}`)
    .join(" ");

  const areaPath =
    points.length > 1
      ? `M ${scaleX(0)},${scaleY(0)} ` +
        points.map((p, i) => `L ${scaleX(i)},${scaleY(p.y)}`).join(" ") +
        ` L ${scaleX(points.length - 1)},${scaleY(0)} Z`
      : "";

  const zeroY = scaleY(0);
  const endValue = points[points.length - 1]?.value ?? 0;
  const lineColor = endValue >= 0 ? "#26a69a" : "#ef5350";

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "#1e222d", border: "1px solid #363a45" }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold" style={{ color: "#d1d4dc" }}>
          Equity Curve
        </span>
        <div className="flex gap-1">
          {(["1W", "1M", "3M", "ALL"] as TimeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className="text-[11px] px-2 py-0.5 rounded transition-colors"
              style={
                timeFilter === f
                  ? { background: "#2962ff", color: "#fff" }
                  : { background: "#131722", color: "#5d6673" }
              }
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {isEmpty ? (
        <div
          className="flex items-center justify-center rounded-lg"
          style={{ height: H, background: "#131722", color: "#5d6673", fontSize: 13 }}
        >
          Trade to build your equity history
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          preserveAspectRatio="none"
          className="overflow-visible"
        >
          {/* Zero line */}
          <line
            x1={PAD.left}
            y1={zeroY}
            x2={W - PAD.right}
            y2={zeroY}
            stroke="#363a45"
            strokeWidth={1}
            strokeDasharray="4 3"
          />

          {/* Area fill */}
          {areaPath && (
            <path
              d={areaPath}
              fill={lineColor}
              fillOpacity={0.12}
            />
          )}

          {/* Line */}
          {points.length > 1 && (
            <polyline
              points={polylinePoints}
              fill="none"
              stroke={lineColor}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Y-axis labels */}
          {[minY, (minY + maxY) / 2, maxY].map((v, i) => (
            <text
              key={i}
              x={PAD.left - 6}
              y={scaleY(v) + 4}
              textAnchor="end"
              fontSize={10}
              fill="#5d6673"
            >
              {v >= 0 ? `+$${formatPrice(v)}` : `-$${formatPrice(Math.abs(v))}`}
            </text>
          ))}
        </svg>
      )}
    </div>
  );
}

// ─── Asset allocation donut ───────────────────────────────────────────────────
function AssetAllocation({ openPositions }: { openPositions: Position[] }) {
  const grouped = useMemo(() => {
    const map: Record<string, number> = {};
    openPositions.forEach((p) => {
      // derive category from symbol heuristic (matches backend asset category)
      let cat = "OTHER";
      const sym = p.symbol.toUpperCase();
      if (sym.includes("BTC") || sym.includes("ETH") || sym.includes("XRP") || sym.includes("SOL") || sym.includes("ADA") || sym.includes("DOT") || sym.includes("BNB") || sym.includes("LTC") || sym.includes("LINK") || sym.includes("AVAX")) cat = "CRYPTO";
      else if (sym.length === 6 && (sym.endsWith("USD") || sym.endsWith("EUR") || sym.endsWith("GBP") || sym.endsWith("JPY") || sym.endsWith("CHF") || sym.endsWith("CAD") || sym.endsWith("AUD") || sym.endsWith("NZD"))) cat = "FOREX";
      else if (sym.includes("AAPL") || sym.includes("TSLA") || sym.includes("AMZN") || sym.includes("GOOG") || sym.includes("MSFT") || sym.includes("NVDA") || sym.includes("META")) cat = "STOCKS";
      const value = Math.abs(p.margin);
      map[cat] = (map[cat] ?? 0) + value;
    });
    const total = Object.values(map).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(map).map(([cat, val]) => ({ cat, val, pct: (val / total) * 100 }));
  }, [openPositions]);

  const catColors: Record<string, string> = {
    CRYPTO: "#2962ff",
    FOREX:  "#26a69a",
    STOCKS: "#f59e0b",
    OTHER:  "#7c3aed",
  };

  const R = 40;
  const C = 60;
  const circumference = 2 * Math.PI * R;

  // Build strokes from grouped data
  const strokes: { color: string; offset: number; dash: number }[] = [];
  let accumulated = 0;
  grouped.forEach(({ cat, pct }) => {
    strokes.push({
      color: catColors[cat] ?? "#5d6673",
      offset: circumference * (1 - accumulated / 100),
      dash: (pct / 100) * circumference,
    });
    accumulated += pct;
  });

  if (openPositions.length === 0) {
    return (
      <div
        className="rounded-xl p-4 flex flex-col"
        style={{ background: "#1e222d", border: "1px solid #363a45" }}
      >
        <span className="text-sm font-semibold mb-3" style={{ color: "#d1d4dc" }}>
          Asset Allocation
        </span>
        <div
          className="flex items-center justify-center rounded-lg flex-1 py-8"
          style={{ background: "#131722", color: "#5d6673", fontSize: 13 }}
        >
          No open positions
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-4 flex flex-col"
      style={{ background: "#1e222d", border: "1px solid #363a45" }}
    >
      <span className="text-sm font-semibold mb-3" style={{ color: "#d1d4dc" }}>
        Asset Allocation
      </span>
      <div className="flex items-center gap-6">
        {/* Donut SVG */}
        <svg width={C * 2} height={C * 2} viewBox={`0 0 ${C * 2} ${C * 2}`}>
          {/* Background circle */}
          <circle
            cx={C}
            cy={C}
            r={R}
            fill="none"
            stroke="#363a45"
            strokeWidth={14}
          />
          {strokes.map((s, i) => (
            <circle
              key={i}
              cx={C}
              cy={C}
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={14}
              strokeDasharray={`${s.dash} ${circumference - s.dash}`}
              strokeDashoffset={s.offset}
              transform={`rotate(-90 ${C} ${C})`}
            />
          ))}
        </svg>

        {/* Legend */}
        <div className="flex flex-col gap-2 flex-1">
          {grouped.map(({ cat, val, pct }) => (
            <div key={cat} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: catColors[cat] ?? "#5d6673" }}
                />
                <span className="text-xs" style={{ color: "#d1d4dc" }}>{cat}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs" style={{ color: "#5d6673" }}>{pct.toFixed(1)}%</span>
                <span className="text-xs font-medium" style={{ color: "#d1d4dc" }}>
                  ${formatPrice(val)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Performance metrics ─────────────────────────────────────────────────────
function PerformanceMetrics({ closedPositions }: { closedPositions: Position[] }) {
  const metrics = useMemo(() => {
    if (closedPositions.length === 0) return null;
    const wins = closedPositions.filter((p) => p.realizedPnL > 0);
    const losses = closedPositions.filter((p) => p.realizedPnL <= 0);
    const winRate = (wins.length / closedPositions.length) * 100;
    const bestTrade = Math.max(...closedPositions.map((p) => p.realizedPnL));
    const worstTrade = Math.min(...closedPositions.map((p) => p.realizedPnL));
    const avgWin = wins.length > 0 ? wins.reduce((a, p) => a + p.realizedPnL, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((a, p) => a + p.realizedPnL, 0) / losses.length : 0;
    return { winRate, bestTrade, worstTrade, avgWin, avgLoss, total: closedPositions.length };
  }, [closedPositions]);

  const rows: { label: string; value: string; color?: string }[] = metrics
    ? [
        { label: "Win Rate", value: `${metrics.winRate.toFixed(1)}%`, color: metrics.winRate >= 50 ? "#26a69a" : "#ef5350" },
        { label: "Total Trades", value: String(metrics.total) },
        { label: "Best Trade", value: `+$${formatPrice(metrics.bestTrade)}`, color: "#26a69a" },
        { label: "Worst Trade", value: `-$${formatPrice(Math.abs(metrics.worstTrade))}`, color: "#ef5350" },
        { label: "Avg Win", value: `+$${formatPrice(metrics.avgWin)}`, color: "#26a69a" },
        { label: "Avg Loss", value: `-$${formatPrice(Math.abs(metrics.avgLoss))}`, color: "#ef5350" },
      ]
    : [
        { label: "Win Rate", value: "—" },
        { label: "Total Trades", value: "—" },
        { label: "Best Trade", value: "—" },
        { label: "Worst Trade", value: "—" },
        { label: "Avg Win", value: "—" },
        { label: "Avg Loss", value: "—" },
      ];

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "#1e222d", border: "1px solid #363a45" }}
    >
      <span className="text-sm font-semibold mb-3 block" style={{ color: "#d1d4dc" }}>
        Performance Metrics
      </span>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {rows.map(({ label, value, color }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "#5d6673" }}>{label}</span>
            <span className="text-xs font-semibold" style={{ color: color ?? "#d1d4dc" }}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Open position card ───────────────────────────────────────────────────────
function PositionCard({
  position,
  livePrice,
  onClose,
}: {
  position: Position;
  livePrice?: number;
  onClose: (id: string) => void;
}) {
  const currentPrice = livePrice ?? position.currentPrice;
  const pnl = position.side === "BUY"
    ? (currentPrice - position.entryPrice) * position.quantity * position.leverage
    : (position.entryPrice - currentPrice) * position.quantity * position.leverage;
  const isProfit = pnl >= 0;

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "#1e222d", border: "1px solid #363a45" }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: "#d1d4dc" }}>
            {position.symbol}
          </span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={
              position.side === "BUY"
                ? { background: "rgba(38,166,154,0.15)", color: "#26a69a" }
                : { background: "rgba(239,83,80,0.15)", color: "#ef5350" }
            }
          >
            {position.side}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#131722", color: "#5d6673" }}>
            {position.leverage}x
          </span>
        </div>
        <button
          onClick={() => onClose(position.id)}
          className="p-1 rounded transition-colors hover:bg-[#ef5350]/10"
          style={{ color: "#5d6673" }}
          title="Close position"
        >
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <div>
          <span className="text-[11px]" style={{ color: "#5d6673" }}>Entry</span>
          <div className="text-xs font-medium" style={{ color: "#d1d4dc" }}>
            ${formatPrice(position.entryPrice)}
          </div>
        </div>
        <div>
          <span className="text-[11px]" style={{ color: "#5d6673" }}>Current</span>
          <div className="text-xs font-medium" style={{ color: "#d1d4dc" }}>
            ${formatPrice(currentPrice)}
          </div>
        </div>
        <div>
          <span className="text-[11px]" style={{ color: "#5d6673" }}>Margin</span>
          <div className="text-xs font-medium" style={{ color: "#d1d4dc" }}>
            ${formatPrice(position.margin)}
          </div>
        </div>
        <div>
          <span className="text-[11px]" style={{ color: "#5d6673" }}>Unrealized P&L</span>
          <div className="text-xs font-semibold" style={{ color: isProfit ? "#26a69a" : "#ef5350" }}>
            {formatPnL(pnl)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const { user, positions, wallet, setPositions, setWallet, removePosition, prices, addToast } = useTradingStore();

  const [closedPositions, setClosedPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("ALL");
  const [closingId, setClosingId] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [posRes, closedRes, walletRes] = await Promise.all([
          api.get(endpoints.positions),
          api.get(endpoints.closedPositions),
          api.get(endpoints.wallet),
        ]);
        setPositions(posRes.data ?? []);
        setClosedPositions(closedRes.data ?? []);
        setWallet(walletRes.data);
      } catch (err) {
        console.error("Portfolio load error", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [setPositions, setWallet]);

  const openPositions = positions.filter((p) => p.isOpen);

  // Unrealized PnL from live prices
  const unrealizedPnL = useMemo(() => {
    return openPositions.reduce((sum, p) => {
      const live = prices[p.symbol]?.price ?? p.currentPrice;
      const pnl = p.side === "BUY"
        ? (live - p.entryPrice) * p.quantity * p.leverage
        : (p.entryPrice - live) * p.quantity * p.leverage;
      return sum + pnl;
    }, 0);
  }, [openPositions, prices]);

  // Realized PnL all time
  const realizedPnLTotal = useMemo(
    () => closedPositions.reduce((sum, p) => sum + p.realizedPnL, 0),
    [closedPositions]
  );

  const handleClosePosition = async (id: string) => {
    setClosingId(id);
    try {
      await api.post(endpoints.closePosition(id));
      removePosition(id);
      addToast({ message: "Position closed", type: "success" });
      // refresh closed positions
      const res = await api.get(endpoints.closedPositions);
      setClosedPositions(res.data ?? []);
    } catch {
      addToast({ message: "Failed to close position", type: "error" });
    } finally {
      setClosingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "#131722" }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} color="#2962ff" className="animate-spin" />
          <span className="text-sm" style={{ color: "#5d6673" }}>Loading portfolio…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#131722" }}>
      <SideNav />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Page header */}
        <div
          className="flex items-center gap-3 px-5 py-3 border-b shrink-0"
          style={{ background: "#1e222d", borderColor: "#363a45" }}
        >
          <div className="p-1.5 rounded-lg" style={{ background: "rgba(41,98,255,0.15)" }}>
            <PieChart size={16} color="#2962ff" />
          </div>
          <span className="font-semibold text-sm" style={{ color: "#d1d4dc" }}>Portfolio</span>
          <PlanBadge plan={user?.plan} />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Overview stats */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Total Portfolio Value"
              value={`$${formatPrice(wallet?.equity ?? 0)}`}
              sub="Balance + unrealized P&L"
            />
            <StatCard
              label="Available Balance"
              value={`$${formatPrice(wallet?.balance ?? 0)}`}
              sub="Free to trade"
            />
            <StatCard
              label="Unrealized P&L"
              value={formatPnL(unrealizedPnL)}
              positive={unrealizedPnL >= 0}
              sub={`${openPositions.length} open position${openPositions.length !== 1 ? "s" : ""}`}
            />
            <StatCard
              label="Realized P&L (All Time)"
              value={formatPnL(realizedPnLTotal)}
              positive={realizedPnLTotal >= 0}
              sub={`${closedPositions.length} closed trade${closedPositions.length !== 1 ? "s" : ""}`}
            />
          </div>

          {/* Equity chart */}
          <EquityChart
            closedPositions={closedPositions}
            timeFilter={timeFilter}
            onFilterChange={setTimeFilter}
          />

          {/* Allocation + Performance side-by-side */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <AssetAllocation openPositions={openPositions} />
            <PerformanceMetrics closedPositions={closedPositions} />
          </div>

          {/* Open positions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 size={14} color="#5d6673" />
              <span className="text-sm font-semibold" style={{ color: "#d1d4dc" }}>Open Positions</span>
              {openPositions.length > 0 && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(41,98,255,0.12)", color: "#2962ff" }}
                >
                  {openPositions.length}
                </span>
              )}
            </div>

            {openPositions.length === 0 ? (
              <div
                className="rounded-xl flex items-center justify-center py-10"
                style={{ background: "#1e222d", border: "1px solid #363a45", color: "#5d6673", fontSize: 13 }}
              >
                No open positions
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {openPositions.map((p) => (
                  <div key={p.id} style={{ opacity: closingId === p.id ? 0.5 : 1, pointerEvents: closingId === p.id ? "none" : "auto" }}>
                    <PositionCard
                      position={p}
                      livePrice={prices[p.symbol]?.price}
                      onClose={handleClosePosition}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer spacing */}
          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}
