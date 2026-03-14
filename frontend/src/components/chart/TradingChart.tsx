"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import {
  createChart, IChartApi, ISeriesApi,
  CandlestickSeries, HistogramSeries, LineSeries, AreaSeries, BarSeries,
  ColorType, LineStyle, CrosshairMode,
} from "lightweight-charts";
import { useTradingStore, Drawing, DrawingTool } from "@/store/trading.store";
import { api, endpoints } from "@/lib/api";
import { CandleData } from "@/types";
import {
  calculateEMA, calculateSMA, calculateBollingerBands,
  calculateRSI, calculateMACD, calculateStochastic,
  calculateWilliamsR, calculateATR, calculateHeikinAshi,
} from "@/lib/indicators";

// ── Chart colors per theme ──────────────────────────────────────────────────
function chartColors(theme: "dark" | "light") {
  return theme === "dark"
    ? { bg: "#131722", grid: "#1e222d", text: "#b2b5be", border: "#363a45", cross: "#363a45" }
    : { bg: "#ffffff", grid: "#f0f3fa", text: "#434651", border: "#d1d4dc", cross: "#d1d4dc" };
}

// ── Drawing canvas helpers ──────────────────────────────────────────────────
type Pt = { x: number; y: number };

function drawLine(ctx: CanvasRenderingContext2D, p1: Pt, p2: Pt, color: string, width: number, style: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  if (style === "dashed") ctx.setLineDash([6, 4]);
  else if (style === "dotted") ctx.setLineDash([2, 4]);
  else ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
  ctx.restore();
}

function drawCirclePt(ctx: CanvasRenderingContext2D, p: Pt, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function extendLine(p1: Pt, p2: Pt, canvasW: number, canvasH: number): [Pt, Pt] {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  if (Math.abs(dx) < 0.001) return [{ x: p1.x, y: 0 }, { x: p1.x, y: canvasH }];
  const slope = dy / dx;
  const xStart = -1000, xEnd = canvasW + 1000;
  return [{ x: xStart, y: p1.y + slope * (xStart - p1.x) }, { x: xEnd, y: p1.y + slope * (xEnd - p1.x) }];
}

function rayLine(p1: Pt, p2: Pt, canvasW: number): [Pt, Pt] {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  if (Math.abs(dx) < 0.001) return [p1, { x: p1.x, y: dy > 0 ? 2000 : -2000 }];
  const t = (canvasW + 1000 - p1.x) / dx;
  return [p1, { x: p1.x + dx * t, y: p1.y + dy * t }];
}

function drawFibonacci(ctx: CanvasRenderingContext2D, p1: Pt, p2: Pt, color: string, canvasW: number) {
  const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.272, 1.618];
  const dy = p2.y - p1.y;
  ctx.save();
  ctx.setLineDash([4, 4]);
  levels.forEach((lvl) => {
    const y = p2.y - dy * lvl;
    ctx.strokeStyle = color + "99";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasW, y);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = "10px sans-serif";
    ctx.fillText(`${(lvl * 100).toFixed(1)}%`, 4, y - 3);
  });
  ctx.restore();
}

function drawInfoLine(ctx: CanvasRenderingContext2D, p1: Pt, p2: Pt, color: string, priceDiff: number) {
  drawLine(ctx, p1, p2, color, 1, "solid");
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;
  ctx.save();
  ctx.fillStyle = color + "22";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  const w = 70, h = 18;
  ctx.beginPath();
  ctx.roundRect(midX - w / 2, midY - h / 2 - 12, w, h, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = "10px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${priceDiff >= 0 ? "+" : ""}${priceDiff.toFixed(2)}`, midX, midY - 3);
  ctx.restore();
}

// ── Main component ──────────────────────────────────────────────────────────
export function TradingChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<any>[]>>(new Map());
  const lastCandleRef = useRef<CandleData | null>(null);
  const allCandlesRef = useRef<CandleData[]>([]);
  const drawingStartRef = useRef<{ time: number; price: number } | null>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animFrameRef = useRef<number>(0);

  const {
    selectedAsset, timeframe, prices, theme, chartType, setChartType,
    activeTool, drawings, addDrawing, removeDrawing, selectedDrawingId, setSelectedDrawingId,
    indicators, setShowIndicatorsModal,
  } = useTradingStore();

  const [loading, setLoading] = useState(false);
  const [ohlc, setOhlc] = useState<CandleData | null>(null);

  const colors = chartColors(theme);

  // ── Convert price/time to canvas pixel ──
  const toPixel = useCallback((time: number, price: number): Pt | null => {
    const chart = chartRef.current;
    const series = candleSeriesRef.current;
    if (!chart || !series) return null;
    try {
      const x = chart.timeScale().timeToCoordinate(time as any);
      const y = series.priceToCoordinate(price);
      if (x === null || y === null) return null;
      return { x, y };
    } catch { return null; }
  }, []);

  const toPrice = useCallback((x: number, y: number): { time: number; price: number } | null => {
    const chart = chartRef.current;
    const series = candleSeriesRef.current;
    if (!chart || !series) return null;
    try {
      const time = chart.timeScale().coordinateToTime(x) as any;
      const price = series.coordinateToPrice(y);
      if (time === null || price === null) return null;
      return { time: typeof time === "object" ? time.timestamp ?? 0 : time, price };
    } catch { return null; }
  }, []);

  // ── Render drawings on canvas ──
  const renderDrawings = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const allDrawings = drawings;
    const mouse = mouseRef.current;

    allDrawings.forEach((d) => {
      if (d.points.length < 1) return;
      const p1px = toPixel(d.points[0].time, d.points[0].price);
      const p2px = d.points.length > 1 ? toPixel(d.points[1].time, d.points[1].price) : null;

      if (!p1px) return;
      const color = d.color;
      const lw = d.lineWidth;
      const style = d.style || "solid";
      const W = canvas.width, H = canvas.height;

      switch (d.tool) {
        case "trendline":
          if (p2px) { drawLine(ctx, p1px, p2px, color, lw, style); drawCirclePt(ctx, p1px, color); drawCirclePt(ctx, p2px, color); }
          break;
        case "extended":
          if (p2px) { const [s, e] = extendLine(p1px, p2px, W, H); drawLine(ctx, s, e, color, lw, style); }
          break;
        case "ray":
          if (p2px) { const [s, e] = rayLine(p1px, p2px, W); drawLine(ctx, s, e, color, lw, style); }
          break;
        case "infoline":
          if (p2px) {
            const diff = d.points[1].price - d.points[0].price;
            drawInfoLine(ctx, p1px, p2px, color, diff);
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
            ctx.save();
            ctx.strokeStyle = color; ctx.lineWidth = lw;
            ctx.fillStyle = color + "18";
            const rx = Math.min(p1px.x, p2px.x), ry = Math.min(p1px.y, p2px.y);
            const rw = Math.abs(p2px.x - p1px.x), rh = Math.abs(p2px.y - p1px.y);
            ctx.fillRect(rx, ry, rw, rh);
            ctx.strokeRect(rx, ry, rw, rh);
            ctx.restore();
          }
          break;
        case "circle":
          if (p2px) {
            const r = Math.hypot(p2px.x - p1px.x, p2px.y - p1px.y);
            ctx.save();
            ctx.strokeStyle = color; ctx.lineWidth = lw;
            ctx.fillStyle = color + "18";
            ctx.beginPath(); ctx.arc(p1px.x, p1px.y, r, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke(); ctx.restore();
          }
          break;
        case "fibonacci":
          if (p2px) drawFibonacci(ctx, p1px, p2px, color, W);
          break;
        case "text":
          ctx.save();
          ctx.fillStyle = color;
          ctx.font = "bold 13px sans-serif";
          ctx.fillText(d.text || "Text", p1px.x, p1px.y);
          ctx.restore();
          break;
        case "arrow":
          if (p2px) {
            drawLine(ctx, p1px, p2px, color, lw, style);
            const angle = Math.atan2(p2px.y - p1px.y, p2px.x - p1px.x);
            const aLen = 12;
            ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw;
            ctx.beginPath();
            ctx.moveTo(p2px.x - aLen * Math.cos(angle - 0.4), p2px.y - aLen * Math.sin(angle - 0.4));
            ctx.lineTo(p2px.x, p2px.y);
            ctx.lineTo(p2px.x - aLen * Math.cos(angle + 0.4), p2px.y - aLen * Math.sin(angle + 0.4));
            ctx.stroke(); ctx.restore();
          }
          break;
        case "parallelchannel":
          if (d.points.length >= 3) {
            const p3px = toPixel(d.points[2].time, d.points[2].price);
            if (p2px && p3px) {
              drawLine(ctx, p1px, p2px, color, lw, style);
              const dy = p3px.y - p1px.y;
              drawLine(ctx, { x: p1px.x, y: p1px.y + dy }, { x: p2px.x, y: p2px.y + dy }, color, lw, "dashed");
            }
          } else if (p2px) drawLine(ctx, p1px, p2px, color, lw, style);
          break;
        case "longposition":
          if (p2px) {
            ctx.save();
            ctx.fillStyle = "#26a69a22"; ctx.strokeStyle = "#26a69a"; ctx.lineWidth = lw;
            const rx = Math.min(p1px.x, p2px.x), ry = Math.min(p1px.y, p2px.y);
            ctx.fillRect(rx, ry, Math.abs(p2px.x - p1px.x), Math.abs(p2px.y - p1px.y));
            ctx.strokeRect(rx, ry, Math.abs(p2px.x - p1px.x), Math.abs(p2px.y - p1px.y));
            ctx.fillStyle = "#26a69a"; ctx.font = "10px sans-serif";
            ctx.fillText("LONG", rx + 4, ry + 14);
            ctx.restore();
          }
          break;
        case "shortposition":
          if (p2px) {
            ctx.save();
            ctx.fillStyle = "#ef535022"; ctx.strokeStyle = "#ef5350"; ctx.lineWidth = lw;
            const rx = Math.min(p1px.x, p2px.x), ry = Math.min(p1px.y, p2px.y);
            ctx.fillRect(rx, ry, Math.abs(p2px.x - p1px.x), Math.abs(p2px.y - p1px.y));
            ctx.strokeRect(rx, ry, Math.abs(p2px.x - p1px.x), Math.abs(p2px.y - p1px.y));
            ctx.fillStyle = "#ef5350"; ctx.font = "10px sans-serif";
            ctx.fillText("SHORT", rx + 4, ry + 14);
            ctx.restore();
          }
          break;
      }
    });

    // Preview drawing in progress
    if (drawingStartRef.current && activeTool !== "cursor" && activeTool !== "crosshair") {
      const startPx = toPixel(drawingStartRef.current.time, drawingStartRef.current.price);
      if (startPx) {
        const endPx = { x: mouse.x, y: mouse.y };
        ctx.save(); ctx.globalAlpha = 0.6;
        drawLine(ctx, startPx, endPx, "#2962ff", 1, "dashed");
        drawCirclePt(ctx, startPx, "#2962ff");
        ctx.restore();
      }
    }
  }, [drawings, activeTool, toPixel]);

  // Subscribe to chart range changes to redraw
  const subscribeRedraw = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(renderDrawings);
    });
  }, [renderDrawings]);

  // ── Indicator series management ──
  const rebuildIndicators = useCallback((candles: CandleData[]) => {
    const chart = chartRef.current;
    if (!chart || candles.length === 0) return;

    // Remove old series
    indicatorSeriesRef.current.forEach((seriesList) => {
      seriesList.forEach((s) => { try { chart.removeSeries(s); } catch {} });
    });
    indicatorSeriesRef.current.clear();

    indicators.forEach((ind) => {
      if (!ind.visible) return;
      const color = ind.color || "#2962ff";
      const series: ISeriesApi<any>[] = [];

      const scaleId = ind.pane === "main" ? "right" : `__ind_${ind.id}`;
      const scaleMargins = ind.pane === "main" ? undefined : { top: 0.75, bottom: 0.05 };

      const lineOpts = (c: string) => ({
        color: c, lineWidth: 1 as any,
        priceScaleId: scaleId,
        lastValueVisible: true,
        priceLineVisible: false,
        ...(scaleMargins ? { priceScale: { scaleMargins } } : {}),
      });

      if (ind.pane !== "main") {
        chart.priceScale(scaleId).applyOptions({ scaleMargins: { top: 0.75, bottom: 0.05 }, borderVisible: false });
      }

      switch (ind.type) {
        case "ema": {
          const data = calculateEMA(candles, ind.params.period as number);
          const s = chart.addSeries(LineSeries, lineOpts(color));
          s.setData(data.map((p) => ({ time: p.time as any, value: p.value })));
          series.push(s);
          break;
        }
        case "sma": {
          const data = calculateSMA(candles, ind.params.period as number);
          const s = chart.addSeries(LineSeries, lineOpts(color));
          s.setData(data.map((p) => ({ time: p.time as any, value: p.value })));
          series.push(s);
          break;
        }
        case "wma": {
          // Simple approximation using SMA
          const data = calculateSMA(candles, ind.params.period as number);
          const s = chart.addSeries(LineSeries, lineOpts(color));
          s.setData(data.map((p) => ({ time: p.time as any, value: p.value })));
          series.push(s);
          break;
        }
        case "bb": {
          const data = calculateBollingerBands(candles, ind.params.period as number, ind.params.stddev as number);
          const upper = chart.addSeries(LineSeries, lineOpts(color + "cc"));
          const middle = chart.addSeries(LineSeries, lineOpts(color));
          const lower = chart.addSeries(LineSeries, lineOpts(color + "cc"));
          upper.setData(data.map((p) => ({ time: p.time as any, value: p.upper })));
          middle.setData(data.map((p) => ({ time: p.time as any, value: p.middle })));
          lower.setData(data.map((p) => ({ time: p.time as any, value: p.lower })));
          series.push(upper, middle, lower);
          break;
        }
        case "rsi": {
          const data = calculateRSI(candles, ind.params.period as number);
          chart.priceScale(scaleId).applyOptions({ scaleMargins: { top: 0.75, bottom: 0.05 }, borderVisible: false });
          const s = chart.addSeries(LineSeries, lineOpts(color));
          s.setData(data.map((p) => ({ time: p.time as any, value: p.value })));
          // Overbought/sold lines
          const ob = chart.addSeries(LineSeries, { ...lineOpts("#ef535066"), lineStyle: LineStyle.Dashed });
          const os = chart.addSeries(LineSeries, { ...lineOpts("#26a69a66"), lineStyle: LineStyle.Dashed });
          if (data.length > 0) {
            const range = [data[0], data[data.length - 1]];
            ob.setData(range.map((p) => ({ time: p.time as any, value: 70 })));
            os.setData(range.map((p) => ({ time: p.time as any, value: 30 })));
          }
          series.push(s, ob, os);
          break;
        }
        case "macd": {
          const data = calculateMACD(candles, ind.params.fast as number, ind.params.slow as number, ind.params.signal as number);
          chart.priceScale(scaleId).applyOptions({ scaleMargins: { top: 0.82, bottom: 0.02 }, borderVisible: false });
          const histOpts = { priceScaleId: scaleId, color: "#26a69a", priceLineVisible: false, lastValueVisible: false };
          const histSeries = chart.addSeries(HistogramSeries, histOpts);
          const macdLine = chart.addSeries(LineSeries, lineOpts(color));
          const signalLine = chart.addSeries(LineSeries, lineOpts("#ef5350"));
          histSeries.setData(data.map((p) => ({ time: p.time as any, value: p.histogram, color: p.histogram >= 0 ? "#26a69a88" : "#ef535088" })));
          macdLine.setData(data.map((p) => ({ time: p.time as any, value: p.macd })));
          signalLine.setData(data.map((p) => ({ time: p.time as any, value: p.signal })));
          series.push(histSeries, macdLine, signalLine);
          break;
        }
        case "stoch": {
          const data = calculateStochastic(candles, ind.params.period as number, ind.params.smoothK as number, ind.params.smoothD as number);
          chart.priceScale(scaleId).applyOptions({ scaleMargins: { top: 0.75, bottom: 0.05 }, borderVisible: false });
          const kLine = chart.addSeries(LineSeries, lineOpts(color));
          const dLine = chart.addSeries(LineSeries, lineOpts("#ef5350"));
          kLine.setData(data.map((p) => ({ time: p.time as any, value: p.k })));
          dLine.setData(data.map((p) => ({ time: p.time as any, value: p.d })));
          series.push(kLine, dLine);
          break;
        }
        case "wr": {
          const data = calculateWilliamsR(candles, ind.params.period as number);
          chart.priceScale(scaleId).applyOptions({ scaleMargins: { top: 0.75, bottom: 0.05 }, borderVisible: false });
          const s = chart.addSeries(LineSeries, lineOpts(color));
          s.setData(data.map((p) => ({ time: p.time as any, value: p.value })));
          series.push(s);
          break;
        }
        case "atr": {
          const data = calculateATR(candles, ind.params.period as number);
          chart.priceScale(scaleId).applyOptions({ scaleMargins: { top: 0.78, bottom: 0.02 }, borderVisible: false });
          const s = chart.addSeries(LineSeries, lineOpts(color));
          s.setData(data.map((p) => ({ time: p.time as any, value: p.value })));
          series.push(s);
          break;
        }
      }

      if (series.length > 0) indicatorSeriesRef.current.set(ind.id, series);
    });
  }, [indicators]);

  // ── Load candles ──
  const loadCandles = useCallback(async () => {
    if (!selectedAsset || !candleSeriesRef.current || !chartRef.current) return;
    setLoading(true);
    try {
      const res = await api.get(endpoints.candles(selectedAsset.symbol, timeframe));
      let candles: CandleData[] = res.data;
      if (candles.length === 0) return;

      allCandlesRef.current = candles;
      lastCandleRef.current = candles[candles.length - 1];
      setOhlc(candles[candles.length - 1]);

      // Chart type
      const displayCandles = chartType === "heikin-ashi" ? calculateHeikinAshi(candles) : candles;

      candleSeriesRef.current.setData(
        displayCandles.map((c) => {
          if (chartType === "line" || chartType === "area" || chartType === "baseline") {
            return { time: c.time as any, value: c.close };
          }
          return { time: c.time as any, open: c.open, high: c.high, low: c.low, close: c.close };
        })
      );

      if (volumeSeriesRef.current) {
        volumeSeriesRef.current.setData(
          candles.map((c) => ({
            time: c.time as any, value: c.volume || 0,
            color: c.close >= c.open ? "#26a69a33" : "#ef535033",
          }))
        );
      }

      chartRef.current.timeScale().fitContent();
      rebuildIndicators(candles);
    } catch (err) {
      console.error("Failed to load candles:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedAsset, timeframe, chartType, rebuildIndicators]);

  // ── Create chart ──
  useEffect(() => {
    if (!containerRef.current) return;
    const col = chartColors(theme);

    const seriesOpts: any =
      chartType === "line" ? { color: "#2962ff", lineWidth: 2 }
      : chartType === "area" ? { topColor: "#2962ff44", bottomColor: "#2962ff04", lineColor: "#2962ff", lineWidth: 2 }
      : chartType === "baseline" ? { baseValue: { type: "price", price: 0 }, topLineColor: "#26a69a", bottomLineColor: "#ef5350" }
      : { upColor: "#26a69a", downColor: "#ef5350", borderUpColor: "#26a69a", borderDownColor: "#ef5350", wickUpColor: "#26a69a", wickDownColor: "#ef5350" };

    const SeriesType =
      chartType === "line" ? LineSeries
      : chartType === "area" ? AreaSeries
      : BarSeries; // fallback; candlestick/ha handled below

    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: col.bg }, textColor: col.text, fontSize: 11 },
      grid: { vertLines: { color: col.grid }, horzLines: { color: col.grid } },
      crosshair: { mode: CrosshairMode.Normal, vertLine: { color: col.cross, width: 1, style: LineStyle.Dashed }, horzLine: { color: col.cross, width: 1, style: LineStyle.Dashed } },
      rightPriceScale: { borderColor: col.border },
      timeScale: { borderColor: col.border, timeVisible: true, secondsVisible: false },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    let mainSeries: ISeriesApi<any>;
    if (chartType === "line") mainSeries = chart.addSeries(LineSeries, seriesOpts);
    else if (chartType === "area") mainSeries = chart.addSeries(AreaSeries, seriesOpts);
    else if (chartType === "bar") mainSeries = chart.addSeries(BarSeries, { upColor: "#26a69a", downColor: "#ef5350" });
    else mainSeries = chart.addSeries(CandlestickSeries, { upColor: "#26a69a", downColor: "#ef5350", borderUpColor: "#26a69a", borderDownColor: "#ef5350", wickUpColor: "#26a69a", wickDownColor: "#ef5350" });

    const volSeries = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "volume" });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

    chart.subscribeCrosshairMove((param) => {
      if (param.seriesData) {
        const data = param.seriesData.get(mainSeries) as any;
        if (data) {
          setOhlc({ time: data.time, open: data.open ?? data.value, high: data.high ?? data.value, low: data.low ?? data.value, close: data.close ?? data.value });
        } else if (lastCandleRef.current) setOhlc(lastCandleRef.current);
      }
    });

    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(() => {
        const canvas = canvasRef.current;
        if (canvas && containerRef.current) {
          canvas.width = containerRef.current.clientWidth;
          canvas.height = containerRef.current.clientHeight;
        }
        renderDrawings();
      });
    });

    chartRef.current = chart;
    candleSeriesRef.current = mainSeries;
    volumeSeriesRef.current = volSeries;

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        chart.applyOptions({ width: w, height: h });
        if (canvasRef.current) { canvasRef.current.width = w; canvasRef.current.height = h; }
        renderDrawings();
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(animFrameRef.current);
      indicatorSeriesRef.current.clear();
      try { chart.remove(); } catch {}
    };
  }, [theme, chartType]);

  useEffect(() => { loadCandles(); }, [loadCandles]);

  // Rebuild indicators when they change
  useEffect(() => {
    if (allCandlesRef.current.length > 0) rebuildIndicators(allCandlesRef.current);
  }, [indicators, rebuildIndicators]);

  // Redraw drawings when they change
  useEffect(() => {
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(renderDrawings);
  }, [drawings, renderDrawings]);

  // Real-time price update
  useEffect(() => {
    if (!selectedAsset || !candleSeriesRef.current) return;
    const priceData = prices[selectedAsset.symbol];
    if (!priceData) return;

    const now = Math.floor(Date.now() / 1000);
    const last = lastCandleRef.current;
    const updated: CandleData = {
      time: now, open: last?.close || priceData.price,
      high: Math.max(last?.close || priceData.price, priceData.price),
      low: Math.min(last?.close || priceData.price, priceData.price),
      close: priceData.price,
    };

    try {
      if (chartType === "line" || chartType === "area" || chartType === "baseline") {
        candleSeriesRef.current.update({ time: now as any, value: priceData.price });
      } else {
        candleSeriesRef.current.update({ time: now as any, open: updated.open, high: updated.high, low: updated.low, close: updated.close });
      }
      setOhlc(updated);
    } catch {}
  }, [prices, selectedAsset, chartType]);

  // ── Canvas mouse handlers ──
  const needsTwoPoints = (t: DrawingTool) =>
    ["trendline", "ray", "extended", "infoline", "rectangle", "circle", "fibonacci", "fibchannel",
     "fibarc", "fibwedge", "fibtime", "arrow", "parallelchannel", "longposition", "shortposition", "forecast", "measure"].includes(t);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === "cursor") { setSelectedDrawingId(null); return; }
    if (activeTool === "crosshair") return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pos = toPrice(x, y);
    if (!pos) return;

    if (activeTool === "hline" || activeTool === "vline" || activeTool === "text" || activeTool === "note") {
      const id = `d_${Date.now()}`;
      addDrawing({
        id, tool: activeTool, points: [pos],
        color: "#2962ff", lineWidth: 1, style: "solid",
        text: activeTool === "text" ? "Text" : undefined,
      });
      return;
    }

    if (needsTwoPoints(activeTool)) {
      if (!drawingStartRef.current) {
        drawingStartRef.current = pos;
      } else {
        const id = `d_${Date.now()}`;
        addDrawing({
          id, tool: activeTool,
          points: [drawingStartRef.current, pos],
          color: activeTool === "longposition" ? "#26a69a" : activeTool === "shortposition" ? "#ef5350" : "#2962ff",
          lineWidth: 1, style: "solid",
        });
        drawingStartRef.current = null;
        renderDrawings();
      }
    }
  }, [activeTool, toPrice, addDrawing, renderDrawings, setSelectedDrawingId]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (drawingStartRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(renderDrawings);
    }
  }, [renderDrawings]);

  const handleCanvasMouseLeave = useCallback(() => {
    mouseRef.current = { x: 0, y: 0 };
  }, []);

  // Cursor style
  const getCursor = () => {
    if (activeTool === "cursor") return "default";
    if (activeTool === "crosshair") return "crosshair";
    if (activeTool === "eraser") return "cell";
    if (activeTool === "text" || activeTool === "callout") return "text";
    return "crosshair";
  };

  const priceData = selectedAsset ? prices[selectedAsset.symbol] : null;
  const isPositive = (priceData?.changePercent ?? 0) >= 0;

  // Chart type options
  const CHART_TYPES = [
    { id: "candlestick", label: "Candlestick", icon: "🕯️" },
    { id: "bar", label: "Bar", icon: "▌" },
    { id: "line", label: "Line", icon: "∿" },
    { id: "area", label: "Area", icon: "◿" },
    { id: "heikin-ashi", label: "Heikin Ashi", icon: "🕯" },
  ] as const;

  const [showChartTypeMenu, setShowChartTypeMenu] = useState(false);

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      style={{ background: "var(--tv-chart-bg)" }}
    >
      {/* Top bar */}
      {selectedAsset && (
        <div
          className="flex items-center gap-2 border-b px-3 py-1 shrink-0"
          style={{ borderColor: "var(--tv-border)", background: "var(--tv-bg2)" }}
        >
          {/* OHLC */}
          {ohlc && (
            <div className="flex items-center gap-2.5 text-[11px]">
              <span style={{ color: "var(--tv-text)" }}>O <span className="font-mono" style={{ color: "var(--tv-text-light)" }}>{ohlc.open?.toFixed(2)}</span></span>
              <span style={{ color: "var(--tv-text)" }}>H <span className="font-mono text-[#26a69a]">{ohlc.high?.toFixed(2)}</span></span>
              <span style={{ color: "var(--tv-text)" }}>L <span className="font-mono text-[#ef5350]">{ohlc.low?.toFixed(2)}</span></span>
              <span style={{ color: "var(--tv-text)" }}>C <span className={`font-mono ${isPositive ? "text-[#26a69a]" : "text-[#ef5350]"}`}>{ohlc.close?.toFixed(2)}</span></span>
            </div>
          )}

          {/* Active indicators labels */}
          {indicators.filter((i) => i.visible).map((ind) => (
            <span key={ind.id} className="text-[11px] font-medium px-1.5 py-0.5 rounded" style={{ color: ind.color, background: (ind.color || "#2962ff") + "22" }}>
              {ind.label}({Object.values(ind.params).join(",")})
            </span>
          ))}

          <div className="flex-1" />

          {/* Chart type selector */}
          <div className="relative">
            <button
              onClick={() => setShowChartTypeMenu(!showChartTypeMenu)}
              className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] border transition-colors"
              style={{ borderColor: "var(--tv-border)", color: "var(--tv-text)", background: "var(--tv-bg3)" }}
            >
              <span>{CHART_TYPES.find((t) => t.id === chartType)?.icon}</span>
              <span>{CHART_TYPES.find((t) => t.id === chartType)?.label}</span>
            </button>
            {showChartTypeMenu && (
              <div
                className="absolute top-full right-0 mt-1 z-20 rounded-lg border py-1 shadow-xl min-w-[140px]"
                style={{ background: "var(--tv-bg2)", borderColor: "var(--tv-border)" }}
              >
                {CHART_TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setChartType(t.id); setShowChartTypeMenu(false); }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-[var(--tv-bg3)]"
                    style={{ color: chartType === t.id ? "#2962ff" : "var(--tv-text-light)" }}
                  >
                    <span>{t.icon}</span><span>{t.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Indicators button */}
          <button
            onClick={() => setShowIndicatorsModal(true)}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] border transition-colors hover:bg-[var(--tv-bg3)]"
            style={{ borderColor: "var(--tv-border)", color: "var(--tv-text)" }}
          >
            <span>f(x)</span>
            {indicators.length > 0 && <span className="text-[#2962ff] font-bold">{indicators.length}</span>}
          </button>

          {loading && <span className="text-[10px]" style={{ color: "var(--tv-muted)" }}>Loading…</span>}
        </div>
      )}

      {selectedAsset ? (
        <div ref={containerRef} className="relative flex-1 overflow-hidden">
          {/* lightweight-charts renders into this div */}
          {/* Drawing canvas overlay */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 z-10"
            style={{ cursor: getCursor(), pointerEvents: activeTool === "cursor" ? "none" : "all" }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={handleCanvasMouseLeave}
          />
        </div>
      ) : (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-4">📊</div>
            <div className="text-lg font-medium mb-1" style={{ color: "var(--tv-text-light)" }}>Select a symbol to start</div>
            <div className="text-sm" style={{ color: "var(--tv-muted)" }}>Click the symbol selector or pick from the watchlist</div>
          </div>
        </div>
      )}
    </div>
  );
}
