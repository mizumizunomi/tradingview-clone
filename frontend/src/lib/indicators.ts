import { CandleData } from "@/types";

export interface IndicatorPoint {
  time: number;
  value: number;
}

export interface BollingerPoint {
  time: number;
  upper: number;
  middle: number;
  lower: number;
}

export interface MACDPoint {
  time: number;
  macd: number;
  signal: number;
  histogram: number;
}

export interface StochasticPoint {
  time: number;
  k: number;
  d: number;
}

export function calculateEMA(candles: CandleData[], period: number): IndicatorPoint[] {
  if (candles.length < period) return [];
  const k = 2 / (period + 1);
  const result: IndicatorPoint[] = [];
  let ema = candles.slice(0, period).reduce((s, c) => s + c.close, 0) / period;
  result.push({ time: candles[period - 1].time as number, value: ema });
  for (let i = period; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
    result.push({ time: candles[i].time as number, value: ema });
  }
  return result;
}

export function calculateSMA(candles: CandleData[], period: number): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    const avg = candles.slice(i - period + 1, i + 1).reduce((s, c) => s + c.close, 0) / period;
    result.push({ time: candles[i].time as number, value: avg });
  }
  return result;
}

export function calculateBollingerBands(candles: CandleData[], period = 20, stdDev = 2): BollingerPoint[] {
  const result: BollingerPoint[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1).map((c) => c.close);
    const mean = slice.reduce((s, v) => s + v, 0) / period;
    const variance = slice.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / period;
    const sd = Math.sqrt(variance);
    result.push({
      time: candles[i].time as number,
      upper: mean + stdDev * sd,
      middle: mean,
      lower: mean - stdDev * sd,
    });
  }
  return result;
}

export function calculateRSI(candles: CandleData[], period = 14): IndicatorPoint[] {
  if (candles.length < period + 1) return [];
  const result: IndicatorPoint[] = [];
  let avgGain = 0, avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff > 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }
  avgGain /= period;
  avgLoss /= period;

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push({ time: candles[period].time as number, value: 100 - 100 / (1 + rs) });

  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs2 = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push({ time: candles[i].time as number, value: 100 - 100 / (1 + rs2) });
  }
  return result;
}

export function calculateMACD(
  candles: CandleData[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MACDPoint[] {
  const fast = calculateEMA(candles, fastPeriod);
  const slow = calculateEMA(candles, slowPeriod);

  // Align fast and slow EMAs by time
  const slowTimes = new Set(slow.map((p) => p.time));
  const fastMap = new Map(fast.map((p) => [p.time, p.value]));

  const macdLine = slow
    .filter((p) => fastMap.has(p.time))
    .map((p) => ({ time: p.time, value: (fastMap.get(p.time) || 0) - p.value }));

  if (macdLine.length < signalPeriod) return [];

  const k = 2 / (signalPeriod + 1);
  let signal = macdLine.slice(0, signalPeriod).reduce((s, p) => s + p.value, 0) / signalPeriod;
  const result: MACDPoint[] = [];

  for (let i = signalPeriod - 1; i < macdLine.length; i++) {
    if (i === signalPeriod - 1) {
      result.push({ time: macdLine[i].time, macd: macdLine[i].value, signal, histogram: macdLine[i].value - signal });
    } else {
      signal = macdLine[i].value * k + signal * (1 - k);
      result.push({ time: macdLine[i].time, macd: macdLine[i].value, signal, histogram: macdLine[i].value - signal });
    }
  }
  return result;
}

export function calculateStochastic(candles: CandleData[], period = 14, smoothK = 3, smoothD = 3): StochasticPoint[] {
  const result: StochasticPoint[] = [];
  const rawK: IndicatorPoint[] = [];

  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    const low = Math.min(...slice.map((c) => c.low ?? c.close));
    const high = Math.max(...slice.map((c) => c.high ?? c.close));
    const k = high === low ? 50 : ((candles[i].close - low) / (high - low)) * 100;
    rawK.push({ time: candles[i].time as number, value: k });
  }

  // Smooth K
  const smoothedK: IndicatorPoint[] = [];
  for (let i = smoothK - 1; i < rawK.length; i++) {
    const avg = rawK.slice(i - smoothK + 1, i + 1).reduce((s, p) => s + p.value, 0) / smoothK;
    smoothedK.push({ time: rawK[i].time, value: avg });
  }

  // D = SMA of smoothed K
  for (let i = smoothD - 1; i < smoothedK.length; i++) {
    const d = smoothedK.slice(i - smoothD + 1, i + 1).reduce((s, p) => s + p.value, 0) / smoothD;
    result.push({ time: smoothedK[i].time, k: smoothedK[i].value, d });
  }
  return result;
}

export function calculateWilliamsR(candles: CandleData[], period = 14): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    const high = Math.max(...slice.map((c) => c.high ?? c.close));
    const low = Math.min(...slice.map((c) => c.low ?? c.close));
    const wr = high === low ? -50 : ((high - candles[i].close) / (high - low)) * -100;
    result.push({ time: candles[i].time as number, value: wr });
  }
  return result;
}

export function calculateATR(candles: CandleData[], period = 14): IndicatorPoint[] {
  if (candles.length < 2) return [];
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    const hl = (c.high ?? c.close) - (c.low ?? c.close);
    const hpc = Math.abs((c.high ?? c.close) - prev.close);
    const lpc = Math.abs((c.low ?? c.close) - prev.close);
    trs.push(Math.max(hl, hpc, lpc));
  }

  const result: IndicatorPoint[] = [];
  let atr = trs.slice(0, period).reduce((s, v) => s + v, 0) / period;
  result.push({ time: candles[period].time as number, value: atr });
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
    result.push({ time: candles[i + 1].time as number, value: atr });
  }
  return result;
}

export function calculateHeikinAshi(candles: CandleData[]): CandleData[] {
  const result: CandleData[] = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const haClose = (c.open + (c.high ?? c.close) + (c.low ?? c.close) + c.close) / 4;
    const haOpen = i === 0
      ? (c.open + c.close) / 2
      : (result[i - 1].open + result[i - 1].close) / 2;
    const haHigh = Math.max(c.high ?? c.close, haOpen, haClose);
    const haLow = Math.min(c.low ?? c.close, haOpen, haClose);
    result.push({ time: c.time, open: haOpen, high: haHigh, low: haLow, close: haClose, volume: c.volume });
  }
  return result;
}
