"use client";
import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import TechnicalView from "./TechnicalView";
import FundamentalView from "./FundamentalView";
import type { TradingSignal, AssetClass } from "@/types/bot";

interface Props {
  signals: TradingSignal[];
  onGenerateSignal: (asset: string, assetClass: AssetClass, timeframe: string) => Promise<TradingSignal | null>;
}

const ASSET_CLASSES: AssetClass[] = ["CRYPTO", "FOREX", "STOCK", "COMMODITY"];
const TIMEFRAMES = ["5m", "15m", "1h", "4h", "1d"];
const QUICK_ASSETS: Record<AssetClass, string[]> = {
  CRYPTO: ["BTC/USD", "ETH/USD", "SOL/USD", "BNB/USD"],
  FOREX: ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD"],
  STOCK: ["AAPL", "TSLA", "NVDA", "MSFT"],
  COMMODITY: ["GOLD", "OIL", "SILVER", "NG"],
};

type Tab = "technical" | "fundamental";

export default function AnalysisPanel({ signals, onGenerateSignal }: Props) {
  const [asset, setAsset] = useState("BTC/USD");
  const [assetClass, setAssetClass] = useState<AssetClass>("CRYPTO");
  const [timeframe, setTimeframe] = useState("1h");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TradingSignal | null>(null);
  const [tab, setTab] = useState<Tab>("technical");

  // Prefer the most recent signal matching asset
  const latestMatch = signals.find((s) => s.asset === asset);
  const display = result ?? latestMatch ?? null;

  const handleAnalyze = async () => {
    setLoading(true);
    const sig = await onGenerateSignal(asset.trim().toUpperCase(), assetClass, timeframe);
    if (sig) setResult(sig);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="p-3 border-b shrink-0" style={{ borderColor: "#363a45" }}>
        {/* Asset class tabs */}
        <div className="flex gap-1 mb-3">
          {ASSET_CLASSES.map((ac) => (
            <button
              key={ac}
              onClick={() => {
                setAssetClass(ac);
                setAsset(QUICK_ASSETS[ac][0]);
              }}
              className="px-2.5 py-1 rounded text-xs font-medium transition-all"
              style={{
                background: assetClass === ac ? "#2962ff" : "#2a2e39",
                color: assetClass === ac ? "#fff" : "#5d6673",
              }}
            >
              {ac}
            </button>
          ))}
        </div>

        {/* Quick asset buttons */}
        <div className="flex gap-1 mb-3 flex-wrap">
          {QUICK_ASSETS[assetClass].map((a) => (
            <button
              key={a}
              onClick={() => setAsset(a)}
              className="px-2 py-0.5 rounded text-xs transition-all"
              style={{
                background: asset === a ? "#2a2e39" : "transparent",
                color: asset === a ? "#d1d4dc" : "#5d6673",
                border: `1px solid ${asset === a ? "#363a45" : "transparent"}`,
              }}
            >
              {a}
            </button>
          ))}
        </div>

        {/* Input row */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder="e.g. BTC/USD"
              className="w-full px-3 py-1.5 rounded-lg text-xs outline-none border"
              style={{
                background: "#131722",
                borderColor: "#363a45",
                color: "#d1d4dc",
              }}
            />
          </div>

          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className="px-2 py-1.5 rounded-lg text-xs transition-all"
              style={{
                background: timeframe === tf ? "#2a2e39" : "transparent",
                color: timeframe === tf ? "#d1d4dc" : "#5d6673",
                border: `1px solid ${timeframe === tf ? "#363a45" : "transparent"}`,
              }}
            >
              {tf}
            </button>
          ))}

          <button
            onClick={handleAnalyze}
            disabled={loading || !asset.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-50"
            style={{ background: "#2962ff", color: "#fff" }}
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
            Analyze
          </button>
        </div>
      </div>

      {/* Content */}
      {display ? (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b shrink-0" style={{ borderColor: "#363a45" }}>
            {(["technical", "fundamental"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-4 py-2 text-xs font-medium capitalize transition-all"
                style={{
                  color: tab === t ? "#d1d4dc" : "#5d6673",
                  borderBottom: tab === t ? "2px solid #2962ff" : "2px solid transparent",
                }}
              >
                {t}
              </button>
            ))}
            <div className="ml-auto px-3 py-2 flex items-center gap-2 text-xs" style={{ color: "#5d6673" }}>
              <span style={{ color: "#d1d4dc" }}>{display.asset}</span>
              <span>{display.timeframe}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {tab === "technical"
              ? <TechnicalView data={display.technicalData} />
              : display.fundamentalData
              ? <FundamentalView data={display.fundamentalData} />
              : (
                <div className="flex items-center justify-center py-16 text-xs" style={{ color: "#5d6673" }}>
                  No fundamental data available for this asset
                </div>
              )
            }
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="p-4 rounded-2xl" style={{ background: "#2a2e39" }}>
            <Search size={28} color="#5d6673" />
          </div>
          <span className="text-sm" style={{ color: "#5d6673" }}>
            Select an asset and click Analyze to generate a signal
          </span>
        </div>
      )}
    </div>
  );
}
