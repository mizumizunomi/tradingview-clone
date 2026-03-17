"use client";
import { useState } from "react";
import { Save, Loader2 } from "lucide-react";
import type { BotSettings as BotSettingsType, RiskLevel, AssetClass } from "@/types/bot";

interface Props {
  settings: BotSettingsType;
  onSave: (updates: Partial<BotSettingsType>) => Promise<void>;
}

const RISK_LEVELS: RiskLevel[] = ["CONSERVATIVE", "MODERATE", "AGGRESSIVE"];
const ASSET_CLASSES: AssetClass[] = ["CRYPTO", "FOREX", "STOCK", "COMMODITY"];
const RISK_COLORS: Record<RiskLevel, string> = {
  CONSERVATIVE: "#26a69a",
  MODERATE: "#f59e0b",
  AGGRESSIVE: "#ef5350",
};

export default function BotSettings({ settings, onSave }: Props) {
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(settings.riskLevel);
  const [maxDailyTrades, setMaxDailyTrades] = useState(String(settings.maxDailyTrades));
  const [maxDrawdownPercent, setMaxDrawdownPercent] = useState(String(settings.maxDrawdownPercent));
  const [enabledAssetClasses, setEnabledAssetClasses] = useState<AssetClass[]>(settings.enabledAssetClasses);
  const [notifyOnSignal, setNotifyOnSignal] = useState(settings.notifyOnSignal);
  const [saving, setSaving] = useState(false);

  const toggleAssetClass = (ac: AssetClass) => {
    setEnabledAssetClasses((prev) =>
      prev.includes(ac) ? prev.filter((c) => c !== ac) : [...prev, ac]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      riskLevel,
      maxDailyTrades: parseInt(maxDailyTrades) || 10,
      maxDrawdownPercent: parseFloat(maxDrawdownPercent) || 10,
      enabledAssetClasses,
      notifyOnSignal,
    });
    setSaving(false);
  };

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Risk Level */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide mb-2 block" style={{ color: "#5d6673" }}>
          Risk Level
        </label>
        <div className="flex gap-2">
          {RISK_LEVELS.map((r) => (
            <button
              key={r}
              onClick={() => setRiskLevel(r)}
              className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                background: riskLevel === r ? `${RISK_COLORS[r]}20` : "#2a2e39",
                color: riskLevel === r ? RISK_COLORS[r] : "#5d6673",
                border: `1px solid ${riskLevel === r ? RISK_COLORS[r] + "60" : "transparent"}`,
              }}
            >
              {r.charAt(0) + r.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <p className="text-xs mt-2" style={{ color: "#5d6673" }}>
          {riskLevel === "CONSERVATIVE" && "2% of free margin per trade. Safer, slower growth."}
          {riskLevel === "MODERATE" && "5% of free margin per trade. Balanced risk/reward."}
          {riskLevel === "AGGRESSIVE" && "10% of free margin per trade. Higher risk, higher reward."}
        </p>
      </div>

      {/* Limits */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide mb-2 block" style={{ color: "#5d6673" }}>
            Max Daily Trades
          </label>
          <input
            type="number"
            min={1}
            max={100}
            value={maxDailyTrades}
            onChange={(e) => setMaxDailyTrades(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
            style={{ background: "#131722", borderColor: "#363a45", color: "#d1d4dc" }}
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide mb-2 block" style={{ color: "#5d6673" }}>
            Max Drawdown %
          </label>
          <input
            type="number"
            min={1}
            max={100}
            step={0.5}
            value={maxDrawdownPercent}
            onChange={(e) => setMaxDrawdownPercent(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
            style={{ background: "#131722", borderColor: "#363a45", color: "#d1d4dc" }}
          />
        </div>
      </div>

      {/* Asset classes */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide mb-2 block" style={{ color: "#5d6673" }}>
          Enabled Asset Classes
        </label>
        <div className="flex gap-2 flex-wrap">
          {ASSET_CLASSES.map((ac) => {
            const active = enabledAssetClasses.includes(ac);
            return (
              <button
                key={ac}
                onClick={() => toggleAssetClass(ac)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: active ? "rgba(41,98,255,0.15)" : "#2a2e39",
                  color: active ? "#2962ff" : "#5d6673",
                  border: `1px solid ${active ? "#2962ff40" : "transparent"}`,
                }}
              >
                {ac}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications toggle */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium" style={{ color: "#d1d4dc" }}>Signal Notifications</div>
          <div className="text-xs mt-0.5" style={{ color: "#5d6673" }}>Get notified when new signals are generated</div>
        </div>
        <button
          onClick={() => setNotifyOnSignal((v) => !v)}
          className="relative w-10 h-5 rounded-full transition-colors"
          style={{ background: notifyOnSignal ? "#26a69a" : "#363a45" }}
        >
          <div
            className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200"
            style={{ transform: notifyOnSignal ? "translateX(21px)" : "translateX(2px)" }}
          />
        </button>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
        style={{ background: "#2962ff", color: "#fff" }}
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        {saving ? "Saving…" : "Save Settings"}
      </button>
    </div>
  );
}
