"use client";
import { useState } from "react";
import { Wifi, WifiOff, RefreshCw, Filter } from "lucide-react";
import SignalCard from "./SignalCard";
import type { TradingSignal, SignalAction, SignalStatus } from "@/types/bot";

interface Props {
  signals: TradingSignal[];
  connected: boolean;
  onExecute: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  onRefresh: () => void;
}

export default function SignalFeed({ signals, connected, onExecute, onCancel, onRefresh }: Props) {
  const [filterAction, setFilterAction] = useState<SignalAction | "ALL">("ALL");
  const [filterStatus, setFilterStatus] = useState<SignalStatus | "ALL">("ALL");

  const filtered = signals.filter((s) => {
    if (filterAction !== "ALL" && s.action !== filterAction) return false;
    if (filterStatus !== "ALL" && s.status !== filterStatus) return false;
    return true;
  });

  const actionColors: Record<string, string> = {
    BUY: "#26a69a", SELL: "#ef5350", HOLD: "#f59e0b",
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b shrink-0" style={{ borderColor: "#363a45" }}>
        <div className="flex items-center gap-1.5 mr-auto">
          {connected
            ? <Wifi size={14} color="#26a69a" />
            : <WifiOff size={14} color="#5d6673" />}
          <span className="text-xs" style={{ color: connected ? "#26a69a" : "#5d6673" }}>
            {connected ? "Live" : "Offline"}
          </span>
        </div>

        <Filter size={13} color="#5d6673" />

        {/* Action filter */}
        {(["ALL", "BUY", "SELL", "HOLD"] as const).map((a) => (
          <button
            key={a}
            onClick={() => setFilterAction(a)}
            className="px-2 py-0.5 rounded text-xs font-medium transition-all"
            style={{
              background: filterAction === a
                ? a === "ALL" ? "#2a2e39" : `${actionColors[a]}20`
                : "transparent",
              color: filterAction === a
                ? a === "ALL" ? "#d1d4dc" : actionColors[a]
                : "#5d6673",
              border: `1px solid ${filterAction === a ? (a === "ALL" ? "#363a45" : actionColors[a] + "40") : "transparent"}`,
            }}
          >
            {a}
          </button>
        ))}

        {/* Status filter */}
        {(["ALL", "PENDING", "EXECUTED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s as SignalStatus | "ALL")}
            className="px-2 py-0.5 rounded text-xs transition-all"
            style={{
              background: filterStatus === s ? "#2a2e39" : "transparent",
              color: filterStatus === s ? "#d1d4dc" : "#5d6673",
            }}
          >
            {s === "ALL" ? "All Status" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}

        <button onClick={onRefresh} className="p-1 rounded hover:opacity-70 transition-opacity">
          <RefreshCw size={13} color="#5d6673" />
        </button>
      </div>

      {/* Signal list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="p-3 rounded-xl" style={{ background: "#2a2e39" }}>
              <Filter size={22} color="#5d6673" />
            </div>
            <span className="text-sm" style={{ color: "#5d6673" }}>
              {signals.length === 0 ? "No signals yet — the bot will generate them automatically" : "No signals match the filter"}
            </span>
          </div>
        ) : (
          filtered.map((signal) => (
            <SignalCard
              key={signal.id}
              signal={signal}
              onExecute={onExecute}
              onCancel={onCancel}
            />
          ))
        )}
      </div>
    </div>
  );
}
