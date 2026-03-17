"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, Play, X, Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { TradingSignal } from "@/types/bot";
import { cn } from "@/lib/utils";

interface Props {
  signal: TradingSignal;
  onExecute?: (id: string) => Promise<void>;
  onCancel?: (id: string) => Promise<void>;
  compact?: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function countdown(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return "expired";
  const m = Math.floor(diff / 60000);
  if (m < 60) return `expires in ${m}m`;
  return `expires in ${Math.floor(m / 60)}h`;
}

const ACTION_STYLE: Record<string, { color: string; bg: string; Icon: typeof TrendingUp }> = {
  BUY:  { color: "#26a69a", bg: "rgba(38,166,154,0.12)",  Icon: TrendingUp },
  SELL: { color: "#ef5350", bg: "rgba(239,83,80,0.12)",   Icon: TrendingDown },
  HOLD: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  Icon: Minus },
};

const STATUS_COLOR: Record<string, string> = {
  PENDING:   "#2962ff",
  EXECUTED:  "#26a69a",
  EXPIRED:   "#5d6673",
  CANCELLED: "#5d6673",
};

export default function SignalCard({ signal, onExecute, onCancel, compact }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [executing, setExecuting] = useState(false);
  const style = ACTION_STYLE[signal.action] ?? ACTION_STYLE.HOLD;
  const isPending = signal.status === "PENDING";

  const fmt = (n?: number, d = 4) =>
    n != null ? n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }) : "—";

  const handleExecute = async () => {
    if (!onExecute) return;
    setExecuting(true);
    await onExecute(signal.id);
    setExecuting(false);
  };

  const rrRatio = signal.entryPrice && signal.stopLoss && signal.takeProfit
    ? Math.abs(signal.takeProfit - signal.entryPrice) / Math.abs(signal.stopLoss - signal.entryPrice)
    : null;

  return (
    <div
      className="rounded-xl border transition-all duration-150"
      style={{
        background: "#1e222d",
        borderColor: isPending ? `${style.color}40` : "#2a2e39",
        opacity: signal.status === "EXPIRED" || signal.status === "CANCELLED" ? 0.6 : 1,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        {/* Action badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide shrink-0"
          style={{ background: style.bg, color: style.color }}
        >
          <style.Icon size={12} />
          {signal.action}
        </div>

        {/* Asset + timeframe */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm" style={{ color: "#d1d4dc" }}>
              {signal.asset}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#2a2e39", color: "#5d6673" }}>
              {signal.timeframe}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ background: `${STATUS_COLOR[signal.status]}18`, color: STATUS_COLOR[signal.status] }}
            >
              {signal.status}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs" style={{ color: "#5d6673" }}>
              <Clock size={10} className="inline mr-0.5" />{timeAgo(signal.createdAt)}
            </span>
            {signal.expiresAt && isPending && (
              <span className="text-xs" style={{ color: "#5d6673" }}>{countdown(signal.expiresAt)}</span>
            )}
            <span className="text-xs" style={{ color: "#5d6673" }}>{signal.strategy}</span>
          </div>
        </div>

        {/* Confidence bar */}
        <div className="shrink-0 w-16 text-right">
          <div className="text-xs font-semibold mb-1" style={{ color: style.color }}>
            {(signal.confidence * 100).toFixed(0)}%
          </div>
          <div className="w-full h-1.5 rounded-full" style={{ background: "#2a2e39" }}>
            <div
              className="h-1.5 rounded-full transition-all"
              style={{ width: `${signal.confidence * 100}%`, background: style.color }}
            />
          </div>
        </div>

        {/* Expand toggle */}
        {!compact && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1 rounded transition-colors hover:opacity-70"
            style={{ color: "#5d6673" }}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {/* Price levels row */}
      {!compact && (signal.entryPrice || signal.stopLoss || signal.takeProfit) && (
        <div className="px-3 pb-2 flex items-center gap-4 text-xs">
          {signal.entryPrice && (
            <span style={{ color: "#b2b5be" }}>
              Entry <span style={{ color: "#d1d4dc" }}>{fmt(signal.entryPrice)}</span>
            </span>
          )}
          {signal.stopLoss && (
            <span style={{ color: "#b2b5be" }}>
              SL <span style={{ color: "#ef5350" }}>{fmt(signal.stopLoss)}</span>
            </span>
          )}
          {signal.takeProfit && (
            <span style={{ color: "#b2b5be" }}>
              TP <span style={{ color: "#26a69a" }}>{fmt(signal.takeProfit)}</span>
            </span>
          )}
          {rrRatio && (
            <span style={{ color: "#5d6673" }}>
              R/R <span style={{ color: "#b2b5be" }}>{rrRatio.toFixed(2)}x</span>
            </span>
          )}
        </div>
      )}

      {/* Expanded reasoning */}
      {expanded && (
        <div
          className="mx-3 mb-3 p-3 rounded-lg text-xs leading-relaxed"
          style={{ background: "#131722", color: "#b2b5be" }}
        >
          {signal.reasoning}

          {/* Indicators summary */}
          {signal.technicalData?.indicators?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {signal.technicalData.indicators.slice(0, 8).map((ind) => (
                <span
                  key={ind.name}
                  className="px-2 py-0.5 rounded text-xs"
                  style={{
                    background: ind.signal === "BULLISH" ? "rgba(38,166,154,0.12)"
                      : ind.signal === "BEARISH" ? "rgba(239,83,80,0.12)" : "#2a2e39",
                    color: ind.signal === "BULLISH" ? "#26a69a"
                      : ind.signal === "BEARISH" ? "#ef5350" : "#5d6673",
                  }}
                >
                  {ind.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      {!compact && isPending && !signal.autoExecuted && (onExecute || onCancel) && (
        <div className="flex gap-2 px-3 pb-3">
          {onExecute && signal.action !== "HOLD" && (
            <button
              onClick={handleExecute}
              disabled={executing}
              className={cn(
                "flex items-center gap-1.5 flex-1 justify-center py-1.5 rounded-lg text-xs font-medium transition-opacity",
                executing && "opacity-50"
              )}
              style={{ background: style.color, color: "#fff" }}
            >
              <Play size={12} />
              {executing ? "Executing…" : "Execute"}
            </button>
          )}
          {onCancel && (
            <button
              onClick={() => onCancel(signal.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-opacity hover:opacity-70"
              style={{ borderColor: "#363a45", color: "#5d6673" }}
            >
              <X size={12} />
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}
