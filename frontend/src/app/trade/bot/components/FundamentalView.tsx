"use client";
import { Newspaper, Lightbulb, BarChart2 } from "lucide-react";
import type { FundamentalAnalysis } from "@/types/bot";

interface Props {
  data: FundamentalAnalysis;
}

function sentimentColor(score: number): string {
  if (score > 0.1) return "#26a69a";
  if (score < -0.1) return "#ef5350";
  return "#f59e0b";
}

export default function FundamentalView({ data }: Props) {
  const compColor = sentimentColor(data.compositeScore);
  const sentColor = sentimentColor(data.sentimentScore);

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Scores */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-3 border" style={{ background: "#131722", borderColor: "#2a2e39" }}>
          <div className="text-xs mb-1" style={{ color: "#5d6673" }}>Composite Score</div>
          <div className="text-lg font-bold" style={{ color: compColor }}>
            {data.compositeScore >= 0 ? "+" : ""}{data.compositeScore.toFixed(3)}
          </div>
        </div>
        <div className="rounded-xl p-3 border" style={{ background: "#131722", borderColor: "#2a2e39" }}>
          <div className="text-xs mb-1" style={{ color: "#5d6673" }}>Sentiment Score</div>
          <div className="text-lg font-bold" style={{ color: sentColor }}>
            {data.sentimentScore >= 0 ? "+" : ""}{data.sentimentScore.toFixed(3)}
          </div>
        </div>
      </div>

      {/* Catalysts */}
      {data.catalysts.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb size={13} color="#f59e0b" />
            <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#5d6673" }}>
              Catalysts
            </h4>
          </div>
          <div className="flex flex-col gap-1.5">
            {data.catalysts.map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: "#131722" }}>
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "#f59e0b" }} />
                <span style={{ color: "#b2b5be" }}>{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* News */}
      {data.newsItems.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Newspaper size={13} color="#5d6673" />
            <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#5d6673" }}>
              Recent News
            </h4>
          </div>
          <div className="flex flex-col gap-2">
            {data.newsItems.slice(0, 6).map((item, i) => {
              const s = sentimentColor(item.sentiment);
              return (
                <div key={i} className="px-3 py-2 rounded-lg border" style={{ background: "#131722", borderColor: "#2a2e39" }}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs" style={{ color: "#5d6673" }}>{item.source}</span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: `${s}15`, color: s }}
                    >
                      {item.sentiment >= 0 ? "+" : ""}{item.sentiment.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "#b2b5be" }}>{item.headline}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Market metrics */}
      {data.marketMetrics && Object.keys(data.marketMetrics).length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <BarChart2 size={13} color="#5d6673" />
            <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#5d6673" }}>
              Market Metrics
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(data.marketMetrics).slice(0, 8).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs px-3 py-1.5 rounded-lg" style={{ background: "#131722" }}>
                <span style={{ color: "#5d6673" }}>{k}</span>
                <span style={{ color: "#d1d4dc" }}>{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
