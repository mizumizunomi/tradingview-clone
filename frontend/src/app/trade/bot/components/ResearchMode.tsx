"use client";
import { useState } from "react";
import { BookOpen, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { ResearchReport, AssetClass } from "@/types/bot";

interface Props {
  onRunResearch: (asset: string, assetClass: AssetClass) => Promise<ResearchReport | null>;
}

const ASSET_CLASSES: AssetClass[] = ["CRYPTO", "FOREX", "STOCK", "COMMODITY"];
const QUICK: Record<AssetClass, string[]> = {
  CRYPTO: ["BTC/USD", "ETH/USD", "SOL/USD"],
  FOREX: ["EUR/USD", "GBP/USD", "USD/JPY"],
  STOCK: ["AAPL", "TSLA", "NVDA"],
  COMMODITY: ["GOLD", "OIL", "SILVER"],
};

function verdictColor(verdict: string): string {
  const v = verdict.toUpperCase();
  if (v.includes("BULL") || v.includes("BUY") || v.includes("POSITIVE")) return "#26a69a";
  if (v.includes("BEAR") || v.includes("SELL") || v.includes("NEGATIVE")) return "#ef5350";
  return "#f59e0b";
}

export default function ResearchMode({ onRunResearch }: Props) {
  const [asset, setAsset] = useState("BTC/USD");
  const [assetClass, setAssetClass] = useState<AssetClass>("CRYPTO");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ResearchReport | null>(null);

  const handleRun = async () => {
    setLoading(true);
    const r = await onRunResearch(asset.trim().toUpperCase(), assetClass);
    if (r) setReport(r);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="p-3 border-b shrink-0" style={{ borderColor: "#363a45" }}>
        <div className="flex gap-1 mb-2">
          {ASSET_CLASSES.map((ac) => (
            <button
              key={ac}
              onClick={() => { setAssetClass(ac); setAsset(QUICK[ac][0]); }}
              className="px-2.5 py-1 rounded text-xs font-medium"
              style={{ background: assetClass === ac ? "#2962ff" : "#2a2e39", color: assetClass === ac ? "#fff" : "#5d6673" }}
            >
              {ac}
            </button>
          ))}
        </div>
        <div className="flex gap-1 mb-2">
          {QUICK[assetClass].map((a) => (
            <button key={a} onClick={() => setAsset(a)} className="px-2 py-0.5 rounded text-xs"
              style={{ background: asset === a ? "#2a2e39" : "transparent", color: asset === a ? "#d1d4dc" : "#5d6673" }}
            >{a}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRun()}
            placeholder="Asset symbol…"
            className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none border"
            style={{ background: "#131722", borderColor: "#363a45", color: "#d1d4dc" }}
          />
          <button
            onClick={handleRun}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
            style={{ background: "#2962ff", color: "#fff" }}
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <BookOpen size={12} />}
            {loading ? "Researching…" : "Run Research"}
          </button>
        </div>
      </div>

      {/* Report */}
      <div className="flex-1 overflow-y-auto">
        {report ? (
          <div className="flex flex-col gap-4 p-4">
            {/* Verdict */}
            <div className="rounded-xl p-4 border" style={{ background: "#1e222d", borderColor: "#2a2e39" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold" style={{ color: "#d1d4dc" }}>{report.asset}</span>
                <span className="text-sm font-bold" style={{ color: verdictColor(report.overallVerdict) }}>
                  {report.overallVerdict}
                </span>
              </div>
              <div className="text-xs" style={{ color: "#5d6673" }}>
                Confidence: <span style={{ color: "#d1d4dc" }}>{(report.confidence * 100).toFixed(1)}%</span>
                &nbsp;·&nbsp;Generated {new Date(report.generatedAt).toLocaleTimeString()}
              </div>
            </div>

            {/* Entry / SL / TP */}
            {(report.suggestedEntry || report.suggestedStopLoss || report.suggestedTakeProfit) && (
              <div className="grid grid-cols-3 gap-2">
                {report.suggestedEntry && (
                  <div className="rounded-lg p-2.5" style={{ background: "#131722" }}>
                    <div className="text-xs mb-1" style={{ color: "#5d6673" }}>Entry</div>
                    <div className="text-sm font-semibold" style={{ color: "#d1d4dc" }}>{report.suggestedEntry.toFixed(4)}</div>
                  </div>
                )}
                {report.suggestedStopLoss && (
                  <div className="rounded-lg p-2.5" style={{ background: "#131722" }}>
                    <div className="text-xs mb-1" style={{ color: "#5d6673" }}>Stop Loss</div>
                    <div className="text-sm font-semibold" style={{ color: "#ef5350" }}>{report.suggestedStopLoss.toFixed(4)}</div>
                  </div>
                )}
                {report.suggestedTakeProfit && (
                  <div className="rounded-lg p-2.5" style={{ background: "#131722" }}>
                    <div className="text-xs mb-1" style={{ color: "#5d6673" }}>Take Profit</div>
                    <div className="text-sm font-semibold" style={{ color: "#26a69a" }}>{report.suggestedTakeProfit.toFixed(4)}</div>
                  </div>
                )}
              </div>
            )}

            {/* Multi-timeframe */}
            {report.priceActionSummary?.timeframes && (
              <div className="rounded-xl p-3 border" style={{ background: "#1e222d", borderColor: "#2a2e39" }}>
                <h4 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#5d6673" }}>Multi-Timeframe</h4>
                <div className="flex flex-col gap-1.5">
                  {Object.entries(report.priceActionSummary.timeframes).map(([tf, d]) => {
                    const trendCol = d.trend === "UPTREND" ? "#26a69a" : d.trend === "DOWNTREND" ? "#ef5350" : "#f59e0b";
                    const TrendIcon = d.trend === "UPTREND" ? TrendingUp : d.trend === "DOWNTREND" ? TrendingDown : Minus;
                    return (
                      <div key={tf} className="flex items-center gap-3 px-2 py-1.5 rounded-lg text-xs" style={{ background: "#131722" }}>
                        <span className="w-8 font-medium" style={{ color: "#b2b5be" }}>{tf}</span>
                        <TrendIcon size={12} color={trendCol} />
                        <span style={{ color: trendCol }}>{d.trend}</span>
                        <span className="ml-auto" style={{ color: "#5d6673" }}>
                          Score: <span style={{ color: "#d1d4dc" }}>{d.compositeScore.toFixed(3)}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Summaries */}
            {report.technicalSummary && (
              <div className="rounded-xl p-3 border" style={{ background: "#1e222d", borderColor: "#2a2e39" }}>
                <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#5d6673" }}>Technical Summary</h4>
                <p className="text-xs leading-relaxed" style={{ color: "#b2b5be" }}>{report.technicalSummary}</p>
              </div>
            )}

            {report.fundamentalSummary && (
              <div className="rounded-xl p-3 border" style={{ background: "#1e222d", borderColor: "#2a2e39" }}>
                <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#5d6673" }}>Fundamental Summary</h4>
                <p className="text-xs leading-relaxed" style={{ color: "#b2b5be" }}>{report.fundamentalSummary}</p>
              </div>
            )}

            {/* Correlations */}
            {report.correlations?.correlatedAssets?.length > 0 && (
              <div className="rounded-xl p-3 border" style={{ background: "#1e222d", borderColor: "#2a2e39" }}>
                <h4 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#5d6673" }}>Correlations</h4>
                <div className="flex flex-wrap gap-2">
                  {report.correlations.correlatedAssets.slice(0, 8).map((c) => (
                    <div key={c.symbol} className="flex items-center gap-1.5 px-2 py-1 rounded text-xs" style={{ background: "#131722" }}>
                      <span style={{ color: "#b2b5be" }}>{c.symbol}</span>
                      <span style={{ color: c.correlation > 0 ? "#26a69a" : "#ef5350" }}>
                        {c.correlation >= 0 ? "+" : ""}{c.correlation.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data sources */}
            <div className="text-xs" style={{ color: "#5d6673" }}>
              Sources: {report.dataSources.join(", ")}
              {report.unavailableSources.length > 0 && (
                <span className="ml-1" style={{ color: "#ef535080" }}>
                  · Unavailable: {report.unavailableSources.join(", ")}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="p-4 rounded-2xl" style={{ background: "#2a2e39" }}>
              <BookOpen size={28} color="#5d6673" />
            </div>
            <span className="text-sm" style={{ color: "#5d6673" }}>
              Select an asset and run a deep research analysis
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
