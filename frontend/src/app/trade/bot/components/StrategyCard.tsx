"use client";
import { useState } from "react";
import { Play, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from "lucide-react";
import BacktestResults from "./BacktestResults";
import type { BotStrategy } from "@/types/bot";

interface Props {
  strategy: BotStrategy;
  onToggle: (id: string, isActive: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onBacktest: (id: string) => Promise<void>;
  backtesting: boolean;
}

const CLASS_COLOR: Record<string, string> = {
  CRYPTO: "#f59e0b",
  FOREX: "#2962ff",
  STOCK: "#26a69a",
  COMMODITY: "#ef5350",
};

export default function StrategyCard({ strategy, onToggle, onDelete, onBacktest, backtesting }: Props) {
  const [expanded, setExpanded] = useState(false);
  const color = CLASS_COLOR[strategy.assetClass] ?? "#5d6673";

  return (
    <div className="rounded-xl border" style={{ background: "#1e222d", borderColor: strategy.isActive ? `${color}40` : "#2a2e39" }}>
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate" style={{ color: "#d1d4dc" }}>{strategy.name}</span>
            <span
              className="text-xs px-1.5 py-0.5 rounded shrink-0"
              style={{ background: `${color}15`, color }}
            >
              {strategy.assetClass}
            </span>
            {strategy.isActive && (
              <span className="text-xs px-1.5 py-0.5 rounded shrink-0" style={{ background: "rgba(38,166,154,0.12)", color: "#26a69a" }}>
                Active
              </span>
            )}
          </div>
          <div className="text-xs mt-0.5" style={{ color: "#5d6673" }}>
            Created {strategy.createdAt.slice(0, 10)}
            {strategy.backtestResults && (
              <span className="ml-2" style={{ color: strategy.backtestResults.totalReturn >= 0 ? "#26a69a" : "#ef5350" }}>
                · Backtest: {strategy.backtestResults.totalReturn >= 0 ? "+" : ""}{strategy.backtestResults.totalReturn.toFixed(2)} ({strategy.backtestResults.winRate * 100|0}% WR)
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => onToggle(strategy.id, !strategy.isActive)}
          className="p-1 transition-opacity hover:opacity-70"
          title={strategy.isActive ? "Deactivate" : "Activate"}
        >
          {strategy.isActive
            ? <ToggleRight size={20} color="#26a69a" />
            : <ToggleLeft size={20} color="#5d6673" />}
        </button>

        <button
          onClick={() => onBacktest(strategy.id)}
          disabled={backtesting}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border transition-opacity hover:opacity-70 disabled:opacity-50"
          style={{ borderColor: "#363a45", color: "#b2b5be" }}
        >
          <Play size={11} />
          {backtesting ? "Running…" : "Backtest"}
        </button>

        <button
          onClick={() => onDelete(strategy.id)}
          className="p-1 transition-opacity hover:opacity-70"
        >
          <Trash2 size={14} color="#5d6673" />
        </button>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="p-1 transition-opacity hover:opacity-70"
        >
          {expanded ? <ChevronUp size={16} color="#5d6673" /> : <ChevronDown size={16} color="#5d6673" />}
        </button>
      </div>

      {/* Expanded — risk params + backtest */}
      {expanded && (
        <div className="px-3 pb-3 flex flex-col gap-3">
          {/* Risk params */}
          <div className="flex gap-3 text-xs">
            {strategy.riskParams.stopLossPercent != null && (
              <span style={{ color: "#b2b5be" }}>SL <span style={{ color: "#ef5350" }}>{strategy.riskParams.stopLossPercent}%</span></span>
            )}
            {strategy.riskParams.takeProfitPercent != null && (
              <span style={{ color: "#b2b5be" }}>TP <span style={{ color: "#26a69a" }}>{strategy.riskParams.takeProfitPercent}%</span></span>
            )}
            {strategy.riskParams.maxPositionSize != null && (
              <span style={{ color: "#b2b5be" }}>Max size <span style={{ color: "#d1d4dc" }}>{strategy.riskParams.maxPositionSize}</span></span>
            )}
          </div>

          {strategy.backtestResults && (
            <BacktestResults result={strategy.backtestResults} />
          )}
        </div>
      )}
    </div>
  );
}
