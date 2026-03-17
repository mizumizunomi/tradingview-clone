"use client";
import { useState } from "react";
import { Zap, ZapOff } from "lucide-react";
import type { BotSettings } from "@/types/bot";

interface Props {
  settings: BotSettings | null;
  onToggle: (enabled: boolean) => Promise<void>;
}

export default function AutoTradeToggle({ settings, onToggle }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const enabled = settings?.autoTradeEnabled ?? false;

  const handleClick = () => {
    if (!enabled) { setConfirming(true); return; }
    handleToggle(false);
  };

  const handleToggle = async (val: boolean) => {
    setLoading(true);
    setConfirming(false);
    await onToggle(val);
    setLoading(false);
  };

  return (
    <>
      <div className="flex items-center gap-3">
        {/* Toggle pill */}
        <button
          onClick={handleClick}
          disabled={loading}
          className="relative flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 font-medium text-sm"
          style={{
            background: enabled ? "rgba(38,166,154,0.12)" : "rgba(239,83,80,0.08)",
            borderColor: enabled ? "#26a69a" : "#363a45",
            color: enabled ? "#26a69a" : "#b2b5be",
          }}
        >
          {/* Pulsing dot */}
          {enabled && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#26a69a] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#26a69a]" />
            </span>
          )}
          {!enabled && <ZapOff size={14} />}
          <span>{loading ? "Updating…" : enabled ? "Auto-Trading: ACTIVE" : "Auto-Trading: OFF"}</span>

          {/* Switch track */}
          <div
            className="w-10 h-5 rounded-full ml-1 relative transition-colors duration-200"
            style={{ background: enabled ? "#26a69a" : "#363a45" }}
          >
            <div
              className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200"
              style={{ transform: enabled ? "translateX(21px)" : "translateX(2px)" }}
            />
          </div>
        </button>

        {enabled && (
          <span className="text-xs" style={{ color: "#5d6673" }}>
            {settings?.riskLevel} risk · {settings?.maxDailyTrades} trades/day max
          </span>
        )}
      </div>

      {/* Confirmation dialog */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div
            className="rounded-xl p-6 w-full max-w-sm shadow-2xl border"
            style={{ background: "#1e222d", borderColor: "#363a45" }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg" style={{ background: "rgba(245,158,11,0.15)" }}>
                <Zap size={20} color="#f59e0b" />
              </div>
              <h3 className="font-semibold text-base" style={{ color: "#d1d4dc" }}>
                Enable Auto-Trading?
              </h3>
            </div>
            <p className="text-sm mb-5 leading-relaxed" style={{ color: "#b2b5be" }}>
              The bot will automatically place real orders when signals meet your confidence
              threshold. Make sure your risk settings are configured correctly. You can disable
              this at any time.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors hover:opacity-80"
                style={{ borderColor: "#363a45", color: "#b2b5be", background: "transparent" }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleToggle(true)}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ background: "#26a69a", color: "#fff" }}
              >
                Enable
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
