"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import {
  createChart, IChartApi, ISeriesApi,
  CandlestickSeries, HistogramSeries, LineSeries, AreaSeries, BarSeries,
  ColorType, LineStyle, CrosshairMode, PriceScaleMode,
} from "lightweight-charts";
import { useTradingStore, Drawing, DrawingTool } from "@/store/trading.store";
import { api, endpoints } from "@/lib/api";
import { CandleData } from "@/types";
import {
  calculateEMA, calculateSMA, calculateBollingerBands,
  calculateRSI, calculateMACD, calculateStochastic,
  calculateWilliamsR, calculateATR, calculateHeikinAshi,
} from "@/lib/indicators";
import { ChartContextMenu } from "./ChartContextMenu";
import { ReplayControls } from "./ReplayControls";
import { ObjectTreePanel } from "./ObjectTreePanel";
import { Maximize2, Camera, BarChart2, Table2 } from "lucide-react";

// ── Drawing helpers ─────────────────────────────────────────────────────────
type Pt = { x: number; y: number };

function drawLine(ctx: CanvasRenderingContext2D, p1: Pt, p2: Pt, color: string, width: number, style: string) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width;
  if (style === "dashed") ctx.setLineDash([6, 4]);
  else if (style === "dotted") ctx.setLineDash([2, 4]);
  else ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); ctx.restore();
}
function drawDot(ctx: CanvasRenderingContext2D, p: Pt, color: string) {
  ctx.save(); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function extendLine(p1: Pt, p2: Pt, W: number, H: number): [Pt, Pt] {
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  if (Math.abs(dx) < 0.001) return [{ x: p1.x, y: 0 }, { x: p1.x, y: H }];
  const slope = dy / dx;
  return [{ x: -1000, y: p1.y + slope * (-1000 - p1.x) }, { x: W + 1000, y: p1.y + slope * (W + 1000 - p1.x) }];
}
function rayLine(p1: Pt, p2: Pt, W: number): [Pt, Pt] {
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const t = Math.abs(dx) < 0.001 ? 2000 : (W + 1000 - p1.x) / dx;
  return [p1, { x: p1.x + dx * t, y: p1.y + dy * t }];
}
function drawFib(ctx: CanvasRenderingContext2D, p1: Pt, p2: Pt, color: string, W: number) {
  const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.272, 1.618];
  const dy = p2.y - p1.y;
  ctx.save(); ctx.setLineDash([4, 4]);
  levels.forEach((lvl) => {
    const y = p2.y - dy * lvl;
    ctx.strokeStyle = color + "99"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    ctx.fillStyle = color; ctx.font = "10px sans-serif"; ctx.fillText(`${(lvl * 100).toFixed(1)}%`, 4, y - 3);
  });
  ctx.restore();
}

// ── Main component ──────────────────────────────────────────────────────────
export function TradingChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<any>[]>>(new Map());
  const lastCandleRef = useRef<CandleData | null>(null);
  const currentBarRef = useRef<{ time: number; open: number; high: number; low: number } | null>(null);
  const allCandlesRef = useRef<CandleData[]>([]);
  const drawingStartRef = useRef<{ time: number; price: number } | null>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const frameRef = useRef(0);

  const {
    selectedAsset, timeframe, prices, theme, chartType, setChartType,
    activeTool, drawings, addDrawing, removeDrawing, selectedDrawingId, setSelectedDrawingId,
    indicators, setShowIndicatorsModal,
    chartSettings, setChartSettings,
    replayMode, replayIndex,
    showObjectTree,
    addToast, setAlertModalContext,
  } = useTradingStore();

  const [loading, setLoading] = useState(false);
  const [ohlc, setOhlc] = useState<CandleData | null>(null);
  const [legendValues, setLegendValues] = useState<{ label: string; value: string; color: string }[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; price: number; time: number } | null>(null);
  const [showChartTypeMenu, setShowChartTypeMenu] = useState(false);
  const [showDataWindow, setShowDataWindow] = useState(false);

  const fmtOHLC = (p: number | undefined) => {
    if (!p && p !== 0) return "—";
    if (selectedAsset?.category === "FOREX" || p < 1) return p.toFixed(5);
    if (p < 10) return p.toFixed(4);
    return p.toFixed(2);
  };

  // ── Bar time alignment helper ──
  const getBarTime = (tf: string): number => {
    const intervals: Record<string, number> = { '1m': 60, '5m': 300, '15m': 900, '30m': 1800, '1h': 3600, '4h': 14400, '1D': 86400, '1W': 604800 };
    const sec = intervals[tf] || 3600;
    return Math.floor(Date.now() / 1000 / sec) * sec;
  };

  // ── Coordinate helpers ──
  const toPixel = useCallback((time: number, price: number): Pt | null => {
    try {
      const x = chartRef.current?.timeScale().timeToCoordinate(time as any);
      const y = mainSeriesRef.current?.priceToCoordinate(price);
      if (x == null || y == null) return null;
      return { x, y };
    } catch { return null; }
  }, []);

  const toPrice = useCallback((x: number, y: number): { time: number; price: number } | null => {
    try {
      const time = chartRef.current?.timeScale().coordinateToTime(x) as any;
      const price = mainSeriesRef.current?.coordinateToPrice(y);
      if (time == null || price == null) return null;
      return { time: typeof time === "object" ? time.timestamp ?? 0 : time, price };
    } catch { return null; }
  }, []);

  // ── Render drawings ──
  const renderDrawings = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const W = canvas.width, H = canvas.height;
    const mouse = mouseRef.current;

    drawings.forEach((d) => {
      if (d.visible === false) return;
      const p1px = d.points[0] ? toPixel(d.points[0].time, d.points[0].price) : null;
      const p2px = d.points[1] ? toPixel(d.points[1].time, d.points[1].price) : null;
      if (!p1px) return;
      const { color, lineWidth: lw, style = "solid" } = d;
      const isSelected = d.id === selectedDrawingId;

      if (isSelected) {
        ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 6; }

      switch (d.tool) {
        case "trendline":
          if (p2px) { drawLine(ctx, p1px, p2px, color, lw, style); drawDot(ctx, p1px, color); drawDot(ctx, p2px, color); }
          break;
        case "extended":
          if (p2px) { const [s, e] = extendLine(p1px, p2px, W, H); drawLine(ctx, s, e, color, lw, style); }
          break;
        case "ray":
          if (p2px) { const [s, e] = rayLine(p1px, p2px, W); drawLine(ctx, s, e, color, lw, style); }
          break;
        case "infoline":
          if (p2px) {
            drawLine(ctx, p1px, p2px, color, lw, style);
            const diff = d.points[1].price - d.points[0].price;
            const midX = (p1px.x + p2px.x) / 2, midY = (p1px.y + p2px.y) / 2;
            ctx.save(); ctx.fillStyle = color + "22"; ctx.strokeStyle = color; ctx.lineWidth = 1;
            const tw = 70;
            ctx.beginPath(); (ctx as any).roundRect?.(midX - tw / 2, midY - 18, tw, 16, 3); ctx.fill(); ctx.stroke();
            ctx.fillStyle = color; ctx.font = "10px monospace"; ctx.textAlign = "center";
            ctx.fillText(`${diff >= 0 ? "+" : ""}${diff.toFixed(2)}`, midX, midY - 5);
            ctx.restore();
          }
          break;
        case "hline":
          drawLine(ctx, { x: 0, y: p1px.y }, { x: W, y: p1px.y }, color, lw, style);
          ctx.save(); ctx.fillStyle = color; ctx.font = "10px monospace"; ctx.textAlign = "right";
          ctx.fillText(d.points[0].price.toFixed(4), W - 4, p1px.y - 3); ctx.restore();
          break;
        case "vline":
          drawLine(ctx, { x: p1px.x, y: 0 }, { x: p1px.x, y: H }, color, lw, style);
          break;
        case "rectangle":
          if (p2px) {
            const rx = Math.min(p1px.x, p2px.x), ry = Math.min(p1px.y, p2px.y);
            const rw = Math.abs(p2px.x - p1px.x), rh = Math.abs(p2px.y - p1px.y);
            ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.fillStyle = color + "18";
            ctx.fillRect(rx, ry, rw, rh); ctx.strokeRect(rx, ry, rw, rh); ctx.restore();
          }
          break;
        case "circle":
          if (p2px) {
            const r = Math.hypot(p2px.x - p1px.x, p2px.y - p1px.y);
            ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.fillStyle = color + "18";
            ctx.beginPath(); ctx.arc(p1px.x, p1px.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
          }
          break;
        case "fibonacci":
          if (p2px) drawFib(ctx, p1px, p2px, color, W);
          break;
        case "text":
          ctx.save(); ctx.fillStyle = color; ctx.font = "bold 13px sans-serif";
          ctx.fillText(d.text || "Text", p1px.x, p1px.y); ctx.restore();
          break;
        case "arrow":
          if (p2px) {
            drawLine(ctx, p1px, p2px, color, lw, style);
            const angle = Math.atan2(p2px.y - p1px.y, p2px.x - p1px.x);
            ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw;
            ctx.beginPath();
            ctx.moveTo(p2px.x - 12 * Math.cos(angle - 0.4), p2px.y - 12 * Math.sin(angle - 0.4));
            ctx.lineTo(p2px.x, p2px.y);
            ctx.lineTo(p2px.x - 12 * Math.cos(angle + 0.4), p2px.y - 12 * Math.sin(angle + 0.4));
            ctx.stroke(); ctx.restore();
          }
          break;
        case "longposition":
          if (p2px) {
            const rx = Math.min(p1px.x, p2px.x), ry = Math.min(p1px.y, p2px.y);
            const rw = Math.abs(p2px.x - p1px.x), rh = Math.abs(p2px.y - p1px.y);
            ctx.save(); ctx.fillStyle = "#26a69a22"; ctx.strokeStyle = "#26a69a"; ctx.lineWidth = lw;
            ctx.fillRect(rx, ry, rw, rh); ctx.strokeRect(rx, ry, rw, rh);
            ctx.fillStyle = "#26a69a"; ctx.font = "10px sans-serif"; ctx.fillText("LONG", rx + 4, ry + 14); ctx.restore();
          }
          break;
        case "shortposition":
          if (p2px) {
            const rx = Math.min(p1px.x, p2px.x), ry = Math.min(p1px.y, p2px.y);
            const rw = Math.abs(p2px.x - p1px.x), rh = Math.abs(p2px.y - p1px.y);
            ctx.save(); ctx.fillStyle = "#ef535022"; ctx.strokeStyle = "#ef5350"; ctx.lineWidth = lw;
            ctx.fillRect(rx, ry, rw, rh); ctx.strokeRect(rx, ry, rw, rh);
            ctx.fillStyle = "#ef5350"; ctx.font = "10px sans-serif"; ctx.fillText("SHORT", rx + 4, ry + 14); ctx.restore();
          }
          break;
        case "parallelchannel":
          if (p2px) {
            drawLine(ctx, p1px, p2px, color, lw, style);
            if (d.points[2]) {
              const p3px = toPixel(d.points[2].time, d.points[2].price);
              if (p3px) {
                const dy = p3px.y - p1px.y;
                drawLine(ctx, { x: p1px.x, y: p1px.y + dy }, { x: p2px.x, y: p2px.y + dy }, color, lw, "dashed");
              }
            }
          }
          break;
      }

      if (isSelected) { ctx.restore(); }
    });

    // Preview
    if (drawingStartRef.current && activeTool !== "cursor" && activeTool !== "crosshair") {
      const sp = toPixel(drawingStartRef.current.time, drawingStartRef.current.price);
      if (sp) {
        ctx.save(); ctx.globalAlpha = 0.6;
        drawLine(ctx, sp, mouse, "#2962ff", 1, "dashed");
        drawDot(ctx, sp, "#2962ff");
        ctx.restore();
      }
    }
  }, [drawings, activeTool, selectedDrawingId, toPixel]);

  // ── Indicator legend from crosshair ──
  const updateLegend = useCallback((time: number) => {
    const candles = allCandlesRef.current;
    const idx = candles.findIndex((c) => c.time === time);
    if (idx < 0) { setLegendValues([]); return; }
    const vals: { label: string; value: string; color: string }[] = [];
    indicators.filter((i) => i.visible).forEach((ind) => {
      const color = ind.color || "#2962ff";
      try {
        if (ind.type === "ema") {
          const data = calculateEMA(candles.slice(0, idx + 1), ind.params.period as number);
          if (data.length > 0) vals.push({ label: `EMA(${ind.params.period})`, value: data[data.length - 1].value.toFixed(2), color });
        } else if (ind.type === "sma") {
          const data = calculateSMA(candles.slice(0, idx + 1), ind.params.period as number);
          if (data.length > 0) vals.push({ label: `SMA(${ind.params.period})`, value: data[data.length - 1].value.toFixed(2), color });
        } else if (ind.type === "rsi") {
          const data = calculateRSI(candles.slice(0, idx + 1), ind.params.period as number);
          if (data.length > 0) vals.push({ label: `RSI(${ind.params.period})`, value: data[data.length - 1].value.toFixed(1), color });
        } else if (ind.type === "bb") {
          const data = calculateBollingerBands(candles.slice(0, idx + 1), ind.params.period as number, ind.params.stddev as number);
          if (data.length > 0) {
            const last = data[data.length - 1];
            vals.push({ label: `BB(${ind.params.period}) U`, value: last.upper.toFixed(2), color });
            vals.push({ label: `M`, value: last.middle.toFixed(2), color: color + "aa" });
            vals.push({ label: `L`, value: last.lower.toFixed(2), color });
          }
        } else if (ind.type === "macd") {
          const data = calculateMACD(candles.slice(0, idx + 1), ind.params.fast as number, ind.params.slow as number, ind.params.signal as number);
          if (data.length > 0) {
            const last = data[data.length - 1];
            vals.push({ label: `MACD`, value: last.macd.toFixed(2), color });
            vals.push({ label: `Sig`, value: last.signal.toFixed(2), color: "#ef5350" });
          }
        }
      } catch {}
    });
    setLegendValues(vals);
  }, [indicators]);

  // ── Rebuild indicators ──
  const rebuildIndicators = useCallback((candles: CandleData[]) => {
    const chart = chartRef.current;
    if (!chart || candles.length === 0) return;
    indicatorSeriesRef.current.forEach((sl) => sl.forEach((s) => { try { chart.removeSeries(s); } catch {} }));
    indicatorSeriesRef.current.clear();

    indicators.forEach((ind) => {
      if (!ind.visible) return;
      const color = ind.color || "#2962ff";
      const scaleId = ind.pane === "main" ? "right" : `__ind_${ind.id}`;
      if (ind.pane !== "main") {
        const margins = ind.pane === "macd" ? { top: 0.82, bottom: 0.02 } : { top: 0.75, bottom: 0.05 };
        chart.priceScale(scaleId).applyOptions({ scaleMargins: margins, borderVisible: false });
      }
      const lo = (c: string) => ({ color: c, lineWidth: 1 as any, priceScaleId: scaleId, lastValueVisible: true, priceLineVisible: false });
      const series: ISeriesApi<any>[] = [];

      if (ind.type === "ema") {
        const s = chart.addSeries(LineSeries, lo(color));
        s.setData(calculateEMA(candles, ind.params.period as number).map((p) => ({ time: p.time as any, value: p.value })));
        series.push(s);
      } else if (ind.type === "sma" || ind.type === "wma") {
        const s = chart.addSeries(LineSeries, lo(color));
        s.setData(calculateSMA(candles, ind.params.period as number).map((p) => ({ time: p.time as any, value: p.value })));
        series.push(s);
      } else if (ind.type === "bb") {
        const data = calculateBollingerBands(candles, ind.params.period as number, ind.params.stddev as number);
        [chart.addSeries(LineSeries, lo(color + "cc")), chart.addSeries(LineSeries, lo(color)), chart.addSeries(LineSeries, lo(color + "cc"))].forEach((s, i) => {
          s.setData(data.map((p) => ({ time: p.time as any, value: [p.upper, p.middle, p.lower][i] })));
          series.push(s);
        });
      } else if (ind.type === "rsi") {
        const s = chart.addSeries(LineSeries, lo(color));
        s.setData(calculateRSI(candles, ind.params.period as number).map((p) => ({ time: p.time as any, value: p.value })));
        const data = calculateRSI(candles, ind.params.period as number);
        if (data.length > 1) {
          const ob = chart.addSeries(LineSeries, { ...lo("#ef535066"), lineStyle: LineStyle.Dashed });
          const os = chart.addSeries(LineSeries, { ...lo("#26a69a66"), lineStyle: LineStyle.Dashed });
          ob.setData([data[0], data[data.length - 1]].map((p) => ({ time: p.time as any, value: 70 })));
          os.setData([data[0], data[data.length - 1]].map((p) => ({ time: p.time as any, value: 30 })));
          series.push(s, ob, os);
        } else series.push(s);
      } else if (ind.type === "macd") {
        const data = calculateMACD(candles, ind.params.fast as number, ind.params.slow as number, ind.params.signal as number);
        const hist = chart.addSeries(HistogramSeries, { priceScaleId: scaleId, priceLineVisible: false, lastValueVisible: false });
        const ml = chart.addSeries(LineSeries, lo(color));
        const sl2 = chart.addSeries(LineSeries, lo("#ef5350"));
        hist.setData(data.map((p) => ({ time: p.time as any, value: p.histogram, color: p.histogram >= 0 ? "#26a69a88" : "#ef535088" })));
        ml.setData(data.map((p) => ({ time: p.time as any, value: p.macd })));
        sl2.setData(data.map((p) => ({ time: p.time as any, value: p.signal })));
        series.push(hist, ml, sl2);
      } else if (ind.type === "stoch") {
        const data = calculateStochastic(candles, ind.params.period as number, ind.params.smoothK as number, ind.params.smoothD as number);
        const k = chart.addSeries(LineSeries, lo(color));
        const d2 = chart.addSeries(LineSeries, lo("#ef5350"));
        k.setData(data.map((p) => ({ time: p.time as any, value: p.k })));
        d2.setData(data.map((p) => ({ time: p.time as any, value: p.d })));
        series.push(k, d2);
      } else if (ind.type === "wr") {
        const s = chart.addSeries(LineSeries, lo(color));
        s.setData(calculateWilliamsR(candles, ind.params.period as number).map((p) => ({ time: p.time as any, value: p.value })));
        series.push(s);
      } else if (ind.type === "atr") {
        const s = chart.addSeries(LineSeries, lo(color));
        s.setData(calculateATR(candles, ind.params.period as number).map((p) => ({ time: p.time as any, value: p.value })));
        series.push(s);
      }

      if (series.length > 0) indicatorSeriesRef.current.set(ind.id, series);
    });
  }, [indicators]);

  // ── Apply chart settings ──
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.applyOptions({
      layout: { background: { type: ColorType.Solid, color: chartSettings.bgColor }, textColor: theme === "dark" ? "#b2b5be" : "#434651" },
      grid: { vertLines: { color: chartSettings.gridColor }, horzLines: { color: chartSettings.gridColor } },
    });
    if (mainSeriesRef.current && (chartType === "candlestick" || chartType === "heikin-ashi")) {
      mainSeriesRef.current.applyOptions({
        upColor: chartSettings.upColor, downColor: chartSettings.downColor,
        wickUpColor: chartSettings.wickUpColor, wickDownColor: chartSettings.wickDownColor,
        borderUpColor: chartSettings.upColor, borderDownColor: chartSettings.downColor,
      });
    }
    try {
      const mode = chartSettings.logScale ? PriceScaleMode.Logarithmic : chartSettings.percentScale ? PriceScaleMode.Percentage : PriceScaleMode.Normal;
      chart.priceScale("right").applyOptions({ mode });
    } catch {}
  }, [chartSettings, theme]);

  // ── Load candles ──
  const loadCandles = useCallback(async () => {
    if (!selectedAsset || !mainSeriesRef.current || !chartRef.current) return;
    setLoading(true);
    try {
      const res = await api.get(endpoints.candles(selectedAsset.symbol, timeframe));
      let candles: CandleData[] = res.data;
      if (candles.length === 0) return;
      allCandlesRef.current = candles;
      lastCandleRef.current = candles[candles.length - 1];
      currentBarRef.current = null;
      setOhlc(candles[candles.length - 1]);

      const display = chartType === "heikin-ashi" ? calculateHeikinAshi(candles) : candles;
      const isLineType = chartType === "line" || chartType === "area" || chartType === "baseline";

      mainSeriesRef.current.setData(
        display.map((c) => isLineType ? { time: c.time as any, value: c.close } : { time: c.time as any, open: c.open, high: c.high, low: c.low, close: c.close })
      );
      volumeSeriesRef.current?.setData(candles.map((c) => ({ time: c.time as any, value: c.volume || 0, color: c.close >= c.open ? "#26a69a33" : "#ef535033" })));
      chartRef.current.timeScale().fitContent();
      rebuildIndicators(candles);
    } catch (err) { console.error("Failed to load candles:", err); }
    finally { setLoading(false); }
  }, [selectedAsset, timeframe, chartType, rebuildIndicators]);

  // ── Create chart (only when chartType changes; theme/settings applied in separate effect) ──
  useEffect(() => {
    if (!containerRef.current) return;
    const state = useTradingStore.getState();
    const t = state.theme;
    const cs = state.chartSettings;
    const bg = cs.bgColor;
    const textCol = t === "dark" ? "#b2b5be" : "#434651";
    const grid = cs.gridColor;
    const border = t === "dark" ? "#363a45" : "#d1d4dc";

    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: bg }, textColor: textCol, fontSize: 11 },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      crosshair: { mode: CrosshairMode.Normal, vertLine: { color: border, width: 1, style: LineStyle.Dashed }, horzLine: { color: border, width: 1, style: LineStyle.Dashed } },
      rightPriceScale: { borderColor: border },
      timeScale: { borderColor: border, timeVisible: true, secondsVisible: false },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    let mainSeries: ISeriesApi<any>;
    if (chartType === "line") mainSeries = chart.addSeries(LineSeries, { color: "#2962ff", lineWidth: 2 as any });
    else if (chartType === "area") mainSeries = chart.addSeries(AreaSeries, { topColor: "#2962ff44", bottomColor: "#2962ff04", lineColor: "#2962ff", lineWidth: 2 as any });
    else if (chartType === "bar") mainSeries = chart.addSeries(BarSeries, { upColor: cs.upColor, downColor: cs.downColor });
    else mainSeries = chart.addSeries(CandlestickSeries, { upColor: cs.upColor, downColor: cs.downColor, borderUpColor: cs.upColor, borderDownColor: cs.downColor, wickUpColor: cs.wickUpColor, wickDownColor: cs.wickDownColor });

    const vol = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "volume" });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

    chart.subscribeCrosshairMove((param) => {
      if (param.seriesData) {
        const d = param.seriesData.get(mainSeries) as any;
        if (d) {
          const volData = param.seriesData.get(vol) as any;
          const c = { time: d.time, open: d.open ?? d.value, high: d.high ?? d.value, low: d.low ?? d.value, close: d.close ?? d.value, volume: volData?.value };
          setOhlc(c);
          updateLegend(typeof d.time === "number" ? d.time : 0);
        } else if (lastCandleRef.current) { setOhlc(lastCandleRef.current); setLegendValues([]); }
      }
    });

    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        const c = canvasRef.current;
        if (c && containerRef.current) { c.width = containerRef.current.clientWidth; c.height = containerRef.current.clientHeight; }
        renderDrawings();
      });
    });

    chartRef.current = chart;
    mainSeriesRef.current = mainSeries;
    volumeSeriesRef.current = vol;

    let resizeTid: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return;
      clearTimeout(resizeTid);
      resizeTid = setTimeout(() => {
        if (!containerRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        chart.applyOptions({ width: w, height: h });
        if (canvasRef.current) {
          canvasRef.current.width = w;
          canvasRef.current.height = h;
        }
        requestAnimationFrame(renderDrawings);
      }, 120);
    });
    ro.observe(containerRef.current);
    return () => {
      ro.disconnect();
      clearTimeout(resizeTid);
      cancelAnimationFrame(frameRef.current);
      indicatorSeriesRef.current.clear();
      try { chart.remove(); } catch {}
    };
  }, [chartType]);

  useEffect(() => { loadCandles(); }, [loadCandles]);
  useEffect(() => { if (allCandlesRef.current.length > 0) rebuildIndicators(allCandlesRef.current); }, [indicators, rebuildIndicators]);
  useEffect(() => { cancelAnimationFrame(frameRef.current); frameRef.current = requestAnimationFrame(renderDrawings); }, [drawings, renderDrawings, selectedDrawingId]);

  // ── Replay mode ──
  useEffect(() => {
    if (!replayMode || !mainSeriesRef.current) return;
    const candles = allCandlesRef.current;
    const slice = candles.slice(0, replayIndex);
    if (slice.length === 0) return;
    const isLineType = chartType === "line" || chartType === "area" || chartType === "baseline";
    try {
      mainSeriesRef.current.setData(
        slice.map((c) => isLineType ? { time: c.time as any, value: c.close } : { time: c.time as any, open: c.open, high: c.high, low: c.low, close: c.close })
      );
    } catch {}
  }, [replayIndex, replayMode, chartType]);

  // ── Real-time price ──
  useEffect(() => {
    if (!selectedAsset || !mainSeriesRef.current || replayMode) return;
    const pd = prices[selectedAsset.symbol];
    if (!pd) return;

    const barTime = getBarTime(timeframe);
    const lastCandle = lastCandleRef.current;

    if (!currentBarRef.current || currentBarRef.current.time !== barTime) {
      // New timeframe period: initialize bar from last candle's close
      currentBarRef.current = {
        time: barTime,
        open: lastCandle?.close ?? pd.price,
        high: pd.price,
        low: pd.price,
      };
    } else {
      // Same period: accumulate high/low
      currentBarRef.current.high = Math.max(currentBarRef.current.high, pd.price);
      currentBarRef.current.low = Math.min(currentBarRef.current.low, pd.price);
    }

    const bar = currentBarRef.current;
    try {
      const isLineType = chartType === "line" || chartType === "area" || chartType === "baseline";
      if (isLineType) {
        mainSeriesRef.current.update({ time: barTime as any, value: pd.price });
      } else {
        mainSeriesRef.current.update({
          time: barTime as any,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: pd.price,
        });
      }
      setOhlc({ time: barTime, open: bar.open, high: bar.high, low: bar.low, close: pd.price, volume: lastCandle?.volume });
    } catch {}
  }, [prices, selectedAsset, chartType, replayMode, timeframe]);

  // ── Canvas handlers ──
  const needsTwoPts = (t: DrawingTool) =>
    ["trendline","ray","extended","infoline","rectangle","circle","fibonacci","fibchannel","fibarc","arrow","parallelchannel","longposition","shortposition","forecast","measure"].includes(t);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    if (activeTool === "cursor") { setSelectedDrawingId(null); return; }
    if (activeTool === "crosshair") return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const pos = toPrice(e.clientX - rect.left, e.clientY - rect.top);
    if (!pos) return;

    if (activeTool === "hline" || activeTool === "vline" || activeTool === "text") {
      addDrawing({ id: `d_${Date.now()}`, tool: activeTool, points: [pos], color: "#2962ff", lineWidth: 1, style: "solid", text: activeTool === "text" ? "Text" : undefined });
      return;
    }
    if (needsTwoPts(activeTool)) {
      if (!drawingStartRef.current) { drawingStartRef.current = pos; }
      else {
        const toolColor = activeTool === "longposition" ? "#26a69a" : activeTool === "shortposition" ? "#ef5350" : "#2962ff";
        addDrawing({ id: `d_${Date.now()}`, tool: activeTool, points: [drawingStartRef.current, pos], color: toolColor, lineWidth: 1, style: "solid" });
        drawingStartRef.current = null;
        renderDrawings();
      }
    }
  }, [activeTool, toPrice, addDrawing, renderDrawings, setSelectedDrawingId]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (drawingStartRef.current) { cancelAnimationFrame(frameRef.current); frameRef.current = requestAnimationFrame(renderDrawings); }
  }, [renderDrawings]);

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const pos = toPrice(e.clientX - rect.left, e.clientY - rect.top);
    setContextMenu({ x: e.clientX, y: e.clientY, price: pos?.price || 0, time: pos?.time || 0 });
  }, [toPrice]);

  // ── Auto-fit ──
  const handleAutoFit = () => chartRef.current?.timeScale().fitContent();

  // ── Screenshot ──
  const handleScreenshot = () => {
    const chartCanvas = containerRef.current?.querySelector("canvas");
    if (!chartCanvas) return;
    const a = document.createElement("a");
    a.href = chartCanvas.toDataURL("image/png");
    a.download = `${selectedAsset?.symbol || "chart"}_${Date.now()}.png`;
    a.click();
    addToast({ type: "success", message: "Screenshot saved" });
  };

  const getCursor = () => {
    if (activeTool === "cursor") return "default";
    if (activeTool === "crosshair") return "crosshair";
    if (activeTool === "text") return "text";
    if (activeTool === "eraser") return "cell";
    return "crosshair";
  };

  const CHART_TYPES = [
    { id: "candlestick", label: "Candlestick", icon: "🕯️" },
    { id: "bar", label: "Bar", icon: "▌" },
    { id: "line", label: "Line", icon: "∿" },
    { id: "area", label: "Area", icon: "◿" },
    { id: "heikin-ashi", label: "Heikin Ashi", icon: "🕯" },
  ] as const;

  const priceData = selectedAsset ? prices[selectedAsset.symbol] : null;
  const isPositive = (priceData?.changePercent ?? 0) >= 0;

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background: chartSettings.bgColor }}>
      {/* Top bar */}
      {selectedAsset && (
        <div className="relative z-10 flex items-center gap-2 border-b px-3 py-1 shrink-0"
          style={{ borderColor: "var(--tv-border)", background: "var(--tv-bg2)" }}>
          <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-x-auto">
          {/* OHLC */}
          {ohlc && (
            <div className="flex items-center gap-2.5 text-[11px] shrink-0">
              <span style={{ color: "var(--tv-text)" }}>O <span className="font-mono" style={{ color: "var(--tv-text-light)" }}>{fmtOHLC(ohlc.open)}</span></span>
              <span style={{ color: "var(--tv-text)" }}>H <span className="font-mono text-[#26a69a]">{fmtOHLC(ohlc.high)}</span></span>
              <span style={{ color: "var(--tv-text)" }}>L <span className="font-mono text-[#ef5350]">{fmtOHLC(ohlc.low)}</span></span>
              <span style={{ color: "var(--tv-text)" }}>C <span className={`font-mono ${isPositive ? "text-[#26a69a]" : "text-[#ef5350]"}`}>{fmtOHLC(ohlc.close)}</span></span>
            </div>
          )}

          {/* Indicator legend */}
          {legendValues.map((lv, i) => (
            <span key={i} className="text-[11px] font-mono shrink-0" style={{ color: lv.color }}>
              {lv.label}: {lv.value}
            </span>
          ))}

          {/* Active indicators labels */}
          {indicators.filter((i) => i.visible && !legendValues.find((l) => l.label.startsWith(i.label))).map((ind) => (
            <span key={ind.id} className="text-[11px] font-medium px-1 py-0.5 rounded shrink-0"
              style={{ color: ind.color, background: (ind.color || "#2962ff") + "22" }}>
              {ind.label}({Object.values(ind.params).join(",")})
            </span>
          ))}
          </div>

          {/* Toolbar buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Auto-fit */}
            <button onClick={handleAutoFit} title="Auto fit" className="p-1 rounded transition-colors hover:bg-[var(--tv-bg3)]" style={{ color: "var(--tv-muted)" }}>
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            {/* Screenshot */}
            <button onClick={handleScreenshot} title="Save screenshot" className="p-1 rounded transition-colors hover:bg-[var(--tv-bg3)]" style={{ color: "var(--tv-muted)" }}>
              <Camera className="h-3.5 w-3.5" />
            </button>
            {/* Chart type */}
            <div className="relative">
              <button onClick={() => setShowChartTypeMenu(!showChartTypeMenu)} className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] border"
                style={{ borderColor: "var(--tv-border)", color: "var(--tv-text)", background: "var(--tv-bg3)" }}>
                <span>{CHART_TYPES.find((t) => t.id === chartType)?.icon}</span>
                <span>{CHART_TYPES.find((t) => t.id === chartType)?.label}</span>
              </button>
              {showChartTypeMenu && (
                <div className="absolute top-full right-0 mt-1 z-50 rounded-lg border py-1 shadow-xl min-w-[140px]"
                  style={{ background: "var(--tv-bg2)", borderColor: "var(--tv-border)" }}>
                  {CHART_TYPES.map((t) => (
                    <button key={t.id} onClick={() => { setChartType(t.id); setShowChartTypeMenu(false); }}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-[var(--tv-bg3)]"
                      style={{ color: chartType === t.id ? "#2962ff" : "var(--tv-text-light)" }}>
                      <span>{t.icon}</span><span>{t.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Data Window */}
            <button onClick={() => setShowDataWindow(!showDataWindow)} title="Data Window" className={`p-1 rounded transition-colors hover:bg-[var(--tv-bg3)]`} style={{ color: showDataWindow ? "#2962ff" : "var(--tv-muted)" }}>
              <Table2 className="h-3.5 w-3.5" />
            </button>
            {/* Indicators */}
            <button onClick={() => setShowIndicatorsModal(true)} className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] border hover:bg-[var(--tv-bg3)]"
              style={{ borderColor: "var(--tv-border)", color: "var(--tv-text)" }}>
              <BarChart2 className="h-3 w-3" />
              f(x)
              {indicators.length > 0 && <span className="text-[#2962ff] font-bold">{indicators.length}</span>}
            </button>
          </div>
          {loading && <span className="text-[10px] shrink-0" style={{ color: "var(--tv-muted)" }}>Loading…</span>}
        </div>
      )}

      <div className="relative flex-1 overflow-hidden min-h-0">
        <div
          ref={containerRef}
          className="absolute inset-0 transition-opacity duration-200 ease-out"
          style={{ opacity: loading ? 0.5 : 1 }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-10"
          style={{ cursor: getCursor(), pointerEvents: activeTool === "cursor" ? "none" : "auto" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => { mouseRef.current = { x: 0, y: 0 }; }}
          onContextMenu={handleContextMenu}
        />
        {/* Loading overlay */}
        {loading && (
          <div
            className="absolute inset-0 z-30 flex items-center justify-center transition-opacity duration-200 ease-out"
            style={{ background: "var(--tv-bg)" }}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 rounded-full border-2 border-[var(--tv-border)] border-t-[var(--tv-blue)] animate-spin" />
              <span className="text-xs" style={{ color: "var(--tv-muted)" }}>Loading chart…</span>
            </div>
          </div>
        )}
        {/* Replay controls */}
        <ReplayControls totalCandles={allCandlesRef.current.length} />
        {/* Object tree (inside chart area) */}
        {showObjectTree && <ObjectTreePanel />}
        {/* Data Window */}
        {showDataWindow && ohlc && (
          <div className="absolute top-2 right-14 z-20 rounded-lg border px-3 py-2 text-[11px] font-mono shadow-xl"
            style={{ background: "var(--tv-bg2)88", borderColor: "var(--tv-border)", backdropFilter: "blur(4px)" }}>
            <div className="text-[10px] font-bold mb-1" style={{ color: "var(--tv-muted)" }}>DATA WINDOW</div>
            {[
              { label: "O", value: fmtOHLC(ohlc.open), color: "var(--tv-text-light)" },
              { label: "H", value: fmtOHLC(ohlc.high), color: "#26a69a" },
              { label: "L", value: fmtOHLC(ohlc.low), color: "#ef5350" },
              { label: "C", value: fmtOHLC(ohlc.close), color: ohlc.close >= ohlc.open ? "#26a69a" : "#ef5350" },
              { label: "V", value: ohlc.volume ? ohlc.volume.toLocaleString() : "—", color: "var(--tv-text)" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <span style={{ color: "var(--tv-muted)" }}>{label}</span>
                <span style={{ color }}>{value}</span>
              </div>
            ))}
          </div>
        )}
        {/* No-asset overlay */}
        {!selectedAsset && (
          <div className="absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-200" style={{ background: "var(--tv-bg)" }}>
            <div className="text-center px-6">
              <div className="text-5xl mb-4 opacity-90">📊</div>
              <div className="text-base font-semibold mb-1.5" style={{ color: "var(--tv-text-light)" }}>Select a symbol to start</div>
              <div className="text-sm" style={{ color: "var(--tv-muted)" }}>Click the symbol selector or pick from the watchlist</div>
            </div>
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ChartContextMenu
          x={contextMenu.x} y={contextMenu.y}
          price={contextMenu.price} time={contextMenu.time}
          onClose={() => setContextMenu(null)}
          onScreenshot={handleScreenshot}
        />
      )}
    </div>
  );
}
