"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Bot, TrendingUp, TrendingDown, Minus, Loader2,
  ChevronRight, Eye, EyeOff, RefreshCw, X,
  Activity, Bell, Settings, Zap,
} from "lucide-react";
import { useTradingStore } from "@/store/trading.store";
import { api, endpoints } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils";
import type { BotSignal, BotAnalysisResponse } from "@/types";

// ── Tab definitions ───────────────────────────────────────────────────────────
type BotTab = "analysis" | "signals" | "strategies" | "settings";

// ── Verdict banner ────────────────────────────────────────────────────────────
function VerdictBanner({ analysis }: { analysis: BotAnalysisResponse }) {
  const { verdict } = analysis;
  const isBuy = verdict.action === "BUY";
  const isSell = verdict.action === "SELL";
  const isHold = verdict.action === "HOLD";

  const bannerColor = isBuy ? "#26a69a" : isSell ? "#ef5350" : "#f59e0b";
  const bgColor = isBuy ? "rgba(38,166,154,0.12)" : isSell ? "rgba(239,83,80,0.12)" : "rgba(245,158,11,0.12)";
  const Icon = isBuy ? TrendingUp : isSell ? TrendingDown : Minus;

  return (
    <div className="rounded-xl p-3 mb-3" style={{ background: bgColor, border: `1px solid ${bannerColor}44` }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={16} style={{ color: bannerColor }} />
          <span className="text-sm font-bold" style={{ color: bannerColor }}>
            {verdict.action}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold" style={{ background: bannerColor + "22", color: bannerColor }}>
            {verdict.strength}
          </span>
        </div>
        <span className="text-xs font-bold" style={{ color: bannerColor }}>{verdict.confidence}%</span>
      </div>
      {/* Confidence bar */}
      <div className="w-full h-1.5 rounded-full" style={{ background: "#363a45" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${verdict.confidence}%`, background: bannerColor }}
        />
      </div>
    </div>
  );
}

// ── Indicator badge ───────────────────────────────────────────────────────────
function SignalBadge({ signal }: { signal: "bullish" | "bearish" | "neutral" }) {
  const map = {
    bullish: { color: "#26a69a", label: "🟢" },
    bearish: { color: "#ef5350", label: "🔴" },
    neutral: { color: "#f59e0b", label: "🟡" },
  };
  return <span className="text-[11px]">{map[signal].label}</span>;
}

// ── Analysis tab ──────────────────────────────────────────────────────────────
function AnalysisTab() {
  const { botAnalysis, botAnalyzing, selectedAsset, timeframe, setBotAnalysis, setBotDrawings, setBotAnalyzing, setBotPanelOpen, addToast } = useTradingStore();

  const handleAnalyze = useCallback(async () => {
    if (!selectedAsset || botAnalyzing) return;
    setBotAnalyzing(true);
    try {
      const assetClass =
        selectedAsset.category === "CRYPTO" ? "CRYPTO"
        : selectedAsset.category === "FOREX" ? "FOREX"
        : selectedAsset.category === "STOCKS" ? "STOCK"
        : "COMMODITY";
      const res = await api.post(endpoints.botAnalyze, { symbol: selectedAsset.symbol, assetClass, timeframe });
      const analysis = res.data as BotAnalysisResponse;
      setBotAnalysis(analysis);
      if (analysis.drawings?.drawings) setBotDrawings(analysis.drawings.drawings);
      addToast({ type: "success", message: `Analysis complete: ${verdict(analysis.verdict.action)} ${analysis.verdict.confidence}% confidence` });
    } catch {
      addToast({ type: "error", message: "Analysis failed. Check connection." });
    } finally {
      setBotAnalyzing(false);
    }
  }, [selectedAsset, botAnalyzing, timeframe]);

  function verdict(a: string) { return a === "BUY" ? "✅ BUY" : a === "SELL" ? "🔴 SELL" : "⏸ HOLD"; }

  if (botAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 size={28} color="#2962ff" className="animate-spin" />
        <p className="text-sm" style={{ color: "#b2b5be" }}>Analyzing {selectedAsset?.symbol}…</p>
        <p className="text-xs" style={{ color: "#5d6673" }}>Fetching market data & running indicators</p>
      </div>
    );
  }

  if (!botAnalysis) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4 text-center px-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(41,98,255,0.12)" }}>
          <Bot size={22} color="#2962ff" />
        </div>
        <div>
          <p className="text-sm font-semibold mb-1" style={{ color: "#d1d4dc" }}>No analysis yet</p>
          <p className="text-xs" style={{ color: "#5d6673" }}>Click "Analyze" to run AI analysis on {selectedAsset?.symbol ?? "the current asset"}</p>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={!selectedAsset}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90"
          style={{ background: "#2962ff" }}
        >
          <Bot size={14} /> Analyze Now
        </button>
      </div>
    );
  }

  const a = botAnalysis;
  const fmtP = (n: number) => n >= 1 ? `$${formatPrice(n)}` : `$${n.toFixed(5)}`;

  return (
    <div className="space-y-3 pb-4">
      {/* Verdict */}
      <VerdictBanner analysis={a} />

      {/* Summary */}
      <div className="rounded-lg p-3" style={{ background: "#131722" }}>
        <p className="text-[11px] leading-relaxed" style={{ color: "#b2b5be" }}>{a.verdict.summary}</p>
      </div>

      {/* Levels */}
      <Section title="Trade Levels">
        {[
          { label: "Entry", value: fmtP(a.levels.entry), color: "#2962ff" },
          { label: "Stop Loss", value: fmtP(a.levels.stopLoss), color: "#ef5350" },
          { label: "TP1", value: fmtP(a.levels.takeProfit1), color: "#26a69a" },
          { label: "TP2", value: fmtP(a.levels.takeProfit2), color: "#26a69a" },
          { label: "Risk:Reward", value: `1:${a.levels.riskRewardRatio}`, color: "#d1d4dc" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex justify-between items-center py-1">
            <span className="text-[11px]" style={{ color: "#5d6673" }}>{label}</span>
            <span className="text-[11px] font-mono font-semibold" style={{ color }}>{value}</span>
          </div>
        ))}
      </Section>

      {/* Technical Indicators */}
      <Section title="Technical Indicators">
        {a.technicals.indicators.slice(0, 8).map((ind) => (
          <div key={ind.name} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <SignalBadge signal={ind.signal} />
              <span className="text-[11px] truncate" style={{ color: "#b2b5be" }}>{ind.name}</span>
            </div>
            <span className="text-[11px] font-mono" style={{ color: "#5d6673" }}>
              {typeof ind.value === "number" ? (ind.value > 1000 ? formatPrice(ind.value) : ind.value.toFixed(2)) : ind.value}
            </span>
          </div>
        ))}
        {a.technicals.trend && (
          <div className="mt-1 pt-1 border-t" style={{ borderColor: "#363a45" }}>
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "#5d6673" }}>Trend: </span>
            <span className="text-[10px] font-semibold capitalize" style={{ color: a.technicals.trend === "bullish" ? "#26a69a" : a.technicals.trend === "bearish" ? "#ef5350" : "#f59e0b" }}>
              {a.technicals.trend}
            </span>
          </div>
        )}
      </Section>

      {/* Multi-Timeframe */}
      {a.multiTimeframe.length > 0 && (
        <Section title="Multi-Timeframe">
          {a.multiTimeframe.map((m) => (
            <div key={m.timeframe} className="flex items-center justify-between py-1">
              <span className="text-[11px] font-mono" style={{ color: "#5d6673" }}>{m.timeframe}</span>
              <div className="flex items-center gap-1">
                <SignalBadge signal={m.signal} />
                <span className="text-[10px] capitalize" style={{ color: m.signal === "bullish" ? "#26a69a" : m.signal === "bearish" ? "#ef5350" : "#f59e0b" }}>
                  {m.signal}
                </span>
                <span className="text-[10px]" style={{ color: "#5d6673" }}>({m.confidence}%)</span>
              </div>
            </div>
          ))}
          <div className="mt-1 pt-1 border-t text-[10px]" style={{ borderColor: "#363a45", color: "#5d6673" }}>
            Confluence: <span className="font-semibold" style={{ color: "#d1d4dc" }}>{(a.confluenceScore * 100).toFixed(0)}%</span>
          </div>
        </Section>
      )}

      {/* Fundamentals */}
      <Section title="Fundamental">
        <div className="flex items-center justify-between py-1">
          <span className="text-[11px]" style={{ color: "#5d6673" }}>News Sentiment</span>
          <div className="flex items-center gap-1">
            <SignalBadge signal={a.fundamentals.newsSentiment.score > 0.2 ? "bullish" : a.fundamentals.newsSentiment.score < -0.2 ? "bearish" : "neutral"} />
            <span className="text-[11px] font-semibold" style={{ color: "#d1d4dc" }}>{a.fundamentals.newsSentiment.label}</span>
          </div>
        </div>
        {a.fundamentals.newsSentiment.headlines.slice(0, 3).map((h, i) => (
          <div key={i} className="py-0.5">
            <p className="text-[10px] leading-relaxed" style={{ color: "#5d6673" }}>• {h.title}</p>
          </div>
        ))}
        {a.fundamentals.marketData && (
          <>
            {a.fundamentals.marketData.fearGreedIndex !== undefined && (
              <div className="flex justify-between py-1 mt-1 border-t" style={{ borderColor: "#363a45" }}>
                <span className="text-[11px]" style={{ color: "#5d6673" }}>Fear & Greed</span>
                <span className="text-[11px] font-mono" style={{ color: "#d1d4dc" }}>{a.fundamentals.marketData.fearGreedIndex}</span>
              </div>
            )}
            {a.fundamentals.marketData.fundingRate !== undefined && (
              <div className="flex justify-between py-1">
                <span className="text-[11px]" style={{ color: "#5d6673" }}>Funding Rate</span>
                <span className="text-[11px] font-mono" style={{ color: a.fundamentals.marketData.fundingRate > 0 ? "#26a69a" : "#ef5350" }}>
                  {(a.fundamentals.marketData.fundingRate * 100).toFixed(4)}%
                </span>
              </div>
            )}
          </>
        )}
      </Section>

      {/* Detected patterns */}
      {a.technicals.patterns.length > 0 && (
        <Section title="Patterns Detected">
          {a.technicals.patterns.map((p, i) => (
            <div key={i} className="flex items-center gap-2 py-1">
              <span className="text-[11px]" style={{ color: "#f59e0b" }}>◆</span>
              <span className="text-[11px]" style={{ color: "#b2b5be" }}>{p.name}</span>
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>{p.status}</span>
            </div>
          ))}
        </Section>
      )}

      {/* Re-analyze button */}
      <button
        onClick={handleAnalyze}
        disabled={botAnalyzing}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-50"
        style={{ background: "#1e222d", border: "1px solid #363a45", color: "#5d6673" }}
      >
        <RefreshCw size={11} /> Refresh Analysis
      </button>
    </div>
  );
}

// ── Signals tab ───────────────────────────────────────────────────────────────
function SignalsTab() {
  const { botSignals, setBotSignals, addToast } = useTradingStore();
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(endpoints.botSignals + "?limit=20");
      setBotSignals(res.data?.signals ?? res.data ?? []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleExecute = async (id: string) => {
    try {
      await api.post(endpoints.botExecuteSignal(id));
      addToast({ type: "success", message: "Signal executed" });
      load();
    } catch { addToast({ type: "error", message: "Execution failed" }); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={22} color="#2962ff" className="animate-spin" />
    </div>
  );

  if (botSignals.length === 0) return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      <Bell size={28} style={{ color: "#363a45" }} />
      <p className="text-sm font-medium" style={{ color: "#5d6673" }}>No signals yet</p>
      <p className="text-xs" style={{ color: "#363a45" }}>Signals appear here when market conditions match</p>
    </div>
  );

  return (
    <div className="space-y-2 pb-4">
      <div className="flex justify-end">
        <button onClick={load} className="p-1 rounded transition-colors hover:bg-[#1e222d]" style={{ color: "#5d6673" }}>
          <RefreshCw size={11} />
        </button>
      </div>
      {botSignals.map((s) => (
        <SignalCard key={s.id} signal={s} onExecute={handleExecute} />
      ))}
    </div>
  );
}

function SignalCard({ signal, onExecute }: { signal: BotSignal; onExecute: (id: string) => void }) {
  const isBuy = signal.action === "BUY";
  const isSell = signal.action === "SELL";
  const color = isBuy ? "#26a69a" : isSell ? "#ef5350" : "#f59e0b";
  const ago = Math.floor((Date.now() - new Date(signal.createdAt).getTime()) / 60000);

  return (
    <div className="rounded-xl p-3" style={{ background: "#1e222d", border: "1px solid #363a45" }}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold" style={{ color: "#d1d4dc" }}>{signal.asset}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: color + "20", color }}>{signal.action}</span>
          <span className="text-[10px]" style={{ color: "#5d6673" }}>{signal.timeframe}</span>
        </div>
        <span className="text-[10px]" style={{ color: "#5d6673" }}>{ago}m ago</span>
      </div>
      {/* Confidence */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1 rounded-full" style={{ background: "#363a45" }}>
          <div className="h-full rounded-full" style={{ width: `${(signal.confidence * 100).toFixed(0)}%`, background: color }} />
        </div>
        <span className="text-[10px] font-mono" style={{ color }}>{(signal.confidence * 100).toFixed(0)}%</span>
      </div>
      {/* Entry/SL/TP */}
      {signal.entryPrice && (
        <div className="flex gap-3 text-[10px] font-mono mb-2" style={{ color: "#5d6673" }}>
          <span>E: <span style={{ color: "#d1d4dc" }}>${formatPrice(signal.entryPrice)}</span></span>
          {signal.stopLoss && <span>SL: <span style={{ color: "#ef5350" }}>${formatPrice(signal.stopLoss)}</span></span>}
          {signal.takeProfit && <span>TP: <span style={{ color: "#26a69a" }}>${formatPrice(signal.takeProfit)}</span></span>}
        </div>
      )}
      {/* Status + actions */}
      <div className="flex items-center gap-2">
        {signal.status === "PENDING" && !signal.autoExecuted && (
          <button
            onClick={() => onExecute(signal.id)}
            className="flex-1 py-1 rounded text-[10px] font-semibold text-white transition-all hover:opacity-90"
            style={{ background: color }}
          >
            Execute
          </button>
        )}
        {(signal.autoExecuted || signal.status === "EXECUTED") && (
          <span className="text-[10px] px-2 py-1 rounded font-semibold" style={{ background: "rgba(38,166,154,0.15)", color: "#26a69a" }}>✓ Executed</span>
        )}
        {signal.status === "EXPIRED" && (
          <span className="text-[10px]" style={{ color: "#5d6673" }}>Expired</span>
        )}
      </div>
    </div>
  );
}

// ── Strategies tab ────────────────────────────────────────────────────────────
function StrategiesTab() {
  const [strategies, setStrategies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { addToast } = useTradingStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(endpoints.botStrategies);
      setStrategies(res.data ?? []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleBacktest = async (id: string) => {
    try {
      await api.post(endpoints.botBacktest(id));
      addToast({ type: "info", message: "Backtest started" });
      setTimeout(load, 2000);
    } catch { addToast({ type: "error", message: "Backtest failed" }); }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await api.put(`${endpoints.botStrategies}/${id}`, { isActive: !isActive });
      addToast({ type: "success", message: `Strategy ${isActive ? "paused" : "activated"}` });
      load();
    } catch { addToast({ type: "error", message: "Failed to update strategy" }); }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 size={22} color="#2962ff" className="animate-spin" /></div>;

  if (strategies.length === 0) return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      <Zap size={28} style={{ color: "#363a45" }} />
      <p className="text-sm font-medium" style={{ color: "#5d6673" }}>No strategies yet</p>
      <p className="text-xs" style={{ color: "#363a45" }}>Create strategies on the bot page to manage them here</p>
    </div>
  );

  return (
    <div className="space-y-2 pb-4">
      {strategies.map((s) => (
        <div key={s.id} className="rounded-xl p-3" style={{ background: "#1e222d", border: "1px solid #363a45" }}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <span className="text-xs font-semibold" style={{ color: "#d1d4dc" }}>{s.name}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px]" style={{ color: "#5d6673" }}>{s.assetClass}</span>
                {s.winRate != null && (
                  <span className="text-[10px]" style={{ color: s.winRate > 0.5 ? "#26a69a" : "#ef5350" }}>
                    {(s.winRate * 100).toFixed(0)}% WR
                  </span>
                )}
              </div>
            </div>
            {/* Active toggle */}
            <button
              onClick={() => handleToggle(s.id, s.isActive)}
              className="relative inline-flex h-4 w-7 cursor-pointer rounded-full transition-colors"
              style={{ background: s.isActive ? "#2962ff" : "#363a45" }}
            >
              <span
                className="absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white transition-transform"
                style={{ transform: s.isActive ? "translateX(12px)" : "translateX(0)" }}
              />
            </button>
          </div>
          <button
            onClick={() => handleBacktest(s.id)}
            className="w-full py-1 rounded text-[10px] font-medium transition-colors hover:bg-[#2a2e39]"
            style={{ border: "1px solid #363a45", color: "#5d6673" }}
          >
            Run Backtest
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Settings tab ──────────────────────────────────────────────────────────────
function SettingsTab() {
  const { showBotDrawings, setShowBotDrawings, clearBotDrawings, addToast } = useTradingStore();
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(endpoints.botSettings).then((r) => setSettings(r.data)).catch(() => {});
  }, []);

  const save = async (patch: any) => {
    setSaving(true);
    try {
      const res = await api.put(endpoints.botSettings, patch);
      setSettings(res.data);
      addToast({ type: "success", message: "Settings saved" });
    } catch { addToast({ type: "error", message: "Save failed" }); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Drawing visibility */}
      <Section title="Chart Drawings">
        <ToggleRow
          label="Show bot drawings on chart"
          checked={showBotDrawings}
          onChange={setShowBotDrawings}
        />
        <button
          onClick={() => { clearBotDrawings(); addToast({ type: "info", message: "Bot drawings cleared" }); }}
          className="w-full py-1.5 rounded text-[11px] font-medium mt-2 transition-colors hover:bg-[#2a2e39]"
          style={{ border: "1px solid #363a45", color: "#ef5350" }}
        >
          Clear All Bot Drawings
        </button>
      </Section>

      {settings && (
        <>
          {/* Auto-trade */}
          <Section title="Auto-Trading">
            <ToggleRow
              label="Enable auto-trade"
              checked={settings.autoTradeEnabled ?? false}
              onChange={(v) => save({ autoTradeEnabled: v })}
            />
            {settings.autoTradeEnabled && (
              <div className="mt-2 p-2 rounded" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}>
                <p className="text-[10px]" style={{ color: "#f59e0b" }}>⚠️ Auto-trade will execute signals automatically. Ensure your risk parameters are set correctly.</p>
              </div>
            )}
          </Section>

          {/* Risk level */}
          <Section title="Risk Level">
            <div className="flex gap-2 mt-1">
              {(["CONSERVATIVE", "MODERATE", "AGGRESSIVE"] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => save({ riskLevel: lvl })}
                  className="flex-1 py-1 rounded text-[9px] font-semibold uppercase tracking-wider transition-all"
                  style={settings.riskLevel === lvl
                    ? { background: "#2962ff", color: "#fff" }
                    : { background: "#1e222d", border: "1px solid #363a45", color: "#5d6673" }
                  }
                >
                  {lvl.slice(0, 4)}
                </button>
              ))}
            </div>
          </Section>

          {/* Limits */}
          <Section title="Limits">
            <div className="flex items-center justify-between py-1">
              <span className="text-[11px]" style={{ color: "#5d6673" }}>Max daily trades</span>
              <span className="text-[11px] font-mono" style={{ color: "#d1d4dc" }}>{settings.maxDailyTrades}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-[11px]" style={{ color: "#5d6673" }}>Max drawdown</span>
              <span className="text-[11px] font-mono" style={{ color: "#d1d4dc" }}>{settings.maxDrawdownPercent}%</span>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #363a45" }}>
      <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider" style={{ background: "#131722", color: "#5d6673" }}>
        {title}
      </div>
      <div className="px-3 py-2" style={{ background: "#1e222d" }}>{children}</div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[11px]" style={{ color: "#b2b5be" }}>{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-4 w-7 cursor-pointer rounded-full transition-colors"
        style={{ background: checked ? "#2962ff" : "#363a45" }}
      >
        <span
          className="absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white transition-transform"
          style={{ transform: checked ? "translateX(12px)" : "translateX(0)" }}
        />
      </button>
    </div>
  );
}

// ── Main BotPanel ─────────────────────────────────────────────────────────────
export function BotPanel() {
  const { botPanelOpen, setBotPanelOpen, selectedAsset, timeframe } = useTradingStore();
  const [tab, setTab] = useState<BotTab>("analysis");

  if (!botPanelOpen) return null;

  const TABS: { id: BotTab; label: string; icon: React.ReactNode }[] = [
    { id: "analysis", label: "Analysis", icon: <Activity size={11} /> },
    { id: "signals", label: "Signals", icon: <Bell size={11} /> },
    { id: "strategies", label: "Strategies", icon: <Zap size={11} /> },
    { id: "settings", label: "Settings", icon: <Settings size={11} /> },
  ];

  return (
    <div
      className="flex flex-col border-l shrink-0 overflow-hidden"
      style={{ width: 320, background: "#1e222d", borderColor: "#363a45" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0" style={{ background: "#131722", borderColor: "#363a45" }}>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "rgba(41,98,255,0.15)" }}>
            <Bot size={11} color="#2962ff" />
          </div>
          <span className="text-[11px] font-semibold" style={{ color: "#d1d4dc" }}>AI Analyst</span>
          {selectedAsset && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "#363a45", color: "#5d6673" }}>
              {selectedAsset.symbol} · {timeframe}
            </span>
          )}
        </div>
        <button
          onClick={() => setBotPanelOpen(false)}
          className="p-0.5 rounded hover:bg-[#363a45] transition-colors"
          style={{ color: "#5d6673" }}
        >
          <X size={13} />
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b shrink-0" style={{ borderColor: "#363a45" }}>
        {TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-semibold transition-colors"
            style={tab === id
              ? { borderBottom: "2px solid #2962ff", color: "#2962ff", background: "rgba(41,98,255,0.06)" }
              : { color: "#5d6673", borderBottom: "2px solid transparent" }
            }
          >
            {icon}
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content — scrollable */}
      <div className="flex-1 overflow-y-auto px-3 pt-3">
        {tab === "analysis" && <AnalysisTab />}
        {tab === "signals" && <SignalsTab />}
        {tab === "strategies" && <StrategiesTab />}
        {tab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}
