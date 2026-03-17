"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, Zap, Search, BookOpen, Settings, LayoutDashboard, Loader2,
} from "lucide-react";
import { SideNav } from "@/components/layout/SideNav";
import { TopToolbar } from "@/components/layout/TopToolbar";
import { useBot } from "@/hooks/useBot";
import { api, endpoints } from "@/lib/api";
import AutoTradeToggle from "./components/AutoTradeToggle";
import BotDashboard from "./components/BotDashboard";
import SignalFeed from "./components/SignalFeed";
import AnalysisPanel from "./components/AnalysisPanel";
import StrategyBuilder from "./components/StrategyBuilder";
import ResearchMode from "./components/ResearchMode";
import BotSettings from "./components/BotSettings";
import type { BotSettings as BotSettingsType, AssetClass, BotStrategy } from "@/types/bot";

type Tab = "dashboard" | "signals" | "analysis" | "strategies" | "research" | "settings";

const TABS: { id: Tab; label: string; Icon: typeof Activity }[] = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "signals", label: "Signals", Icon: Zap },
  { id: "analysis", label: "Analysis", Icon: Search },
  { id: "strategies", label: "Strategies", Icon: Activity },
  { id: "research", label: "Research", Icon: BookOpen },
  { id: "settings", label: "Settings", Icon: Settings },
];

export default function BotPage() {
  const router = useRouter();
  const {
    signals, settings, dashboard, strategies, connected, loading,
    generateSignal, executeSignal, cancelSignal, updateSettings, runResearch,
    reload, setStrategies,
  } = useBot();

  const [tab, setTab] = useState<Tab>("dashboard");

  // Strategy CRUD handlers
  const handleCreateStrategy = async (data: {
    name: string;
    assetClass: AssetClass;
    riskParams: { stopLossPercent: number; takeProfitPercent: number; maxPositionSize: number };
  }) => {
    const res = await api.post(endpoints.botStrategies, {
      ...data,
      indicators: {},
      rules: {},
    });
    setStrategies((prev) => [...prev, res.data as BotStrategy]);
  };

  const handleToggleStrategy = async (id: string, isActive: boolean) => {
    const res = await api.put(endpoints.botStrategy(id), { isActive });
    setStrategies((prev) => prev.map((s) => s.id === id ? res.data as BotStrategy : s));
  };

  const handleDeleteStrategy = async (id: string) => {
    await api.delete(endpoints.botStrategy(id));
    setStrategies((prev) => prev.filter((s) => s.id !== id));
  };

  const handleBacktestStrategy = async (id: string) => {
    const res = await api.post(endpoints.botBacktest(id));
    setStrategies((prev) =>
      prev.map((s) => s.id === id ? { ...s, backtestResults: res.data } as BotStrategy : s)
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "#131722" }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} color="#2962ff" className="animate-spin" />
          <span className="text-sm" style={{ color: "#5d6673" }}>Loading AI Bot…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#131722" }}>
      <SideNav />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopToolbar />

        {/* Page header */}
        <div
          className="flex items-center gap-4 px-4 py-2.5 border-b shrink-0"
          style={{ background: "#1e222d", borderColor: "#363a45" }}
        >
          {/* Title */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg" style={{ background: "rgba(41,98,255,0.15)" }}>
              <Activity size={16} color="#2962ff" />
            </div>
            <span className="font-semibold text-sm" style={{ color: "#d1d4dc" }}>AI Trading Bot</span>
            {signals.length > 0 && (
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ background: "rgba(41,98,255,0.12)", color: "#2962ff" }}
              >
                {signals.filter((s) => s.status === "PENDING").length} pending
              </span>
            )}
          </div>

          {/* Auto-trade toggle */}
          {settings && (
            <div className="ml-auto">
              <AutoTradeToggle
                settings={settings}
                onToggle={(enabled) => updateSettings({ autoTradeEnabled: enabled })}
              />
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div
          className="flex border-b shrink-0 overflow-x-auto"
          style={{ background: "#1e222d", borderColor: "#363a45" }}
        >
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-all shrink-0"
              style={{
                color: tab === id ? "#d1d4dc" : "#5d6673",
                borderBottom: tab === id ? "2px solid #2962ff" : "2px solid transparent",
              }}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {tab === "dashboard" && dashboard && (
            <div className="h-full overflow-y-auto">
              <BotDashboard data={dashboard} />
            </div>
          )}

          {tab === "signals" && (
            <SignalFeed
              signals={signals}
              connected={connected}
              onExecute={async (id) => { await executeSignal(id); }}
              onCancel={cancelSignal}
              onRefresh={reload}
            />
          )}

          {tab === "analysis" && (
            <AnalysisPanel
              signals={signals}
              onGenerateSignal={generateSignal}
            />
          )}

          {tab === "strategies" && (
            <StrategyBuilder
              strategies={strategies}
              onCreateStrategy={handleCreateStrategy}
              onToggleStrategy={handleToggleStrategy}
              onDeleteStrategy={handleDeleteStrategy}
              onBacktestStrategy={handleBacktestStrategy}
            />
          )}

          {tab === "research" && (
            <ResearchMode onRunResearch={runResearch} />
          )}

          {tab === "settings" && settings && (
            <div className="h-full overflow-y-auto max-w-xl">
              <BotSettings
                settings={settings}
                onSave={updateSettings}
              />
            </div>
          )}

          {/* Fallback if data not yet loaded */}
          {(tab === "dashboard" && !dashboard) || (tab === "settings" && !settings) ? (
            <div className="flex items-center justify-center h-full text-sm" style={{ color: "#5d6673" }}>
              No data available yet
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
