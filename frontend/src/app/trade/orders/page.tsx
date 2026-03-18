"use client";
import { useEffect, useState, useMemo } from "react";
import {
  ClipboardList, TrendingUp, TrendingDown, Loader2,
  ChevronUp, ChevronDown, Download, RefreshCw, X,
} from "lucide-react";
import { SideNav } from "@/components/layout/SideNav";
import { useTradingStore } from "@/store/trading.store";
import { api, endpoints } from "@/lib/api";
import { formatPrice, formatPnL } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Position } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "open" | "history";
type SortKey = "openedAt" | "closedAt" | "symbol" | "realizedPnL" | "unrealizedPnL";
type SortDir = "asc" | "desc";
type StatusFilter = "ALL" | "OPEN" | "CLOSED";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDuration(openedAt: string, closedAt?: string) {
  const ms = new Date(closedAt ?? Date.now()).getTime() - new Date(openedAt).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

function exportToCsv(rows: Position[], filename: string) {
  const headers = ["Symbol", "Side", "Qty", "Entry", "Exit", "P&L", "P&L%", "Fee", "Duration", "Status", "Opened", "Closed"];
  const lines = rows.map((p) => {
    const pnlPct = p.entryPrice > 0 ? ((p.realizedPnL / (p.entryPrice * p.quantity)) * 100).toFixed(2) : "—";
    return [
      p.symbol, p.side, p.quantity, p.entryPrice.toFixed(5),
      p.currentPrice.toFixed(5), p.realizedPnL.toFixed(2), pnlPct,
      p.commission.toFixed(2), fmtDuration(p.openedAt, p.closedAt),
      p.isOpen ? "OPEN" : "CLOSED", p.openedAt, p.closedAt ?? "",
    ].join(",");
  });
  const csv = [headers.join(","), ...lines].join("\n");
  const a = document.createElement("a");
  a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  a.download = filename;
  a.click();
}

// ─── Sortable column header ───────────────────────────────────────────────────
function Th({
  label, sortKey, currentSort, currentDir, onSort,
}: {
  label: string;
  sortKey?: SortKey;
  currentSort: SortKey;
  currentDir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  if (!sortKey) return (
    <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#5d6673" }}>
      {label}
    </th>
  );
  const active = currentSort === sortKey;
  return (
    <th
      className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none group"
      style={{ color: active ? "#d1d4dc" : "#5d6673" }}
      onClick={() => onSort(sortKey)}
    >
      <span className="flex items-center gap-1">
        {label}
        <span className="opacity-60 group-hover:opacity-100">
          {active && currentDir === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </span>
      </span>
    </th>
  );
}

// ─── PnL badge ────────────────────────────────────────────────────────────────
function PnLCell({ value }: { value: number }) {
  const pos = value >= 0;
  return (
    <span
      className="font-mono font-semibold text-xs"
      style={{ color: pos ? "#26a69a" : "#ef5350" }}
    >
      {formatPnL(value)}
    </span>
  );
}

// ─── Summary row ─────────────────────────────────────────────────────────────
function SummaryBar({ positions }: { positions: Position[] }) {
  const wins = positions.filter((p) => p.realizedPnL > 0).length;
  const total = positions.length;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : "—";
  const totalPnL = positions.reduce((s, p) => s + p.realizedPnL, 0);
  const totalFees = positions.reduce((s, p) => s + p.commission, 0);

  return (
    <div
      className="flex flex-wrap gap-4 px-4 py-3 rounded-xl mb-4"
      style={{ background: "#1e222d", border: "1px solid #363a45" }}
    >
      {[
        { label: "Total Trades", value: String(total) },
        { label: "Win Rate", value: total > 0 ? `${winRate}%` : "—", color: parseFloat(winRate) >= 50 ? "#26a69a" : "#ef5350" },
        { label: "Total P&L", value: total > 0 ? formatPnL(totalPnL) : "—", color: totalPnL >= 0 ? "#26a69a" : "#ef5350" },
        { label: "Total Fees", value: total > 0 ? `$${formatPrice(totalFees)}` : "—" },
      ].map(({ label, value, color }) => (
        <div key={label} className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider" style={{ color: "#5d6673" }}>{label}</span>
          <span className="text-sm font-semibold" style={{ color: color ?? "#d1d4dc" }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Open positions table ─────────────────────────────────────────────────────
function OpenOrdersTable({
  positions, prices, onClose, closingId,
}: {
  positions: Position[];
  prices: Record<string, { price: number; bid: number; ask: number }>;
  onClose: (id: string) => void;
  closingId: string | null;
}) {
  const [sort, setSort] = useState<SortKey>("openedAt");
  const [dir, setDir] = useState<SortDir>("desc");

  const handleSort = (k: SortKey) => {
    if (sort === k) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSort(k); setDir("desc"); }
  };

  const sorted = useMemo(() => {
    return [...positions].sort((a, b) => {
      let va: number | string = 0, vb: number | string = 0;
      if (sort === "openedAt") { va = a.openedAt; vb = b.openedAt; }
      if (sort === "symbol") { va = a.symbol; vb = b.symbol; }
      if (sort === "unrealizedPnL") {
        const live = (pos: Position) => prices[pos.symbol]?.price ?? pos.currentPrice;
        const pnlA = a.side === "BUY" ? (live(a) - a.entryPrice) * a.quantity * a.leverage : (a.entryPrice - live(a)) * a.quantity * a.leverage;
        const pnlB = b.side === "BUY" ? (live(b) - b.entryPrice) * b.quantity * b.leverage : (b.entryPrice - live(b)) * b.quantity * b.leverage;
        return dir === "asc" ? pnlA - pnlB : pnlB - pnlA;
      }
      if (typeof va === "string" && typeof vb === "string") {
        const r = va.localeCompare(vb);
        return dir === "asc" ? r : -r;
      }
      return dir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
  }, [positions, sort, dir, prices]);

  if (positions.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 rounded-xl"
        style={{ background: "#1e222d", border: "1px solid #363a45" }}
      >
        <ClipboardList size={36} style={{ color: "#363a45" }} className="mb-3" />
        <p className="text-sm font-medium" style={{ color: "#5d6673" }}>No open positions</p>
        <p className="text-xs mt-1" style={{ color: "#363a45" }}>Place your first trade to get started</p>
      </div>
    );
  }

  const thProps = { currentSort: sort, currentDir: dir, onSort: handleSort };

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #363a45" }}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead style={{ background: "#131722" }}>
            <tr>
              <Th label="Asset" sortKey="symbol" {...thProps} />
              <Th label="Side" {...thProps} sortKey={undefined as any} />
              <Th label="Qty" {...thProps} sortKey={undefined as any} />
              <Th label="Entry" {...thProps} sortKey={undefined as any} />
              <Th label="Current" {...thProps} sortKey={undefined as any} />
              <Th label="Lev" {...thProps} sortKey={undefined as any} />
              <Th label="Unrealized P&L" sortKey="unrealizedPnL" {...thProps} />
              <Th label="Opened" sortKey="openedAt" {...thProps} />
              <Th label="" {...thProps} sortKey={undefined as any} />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#363a45]">
            {sorted.map((p) => {
              const live = prices[p.symbol]?.price ?? p.currentPrice;
              const pnl = p.side === "BUY"
                ? (live - p.entryPrice) * p.quantity * p.leverage
                : (p.entryPrice - live) * p.quantity * p.leverage;
              const isClosing = closingId === p.id;
              return (
                <tr
                  key={p.id}
                  style={{
                    background: isClosing ? "rgba(239,83,80,0.05)" : "#1e222d",
                    opacity: isClosing ? 0.6 : 1,
                    borderColor: "#363a45",
                  }}
                >
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-semibold" style={{ color: "#d1d4dc" }}>{p.symbol}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={p.side === "BUY"
                        ? { background: "rgba(38,166,154,0.15)", color: "#26a69a" }
                        : { background: "rgba(239,83,80,0.15)", color: "#ef5350" }
                      }
                    >
                      {p.side}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs font-mono" style={{ color: "#d1d4dc" }}>{p.quantity}</td>
                  <td className="px-3 py-2.5 text-xs font-mono" style={{ color: "#d1d4dc" }}>
                    ${p.entryPrice < 10 ? p.entryPrice.toFixed(5) : formatPrice(p.entryPrice)}
                  </td>
                  <td className="px-3 py-2.5 text-xs font-mono" style={{ color: "#d1d4dc" }}>
                    ${live < 10 ? live.toFixed(5) : formatPrice(live)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#131722", color: "#5d6673" }}>
                      {p.leverage}x
                    </span>
                  </td>
                  <td className="px-3 py-2.5"><PnLCell value={pnl} /></td>
                  <td className="px-3 py-2.5 text-[11px]" style={{ color: "#5d6673" }}>{fmtDate(p.openedAt)}</td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => onClose(p.id)}
                      disabled={isClosing}
                      className="p-1 rounded transition-colors hover:bg-[#ef5350]/10 disabled:opacity-40"
                      style={{ color: "#5d6673" }}
                      title="Close position"
                    >
                      <X size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── History table ────────────────────────────────────────────────────────────
const PAGE_SIZE = 25;

function HistoryTable({ positions }: { positions: Position[] }) {
  const [sort, setSort] = useState<SortKey>("closedAt");
  const [dir, setDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("");
  const [sideFilter, setSideFilter] = useState<"ALL" | "BUY" | "SELL">("ALL");
  const [pnlFilter, setPnlFilter] = useState<"ALL" | "WIN" | "LOSS">("ALL");

  const handleSort = (k: SortKey) => {
    if (sort === k) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSort(k); setDir("desc"); }
  };

  const filtered = useMemo(() => {
    return positions.filter((p) => {
      if (filter && !p.symbol.toLowerCase().includes(filter.toLowerCase())) return false;
      if (sideFilter !== "ALL" && p.side !== sideFilter) return false;
      if (pnlFilter === "WIN" && p.realizedPnL <= 0) return false;
      if (pnlFilter === "LOSS" && p.realizedPnL > 0) return false;
      return true;
    });
  }, [positions, filter, sideFilter, pnlFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va: string | number = 0, vb: string | number = 0;
      if (sort === "closedAt") { va = a.closedAt ?? ""; vb = b.closedAt ?? ""; }
      if (sort === "openedAt") { va = a.openedAt; vb = b.openedAt; }
      if (sort === "symbol") { va = a.symbol; vb = b.symbol; }
      if (sort === "realizedPnL") { va = a.realizedPnL; vb = b.realizedPnL; }
      if (typeof va === "string" && typeof vb === "string") {
        const r = va.localeCompare(vb);
        return dir === "asc" ? r : -r;
      }
      return dir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
  }, [filtered, sort, dir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const thProps = { currentSort: sort, currentDir: dir, onSort: handleSort };

  if (positions.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 rounded-xl"
        style={{ background: "#1e222d", border: "1px solid #363a45" }}
      >
        <ClipboardList size={36} style={{ color: "#363a45" }} className="mb-3" />
        <p className="text-sm font-medium" style={{ color: "#5d6673" }}>No trade history yet</p>
        <p className="text-xs mt-1" style={{ color: "#363a45" }}>Your completed trades will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SummaryBar positions={filtered} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Search symbol…"
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setPage(0); }}
          className="rounded border px-3 py-1.5 text-xs outline-none"
          style={{ background: "#1e222d", borderColor: "#363a45", color: "#d1d4dc", width: 160 }}
        />
        {(["ALL", "BUY", "SELL"] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setSideFilter(s); setPage(0); }}
            className="px-3 py-1 rounded text-[11px] font-semibold transition-colors"
            style={sideFilter === s
              ? { background: "#2962ff", color: "#fff" }
              : { background: "#1e222d", color: "#5d6673", border: "1px solid #363a45" }
            }
          >
            {s}
          </button>
        ))}
        {(["ALL", "WIN", "LOSS"] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setPnlFilter(s); setPage(0); }}
            className="px-3 py-1 rounded text-[11px] font-semibold transition-colors"
            style={pnlFilter === s
              ? { background: s === "WIN" ? "#26a69a" : s === "LOSS" ? "#ef5350" : "#2962ff", color: "#fff" }
              : { background: "#1e222d", color: "#5d6673", border: "1px solid #363a45" }
            }
          >
            {s}
          </button>
        ))}
        <button
          onClick={() => exportToCsv(sorted, "trade_history.csv")}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold transition-colors"
          style={{ background: "#1e222d", border: "1px solid #363a45", color: "#5d6673" }}
        >
          <Download size={11} /> Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #363a45" }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px]">
            <thead style={{ background: "#131722" }}>
              <tr>
                <Th label="Asset" sortKey="symbol" {...thProps} />
                <Th label="Side" {...thProps} sortKey={undefined as any} />
                <Th label="Qty" {...thProps} sortKey={undefined as any} />
                <Th label="Entry" {...thProps} sortKey={undefined as any} />
                <Th label="Exit" {...thProps} sortKey={undefined as any} />
                <Th label="P&L" sortKey="realizedPnL" {...thProps} />
                <Th label="Fee" {...thProps} sortKey={undefined as any} />
                <Th label="Duration" {...thProps} sortKey={undefined as any} />
                <Th label="Opened" sortKey="openedAt" {...thProps} />
                <Th label="Closed" sortKey="closedAt" {...thProps} />
              </tr>
            </thead>
            <tbody>
              {paged.map((p) => {
                const pnlPct = p.entryPrice > 0
                  ? ((p.realizedPnL / (p.entryPrice * p.quantity)) * 100).toFixed(2)
                  : "0.00";
                return (
                  <tr key={p.id} style={{ background: "#1e222d", borderTop: "1px solid #363a45" }}>
                    <td className="px-3 py-2.5">
                      <span className="text-xs font-semibold" style={{ color: "#d1d4dc" }}>{p.symbol}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={p.side === "BUY"
                          ? { background: "rgba(38,166,154,0.15)", color: "#26a69a" }
                          : { background: "rgba(239,83,80,0.15)", color: "#ef5350" }
                        }
                      >
                        {p.side}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-mono" style={{ color: "#d1d4dc" }}>{p.quantity}</td>
                    <td className="px-3 py-2.5 text-xs font-mono" style={{ color: "#d1d4dc" }}>
                      ${p.entryPrice < 10 ? p.entryPrice.toFixed(5) : formatPrice(p.entryPrice)}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-mono" style={{ color: "#d1d4dc" }}>
                      ${p.currentPrice < 10 ? p.currentPrice.toFixed(5) : formatPrice(p.currentPrice)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col">
                        <PnLCell value={p.realizedPnL} />
                        <span className="text-[10px]" style={{ color: "#5d6673" }}>
                          {parseFloat(pnlPct) >= 0 ? "+" : ""}{pnlPct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-mono" style={{ color: "#5d6673" }}>
                      ${formatPrice(p.commission)}
                    </td>
                    <td className="px-3 py-2.5 text-[11px]" style={{ color: "#5d6673" }}>
                      {fmtDuration(p.openedAt, p.closedAt)}
                    </td>
                    <td className="px-3 py-2.5 text-[11px]" style={{ color: "#5d6673" }}>{fmtDate(p.openedAt)}</td>
                    <td className="px-3 py-2.5 text-[11px]" style={{ color: "#5d6673" }}>
                      {p.closedAt ? fmtDate(p.closedAt) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs" style={{ color: "#5d6673" }}>
          <span>{filtered.length} trades</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-2 py-1 rounded disabled:opacity-30 hover:bg-[#1e222d] transition-colors"
              style={{ border: "1px solid #363a45" }}
            >
              ‹ Prev
            </button>
            <span>{page + 1} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-2 py-1 rounded disabled:opacity-30 hover:bg-[#1e222d] transition-colors"
              style={{ border: "1px solid #363a45" }}
            >
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const { positions, prices, setPositions, addToast } = useTradingStore();
  const [tab, setTab] = useState<Tab>("open");
  const [closedPositions, setClosedPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [openRes, closedRes] = await Promise.all([
        api.get(endpoints.positions),
        api.get(endpoints.closedPositions),
      ]);
      type PositionRaw = { asset: { symbol: string; name: string }; [key: string]: unknown };
      setPositions((openRes.data ?? []).map((p: PositionRaw) => ({ ...p, symbol: p.asset.symbol, assetName: p.asset.name })));
      setClosedPositions(closedRes.data ?? []);
    } catch {
      if (!silent) addToast({ message: "Failed to load orders", type: "error" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const openPositions = positions.filter((p) => p.isOpen);

  const handleClose = async (id: string) => {
    setClosingId(id);
    try {
      await api.post(endpoints.closePosition(id));
      addToast({ message: "Position closed", type: "success" });
      await loadData(true);
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
          <Loader2 size={28} color="#2962ff" className="animate-spin" />
          <span className="text-sm" style={{ color: "#5d6673" }}>Loading orders…</span>
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
          className="flex items-center justify-between px-5 py-3 border-b shrink-0"
          style={{ background: "#1e222d", borderColor: "#363a45" }}
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg" style={{ background: "rgba(41,98,255,0.15)" }}>
              <ClipboardList size={16} color="#2962ff" />
            </div>
            <span className="font-semibold text-sm" style={{ color: "#d1d4dc" }}>Orders</span>
            {/* Tab switcher */}
            <div className="flex rounded overflow-hidden ml-4" style={{ border: "1px solid #363a45" }}>
              {([["open", "Open Positions"], ["history", "Order History"]] as [Tab, string][]).map(([t, label]) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="px-4 py-1.5 text-[11px] font-semibold transition-colors"
                  style={tab === t
                    ? { background: "#2962ff", color: "#fff" }
                    : { background: "transparent", color: "#5d6673" }
                  }
                >
                  {label}
                  {t === "open" && openPositions.length > 0 && (
                    <span className="ml-1.5 rounded-full px-1.5 py-0.5 text-[9px]"
                      style={{ background: "rgba(255,255,255,0.2)" }}>
                      {openPositions.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] transition-colors disabled:opacity-50"
            style={{ background: "#1e222d", border: "1px solid #363a45", color: "#5d6673" }}
            title="Refresh"
          >
            <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {tab === "open" ? (
            <OpenOrdersTable
              positions={openPositions}
              prices={prices}
              onClose={handleClose}
              closingId={closingId}
            />
          ) : (
            <HistoryTable positions={closedPositions} />
          )}
          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}
