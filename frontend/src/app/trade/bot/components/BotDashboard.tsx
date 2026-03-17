"use client";
import { Activity, TrendingUp, TrendingDown, Minus, Zap, BarChart2, Target, ShieldAlert } from "lucide-react";
import type { BotDashboardData } from "@/types/bot";

interface Props {
  data: BotDashboardData;
}

function StatCard({
  label, value, sub, color, Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  Icon: typeof Activity;
}) {
  return (
    <div
      className="rounded-xl p-4 border"
      style={{ background: "#1e222d", borderColor: "#2a2e39" }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs" style={{ color: "#5d6673" }}>{label}</span>
        <div className="p-1.5 rounded-lg" style={{ background: `${color}15` }}>
          <Icon size={14} color={color} />
        </div>
      </div>
      <div className="text-xl font-bold" style={{ color: "#d1d4dc" }}>{value}</div>
      {sub && <div className="text-xs mt-1" style={{ color: "#5d6673" }}>{sub}</div>}
    </div>
  );
}

export default function BotDashboard({ data }: Props) {
  const execRate = data.totalSignals > 0
    ? ((data.executedCount / data.totalSignals) * 100).toFixed(1)
    : "0.0";

  const signalBreakdown = [
    { label: "BUY", count: data.byAction.BUY, color: "#26a69a", Icon: TrendingUp },
    { label: "SELL", count: data.byAction.SELL, color: "#ef5350", Icon: TrendingDown },
    { label: "HOLD", count: data.byAction.HOLD, color: "#f59e0b", Icon: Minus },
  ];

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Total Signals"
          value={data.totalSignals}
          sub={`${data.pendingCount} pending`}
          color="#2962ff"
          Icon={Activity}
        />
        <StatCard
          label="Executed"
          value={data.executedCount}
          sub={`${execRate}% exec rate`}
          color="#26a69a"
          Icon={Zap}
        />
        <StatCard
          label="Avg Confidence"
          value={`${(data.avgConfidence * 100).toFixed(1)}%`}
          sub="across all signals"
          color="#f59e0b"
          Icon={Target}
        />
        <StatCard
          label="Scheduler"
          value={data.schedulerStatus.running ? "Running" : "Stopped"}
          sub={`every ${Math.round(data.schedulerStatus.intervalMs / 1000)}s`}
          color={data.schedulerStatus.running ? "#26a69a" : "#5d6673"}
          Icon={BarChart2}
        />
      </div>

      {/* Signal breakdown */}
      <div
        className="rounded-xl border p-4"
        style={{ background: "#1e222d", borderColor: "#2a2e39" }}
      >
        <h3 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "#5d6673" }}>
          Signal Breakdown
        </h3>
        <div className="flex gap-4">
          {signalBreakdown.map(({ label, count, color, Icon }) => {
            const pct = data.totalSignals > 0 ? (count / data.totalSignals) * 100 : 0;
            return (
              <div key={label} className="flex-1">
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon size={13} color={color} />
                  <span className="text-xs font-medium" style={{ color }}>{label}</span>
                  <span className="text-xs ml-auto font-semibold" style={{ color: "#d1d4dc" }}>{count}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "#2a2e39" }}>
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
                <div className="text-xs mt-1" style={{ color: "#5d6673" }}>{pct.toFixed(0)}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Provider statuses */}
      {data.providerStatuses.length > 0 && (
        <div
          className="rounded-xl border p-4"
          style={{ background: "#1e222d", borderColor: "#2a2e39" }}
        >
          <h3 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "#5d6673" }}>
            Data Providers
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.providerStatuses.map((p) => (
              <div
                key={p.name}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border"
                style={{
                  borderColor: p.available ? "#26a69a40" : "#363a45",
                  background: p.available ? "rgba(38,166,154,0.08)" : "#2a2e39",
                  color: p.available ? "#26a69a" : "#5d6673",
                }}
                title={p.errorMessage}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: p.available ? "#26a69a" : "#5d6673" }}
                />
                {p.name}
              </div>
            ))}
          </div>
          {data.providerStatuses.some((p) => !p.available) && (
            <div className="flex items-center gap-1.5 mt-3 text-xs" style={{ color: "#f59e0b" }}>
              <ShieldAlert size={12} />
              Some providers are offline — bot will use fallback sources
            </div>
          )}
        </div>
      )}
    </div>
  );
}
