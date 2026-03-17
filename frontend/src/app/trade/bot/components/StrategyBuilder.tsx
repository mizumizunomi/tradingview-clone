"use client";
import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import StrategyCard from "./StrategyCard";
import type { BotStrategy, AssetClass } from "@/types/bot";

interface Props {
  strategies: BotStrategy[];
  onCreateStrategy: (data: {
    name: string;
    assetClass: AssetClass;
    riskParams: { stopLossPercent: number; takeProfitPercent: number; maxPositionSize: number };
  }) => Promise<void>;
  onToggleStrategy: (id: string, isActive: boolean) => Promise<void>;
  onDeleteStrategy: (id: string) => Promise<void>;
  onBacktestStrategy: (id: string) => Promise<void>;
}

const ASSET_CLASSES: AssetClass[] = ["CRYPTO", "FOREX", "STOCK", "COMMODITY"];

export default function StrategyBuilder({
  strategies,
  onCreateStrategy,
  onToggleStrategy,
  onDeleteStrategy,
  onBacktestStrategy,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [backtestingId, setBacktestingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [assetClass, setAssetClass] = useState<AssetClass>("CRYPTO");
  const [slPct, setSlPct] = useState("2");
  const [tpPct, setTpPct] = useState("4");
  const [maxSize, setMaxSize] = useState("1000");

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onCreateStrategy({
      name: name.trim(),
      assetClass,
      riskParams: {
        stopLossPercent: parseFloat(slPct) || 2,
        takeProfitPercent: parseFloat(tpPct) || 4,
        maxPositionSize: parseFloat(maxSize) || 1000,
      },
    });
    setSaving(false);
    setCreating(false);
    setName("");
  };

  const handleBacktest = async (id: string) => {
    setBacktestingId(id);
    await onBacktestStrategy(id);
    setBacktestingId(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center p-3 border-b shrink-0" style={{ borderColor: "#363a45" }}>
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#5d6673" }}>
          Strategies ({strategies.length})
        </span>
        <button
          onClick={() => setCreating((v) => !v)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
          style={{ background: "#2962ff", color: "#fff" }}
        >
          <Plus size={12} />
          New Strategy
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="p-3 border-b" style={{ borderColor: "#363a45", background: "#1e222d" }}>
          <div className="flex flex-col gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Strategy name…"
              className="px-3 py-1.5 rounded-lg text-xs outline-none border"
              style={{ background: "#131722", borderColor: "#363a45", color: "#d1d4dc" }}
            />
            <div className="flex gap-2">
              {ASSET_CLASSES.map((ac) => (
                <button
                  key={ac}
                  onClick={() => setAssetClass(ac)}
                  className="flex-1 py-1 rounded text-xs transition-all"
                  style={{
                    background: assetClass === ac ? "#2962ff" : "#2a2e39",
                    color: assetClass === ac ? "#fff" : "#5d6673",
                  }}
                >
                  {ac}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "SL %", value: slPct, set: setSlPct },
                { label: "TP %", value: tpPct, set: setTpPct },
                { label: "Max size", value: maxSize, set: setMaxSize },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <div className="text-xs mb-1" style={{ color: "#5d6673" }}>{label}</div>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    className="w-full px-2 py-1 rounded text-xs outline-none border"
                    style={{ background: "#131722", borderColor: "#363a45", color: "#d1d4dc" }}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setCreating(false)}
                className="px-3 py-1.5 rounded-lg text-xs border"
                style={{ borderColor: "#363a45", color: "#5d6673" }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !name.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                style={{ background: "#26a69a", color: "#fff" }}
              >
                {saving ? <Loader2 size={11} className="animate-spin" /> : null}
                {saving ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Strategy list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {strategies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="p-3 rounded-xl" style={{ background: "#2a2e39" }}>
              <Plus size={22} color="#5d6673" />
            </div>
            <span className="text-sm" style={{ color: "#5d6673" }}>No strategies yet — create your first</span>
          </div>
        ) : (
          strategies.map((s) => (
            <StrategyCard
              key={s.id}
              strategy={s}
              onToggle={onToggleStrategy}
              onDelete={onDeleteStrategy}
              onBacktest={handleBacktest}
              backtesting={backtestingId === s.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
