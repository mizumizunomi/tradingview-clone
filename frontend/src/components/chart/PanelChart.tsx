"use client";
import { useEffect, useRef, useState } from "react";
import {
  createChart, IChartApi, ISeriesApi,
  CandlestickSeries, HistogramSeries,
  ColorType, LineStyle, CrosshairMode,
} from "lightweight-charts";
import { useTradingStore } from "@/store/trading.store";
import { api, endpoints } from "@/lib/api";

interface PanelChartProps {
  symbol: string;
  timeframe: string;
}

function getBarTime(tf: string): number {
  const intervals: Record<string, number> = { '1m':60,'5m':300,'15m':900,'30m':1800,'1h':3600,'4h':14400,'1D':86400,'1W':604800 };
  const sec = intervals[tf] || 3600;
  return Math.floor(Date.now() / 1000 / sec) * sec;
}

export function PanelChart({ symbol, timeframe }: PanelChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);
  const currentBarRef = useRef<{time:number, open:number, high:number, low:number} | null>(null);
  const { theme, prices, chartSettings } = useTradingStore();
  const [loading, setLoading] = useState(true);

  // Create chart on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const bg = chartSettings?.bgColor ?? (theme === "dark" ? "#131722" : "#ffffff");
    const textCol = theme === "dark" ? "#b2b5be" : "#434651";
    const grid = chartSettings?.gridColor ?? (theme === "dark" ? "#1e222d" : "#f0f3fa");
    const border = theme === "dark" ? "#363a45" : "#d1d4dc";

    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: bg }, textColor: textCol, fontSize: 10 },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      crosshair: { mode: CrosshairMode.Normal, vertLine: { color: border, width: 1, style: LineStyle.Dashed }, horzLine: { color: border, width: 1, style: LineStyle.Dashed } },
      rightPriceScale: { borderColor: border },
      timeScale: { borderColor: border, timeVisible: true, secondsVisible: false },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const upColor = chartSettings?.upColor ?? "#26a69a";
    const downColor = chartSettings?.downColor ?? "#ef5350";
    const series = chart.addSeries(CandlestickSeries, {
      upColor, downColor,
      borderUpColor: upColor, borderDownColor: downColor,
      wickUpColor: upColor, wickDownColor: downColor,
    });

    chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

    chartRef.current = chart;
    seriesRef.current = series;

    let resizeTid: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return;
      clearTimeout(resizeTid);
      resizeTid = setTimeout(() => {
        if (!containerRef.current) return;
        chart.applyOptions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
      }, 100);
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      clearTimeout(resizeTid);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [theme]);

  // Load candles when symbol or timeframe changes
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || !symbol) return;
    setLoading(true);
    api.get(endpoints.candles(symbol, timeframe))
      .then((res) => {
        const candles = res.data;
        if (!candles.length || !seriesRef.current) return;
        seriesRef.current.setData(
          candles.map((c: any) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close }))
        );
        currentBarRef.current = null;
        chartRef.current?.timeScale().fitContent();
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [symbol, timeframe]);

  // Live price update for last candle
  useEffect(() => {
    const pd = prices[symbol];
    if (!pd || !seriesRef.current) return;

    const barTime = getBarTime(timeframe);

    if (!currentBarRef.current || currentBarRef.current.time !== barTime) {
      currentBarRef.current = { time: barTime, open: pd.price, high: pd.price, low: pd.price };
    } else {
      currentBarRef.current.high = Math.max(currentBarRef.current.high, pd.price);
      currentBarRef.current.low = Math.min(currentBarRef.current.low, pd.price);
    }

    const bar = currentBarRef.current;
    try {
      seriesRef.current.update({
        time: barTime as any,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: pd.price,
      });
    } catch {}
  }, [prices, symbol, timeframe]);

  return (
    <div className="relative h-full w-full min-h-0">
      <div
        ref={containerRef}
        className="h-full w-full transition-opacity duration-200 ease-out"
        style={{ opacity: loading ? 0.5 : 1 }}
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ background: "var(--tv-bg)" }}>
          <div className="h-5 w-5 rounded-full border-2 border-[var(--tv-border)] border-t-[var(--tv-blue)] animate-spin" />
        </div>
      )}
      <div className="absolute top-1 left-2 text-[10px] font-bold pointer-events-none" style={{ color: "var(--tv-muted)" }}>
        {symbol} · {timeframe}
      </div>
    </div>
  );
}
