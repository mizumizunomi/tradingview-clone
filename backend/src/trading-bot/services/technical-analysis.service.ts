import { Injectable, Logger } from '@nestjs/common';
import { ExternalDataService } from './external-data.service';
import { OHLCVCandle } from '../interfaces/provider.interface';
import {
  TechnicalAnalysisResult,
  IndicatorSnapshot,
  AssetClass,
} from '../interfaces/signal.interface';

@Injectable()
export class TechnicalAnalysisService {
  private readonly logger = new Logger(TechnicalAnalysisService.name);

  constructor(private readonly externalData: ExternalDataService) {}

  async analyze(
    symbol: string,
    assetClass: AssetClass,
    timeframe = '1h',
  ): Promise<TechnicalAnalysisResult> {
    const candles = await this.externalData.getCandles(symbol, timeframe, assetClass, 300);

    if (candles.length < 30) {
      this.logger.warn(`Insufficient candles for ${symbol} ${timeframe}: ${candles.length}`);
      return this.emptyResult(symbol, timeframe);
    }

    const indicators: IndicatorSnapshot[] = [];

    // Fetch API-based indicators in parallel (TwelveData), fall back to local
    const [rsiApi, macdApi, bbApi, ema12Api, ema26Api, ema50Api, atrApi, adxApi, stochApi] =
      await Promise.all([
        this.externalData.getRSI(symbol, timeframe, 14).catch(() => null),
        this.externalData.getMACD(symbol, timeframe).catch(() => null),
        this.externalData.getBollingerBands(symbol, timeframe).catch(() => null),
        this.externalData.getEMA(symbol, timeframe, 12).catch(() => null),
        this.externalData.getEMA(symbol, timeframe, 26).catch(() => null),
        this.externalData.getEMA(symbol, timeframe, 50).catch(() => null),
        this.externalData.getATR(symbol, timeframe, 14).catch(() => null),
        this.externalData.getADX(symbol, timeframe).catch(() => null),
        this.externalData.getStoch(symbol, timeframe).catch(() => null),
      ]);

    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const volumes = candles.map((c) => c.volume);
    const currentPrice = closes[closes.length - 1];

    // ── RSI(14) ──────────────────────────────────────────────────────────────
    const rsi = rsiApi ?? this.computeRSI(closes, 14);
    if (rsi !== null) {
      indicators.push({
        name: 'RSI(14)',
        value: rsi,
        signal: rsi >= 70 ? 'BEARISH' : rsi <= 30 ? 'BULLISH' : 'NEUTRAL',
        score: rsi >= 80 ? -1 : rsi >= 70 ? -0.7 : rsi >= 60 ? -0.3
             : rsi <= 20 ? 1 : rsi <= 30 ? 0.7 : rsi <= 40 ? 0.3 : 0,
      });
    }

    // ── Stochastic RSI ───────────────────────────────────────────────────────
    const stochRsi = this.computeStochRSI(closes);
    if (stochRsi !== null) {
      indicators.push({
        name: 'StochRSI',
        value: [stochRsi.k, stochRsi.d],
        signal: stochRsi.k >= 80 ? 'BEARISH' : stochRsi.k <= 20 ? 'BULLISH' : 'NEUTRAL',
        score: stochRsi.k >= 80 ? -0.6 : stochRsi.k <= 20 ? 0.6
             : stochRsi.k > stochRsi.d ? 0.2 : -0.2,
      });
    }

    // ── Williams %R ──────────────────────────────────────────────────────────
    const wr = this.computeWilliamsR(highs, lows, closes, 14);
    if (wr !== null) {
      indicators.push({
        name: 'Williams %R',
        value: wr,
        signal: wr >= -20 ? 'BEARISH' : wr <= -80 ? 'BULLISH' : 'NEUTRAL',
        score: wr >= -20 ? -0.6 : wr <= -80 ? 0.6 : (wr + 50) / 50 * -0.3,
      });
    }

    // ── CCI(20) ──────────────────────────────────────────────────────────────
    const cci = this.computeCCI(highs, lows, closes, 20);
    if (cci !== null) {
      indicators.push({
        name: 'CCI(20)',
        value: cci,
        signal: cci >= 100 ? 'BULLISH' : cci <= -100 ? 'BEARISH' : 'NEUTRAL',
        score: cci >= 200 ? 0.8 : cci >= 100 ? 0.4
             : cci <= -200 ? -0.8 : cci <= -100 ? -0.4 : cci / 250,
      });
    }

    // ── ROC(12) ──────────────────────────────────────────────────────────────
    const roc = this.computeROC(closes, 12);
    if (roc !== null) {
      indicators.push({
        name: 'ROC(12)',
        value: roc,
        signal: roc > 3 ? 'BULLISH' : roc < -3 ? 'BEARISH' : 'NEUTRAL',
        score: Math.max(-1, Math.min(1, roc / 10)),
      });
    }

    // ── MACD ─────────────────────────────────────────────────────────────────
    const macd = macdApi ?? this.computeMACD(closes, 12, 26, 9);
    if (macd) {
      const macdNorm = Math.abs(macd.macd) > 0 ? macd.histogram / Math.abs(macd.macd) : 0;
      indicators.push({
        name: 'MACD(12,26,9)',
        value: [macd.macd, macd.signal, macd.histogram],
        signal: macd.histogram > 0 && macd.macd > macd.signal ? 'BULLISH'
               : macd.histogram < 0 && macd.macd < macd.signal ? 'BEARISH' : 'NEUTRAL',
        score: Math.max(-1, Math.min(1, macdNorm * 2)),
      });
    }

    // ── Bollinger Bands ───────────────────────────────────────────────────────
    const bb = bbApi ?? this.computeBollingerBands(closes, 20, 2);
    if (bb) {
      const bbRange = bb.upper - bb.lower;
      const bbPos = bbRange > 0 ? (currentPrice - bb.lower) / bbRange : 0.5;
      const bbWidth = bbRange / bb.middle; // volatility measure
      indicators.push({
        name: 'BB(20,2)',
        value: [bb.upper, bb.middle, bb.lower],
        signal: bbPos >= 0.85 ? 'BEARISH' : bbPos <= 0.15 ? 'BULLISH' : 'NEUTRAL',
        score: bbPos >= 0.85 ? -0.7 : bbPos <= 0.15 ? 0.7
             : bbWidth < 0.02 ? 0 : (0.5 - bbPos) * 1.2, // squeeze = no signal
      });
    }

    // ── Keltner Channels ─────────────────────────────────────────────────────
    const kc = this.computeKeltnerChannels(closes, highs, lows, 20, 2);
    if (kc) {
      indicators.push({
        name: 'Keltner(20)',
        value: [kc.upper, kc.middle, kc.lower],
        signal: currentPrice >= kc.upper ? 'BEARISH' : currentPrice <= kc.lower ? 'BULLISH' : 'NEUTRAL',
        score: currentPrice >= kc.upper ? -0.5 : currentPrice <= kc.lower ? 0.5 : 0,
      });
    }

    // ── ATR ──────────────────────────────────────────────────────────────────
    const atr = atrApi ?? this.computeATR(candles, 14) ?? 0;

    // ── ADX(14) ──────────────────────────────────────────────────────────────
    const { adx, plusDI, minusDI } = this.computeFullADX(candles, 14);
    const adxVal = adxApi ?? adx;
    if (adxVal !== null) {
      const diScore = plusDI > minusDI ? 0.3 : -0.3;
      indicators.push({
        name: 'ADX(14)',
        value: adxVal,
        signal: adxVal >= 25 ? (plusDI > minusDI ? 'BULLISH' : 'BEARISH') : 'NEUTRAL',
        score: adxVal >= 25 ? diScore : 0,
      });
    }

    // ── Parabolic SAR ─────────────────────────────────────────────────────────
    const psar = this.computeParabolicSAR(highs, lows);
    if (psar !== null) {
      const sarSignal = currentPrice > psar ? 'BULLISH' : 'BEARISH';
      indicators.push({
        name: 'Parabolic SAR',
        value: psar,
        signal: sarSignal,
        score: currentPrice > psar ? 0.5 : -0.5,
      });
    }

    // ── EMA trend alignment ───────────────────────────────────────────────────
    const ema12 = ema12Api ?? this.computeEMA(closes, 12);
    const ema26 = ema26Api ?? this.computeEMA(closes, 26);
    const ema50 = ema50Api ?? this.computeEMA(closes, 50);
    const sma20 = this.computeSMA(closes, 20);
    const sma50 = this.computeSMA(closes, 50);
    const sma200 = this.computeSMA(closes, 200);

    if (ema12 && ema26 && ema50) {
      const score =
        currentPrice > ema12 && ema12 > ema26 && ema26 > ema50 ? 0.8 :
        currentPrice < ema12 && ema12 < ema26 && ema26 < ema50 ? -0.8 :
        currentPrice > ema26 && ema12 > ema26 ? 0.4 :
        currentPrice < ema26 && ema12 < ema26 ? -0.4 : 0;
      indicators.push({
        name: 'EMA(12/26/50)',
        value: [ema12, ema26, ema50],
        signal: score > 0.3 ? 'BULLISH' : score < -0.3 ? 'BEARISH' : 'NEUTRAL',
        score,
      });
    }

    if (sma200 && sma50 && sma20) {
      const goldCross = sma50 > sma200 && sma20 > sma50;
      const deathCross = sma50 < sma200 && sma20 < sma50;
      indicators.push({
        name: 'SMA(20/50/200)',
        value: [sma20, sma50, sma200],
        signal: goldCross ? 'BULLISH' : deathCross ? 'BEARISH' : 'NEUTRAL',
        score: goldCross ? 0.7 : deathCross ? -0.7
             : currentPrice > sma200 ? 0.3 : -0.3,
      });
    }

    // ── Stochastic ────────────────────────────────────────────────────────────
    const stoch = stochApi ?? this.computeStoch(highs, lows, closes, 14);
    if (stoch) {
      indicators.push({
        name: 'Stoch(14)',
        value: [stoch.k, stoch.d],
        signal: stoch.k >= 80 ? 'BEARISH' : stoch.k <= 20 ? 'BULLISH' : 'NEUTRAL',
        score: stoch.k >= 80 ? -0.5 : stoch.k <= 20 ? 0.5
             : stoch.k > stoch.d ? 0.15 : -0.15,
      });
    }

    // ── Ichimoku Cloud ───────────────────────────────────────────────────────
    const ichimoku = this.computeIchimoku(highs, lows, closes);
    if (ichimoku) {
      const { tenkan, kijun, senkouA, senkouB, chikou } = ichimoku;
      const aboveCloud = currentPrice > Math.max(senkouA, senkouB);
      const belowCloud = currentPrice < Math.min(senkouA, senkouB);
      const bullishCloud = senkouA > senkouB;
      let ichiScore = aboveCloud ? 0.6 : belowCloud ? -0.6 : 0;
      if (tenkan > kijun) ichiScore += 0.2;
      if (tenkan < kijun) ichiScore -= 0.2;
      if (chikou > currentPrice) ichiScore += 0.1;
      if (chikou < currentPrice) ichiScore -= 0.1;
      indicators.push({
        name: 'Ichimoku',
        value: [tenkan, kijun, senkouA, senkouB],
        signal: ichiScore > 0.2 ? 'BULLISH' : ichiScore < -0.2 ? 'BEARISH' : 'NEUTRAL',
        score: Math.max(-1, Math.min(1, ichiScore)),
      });
    }

    // ── OBV ──────────────────────────────────────────────────────────────────
    const obv = this.computeOBV(closes, volumes);
    const obvScore = this.computeOBVScore(obv, closes);
    indicators.push({
      name: 'OBV',
      value: obv[obv.length - 1] ?? 0,
      signal: obvScore > 0.1 ? 'BULLISH' : obvScore < -0.1 ? 'BEARISH' : 'NEUTRAL',
      score: obvScore,
    });

    // ── VWAP ─────────────────────────────────────────────────────────────────
    const vwap = this.computeVWAP(candles);
    if (vwap) {
      indicators.push({
        name: 'VWAP',
        value: vwap,
        signal: currentPrice > vwap * 1.001 ? 'BULLISH' : currentPrice < vwap * 0.999 ? 'BEARISH' : 'NEUTRAL',
        score: currentPrice > vwap ? Math.min(0.4, (currentPrice / vwap - 1) * 10)
             : Math.max(-0.4, (currentPrice / vwap - 1) * 10),
      });
    }

    // ── Volume SMA ────────────────────────────────────────────────────────────
    const volSma = this.computeVolumeSMA(volumes, 20);
    const currentVol = volumes[volumes.length - 1];
    if (volSma && currentVol) {
      const volRatio = currentVol / volSma;
      const lastPriceChange = closes[closes.length - 1] - closes[closes.length - 2];
      const volConfirm = volRatio > 1.5
        ? lastPriceChange > 0 ? 0.3 : -0.3  // high volume confirms direction
        : 0;
      indicators.push({
        name: 'Volume SMA(20)',
        value: [currentVol, volSma],
        signal: volRatio > 1.5 ? (lastPriceChange > 0 ? 'BULLISH' : 'BEARISH') : 'NEUTRAL',
        score: volConfirm,
      });
    }

    // ── Fibonacci retracement ─────────────────────────────────────────────────
    const fib = this.computeFibonacciLevels(highs, lows, closes);

    // ── Support / Resistance ──────────────────────────────────────────────────
    const { support, resistance } = this.computeSupportResistance(candles);

    // ── Pattern Detection ─────────────────────────────────────────────────────
    const patterns = this.detectPatterns(candles);

    // ── Composite Score ───────────────────────────────────────────────────────
    // Weight by indicator reliability — momentum/trend indicators weighted higher
    const weights: Record<string, number> = {
      'RSI(14)': 1.2, 'MACD(12,26,9)': 1.2, 'BB(20,2)': 1.0,
      'EMA(12/26/50)': 1.3, 'SMA(20/50/200)': 1.1, 'ADX(14)': 0.8,
      'Parabolic SAR': 0.9, 'Ichimoku': 1.1, 'StochRSI': 1.0,
      'Williams %R': 0.9, 'CCI(20)': 0.9, 'ROC(12)': 0.8,
      'Keltner(20)': 0.8, 'OBV': 1.0, 'VWAP': 0.9,
      'Volume SMA(20)': 0.7, 'Stoch(14)': 0.9,
    };

    let weightedSum = 0, totalWeight = 0;
    for (const ind of indicators) {
      const w = weights[ind.name] ?? 1.0;
      weightedSum += ind.score * w;
      totalWeight += w;
    }
    const compositeScore = totalWeight > 0
      ? Math.max(-1, Math.min(1, weightedSum / totalWeight))
      : 0;

    const trend =
      compositeScore > 0.25 ? 'UPTREND' :
      compositeScore < -0.25 ? 'DOWNTREND' : 'SIDEWAYS';

    return {
      asset: symbol,
      timeframe,
      compositeScore,
      indicators,
      supportLevels: [...support, ...(fib?.support ?? [])].slice(-4),
      resistanceLevels: [...resistance, ...(fib?.resistance ?? [])].slice(-4),
      trend,
      patterns,
      atr,
      timestamp: new Date(),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INDICATOR IMPLEMENTATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Trend Indicators ──────────────────────────────────────────────────────

  private computeSMA(data: number[], period: number): number | null {
    if (data.length < period) return null;
    const slice = data.slice(-period);
    return slice.reduce((s, v) => s + v, 0) / period;
  }

  private computeEMA(data: number[], period: number): number | null {
    if (data.length < period) return null;
    const k = 2 / (period + 1);
    let ema = data[0];
    for (let i = 1; i < data.length; i++) ema = data[i] * k + ema * (1 - k);
    return ema;
  }

  private computeEMAArray(data: number[], period: number): number[] {
    if (data.length < period) return [];
    const k = 2 / (period + 1);
    const result: number[] = [data[0]];
    for (let i = 1; i < data.length; i++) result.push(data[i] * k + result[i - 1] * (1 - k));
    return result;
  }

  private computeMACD(
    closes: number[], fast = 12, slow = 26, signal = 9,
  ): { macd: number; signal: number; histogram: number } | null {
    if (closes.length < slow + signal) return null;
    const fastEMA = this.computeEMAArray(closes, fast);
    const slowEMA = this.computeEMAArray(closes, slow);
    const macdLine = fastEMA.slice(slow - 1).map((v, i) => v - slowEMA[i + slow - 1]);
    const signalLine = this.computeEMAArray(macdLine, signal);
    const last = macdLine.length - 1;
    return {
      macd: macdLine[last],
      signal: signalLine[last],
      histogram: macdLine[last] - signalLine[last],
    };
  }

  private computeParabolicSAR(highs: number[], lows: number[], af = 0.02, maxAF = 0.2): number | null {
    if (highs.length < 10) return null;
    let isLong = true;
    let sar = lows[0];
    let ep = highs[0];
    let currentAF = af;

    for (let i = 1; i < highs.length; i++) {
      const prevSar = sar;
      sar = sar + currentAF * (ep - sar);

      if (isLong) {
        sar = Math.min(sar, lows[i - 1], i > 1 ? lows[i - 2] : lows[i - 1]);
        if (lows[i] < sar) {
          isLong = false; sar = ep; ep = lows[i]; currentAF = af;
        } else {
          if (highs[i] > ep) { ep = highs[i]; currentAF = Math.min(currentAF + af, maxAF); }
        }
      } else {
        sar = Math.max(sar, highs[i - 1], i > 1 ? highs[i - 2] : highs[i - 1]);
        if (highs[i] > sar) {
          isLong = true; sar = ep; ep = highs[i]; currentAF = af;
        } else {
          if (lows[i] < ep) { ep = lows[i]; currentAF = Math.min(currentAF + af, maxAF); }
        }
      }
      void prevSar;
    }
    return sar;
  }

  private computeIchimoku(highs: number[], lows: number[], closes: number[]): {
    tenkan: number; kijun: number; senkouA: number; senkouB: number; chikou: number;
  } | null {
    if (closes.length < 52) return null;

    const midpoint = (h: number[], l: number[], start: number, end: number) => {
      const slice_h = h.slice(start, end);
      const slice_l = l.slice(start, end);
      return (Math.max(...slice_h) + Math.min(...slice_l)) / 2;
    };

    const n = closes.length;
    const tenkan = midpoint(highs, lows, n - 9, n);
    const kijun = midpoint(highs, lows, n - 26, n);
    const senkouA = (tenkan + kijun) / 2;
    const senkouB = midpoint(highs, lows, n - 52, n);
    const chikou = closes[n - 26] ?? closes[0];

    return { tenkan, kijun, senkouA, senkouB, chikou };
  }

  // ── Momentum Indicators ───────────────────────────────────────────────────

  private computeRSI(closes: number[], period = 14): number | null {
    if (closes.length < period + 1) return null;
    let gains = 0, losses = 0;
    const slice = closes.slice(closes.length - period - 1);
    for (let i = 1; i < slice.length; i++) {
      const d = slice[i] - slice[i - 1];
      if (d > 0) gains += d; else losses -= d;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    return 100 - 100 / (1 + avgGain / avgLoss);
  }

  private computeStochRSI(closes: number[], rsiPeriod = 14, period = 14): { k: number; d: number } | null {
    if (closes.length < rsiPeriod + period + 1) return null;
    const rsiValues: number[] = [];
    for (let i = rsiPeriod; i <= closes.length - 1; i++) {
      const rsi = this.computeRSI(closes.slice(0, i + 1), rsiPeriod);
      if (rsi !== null) rsiValues.push(rsi);
    }
    if (rsiValues.length < period) return null;
    const slice = rsiValues.slice(-period);
    const min = Math.min(...slice);
    const max = Math.max(...slice);
    if (max === min) return { k: 50, d: 50 };
    const k = ((rsiValues[rsiValues.length - 1] - min) / (max - min)) * 100;
    // Simple smoothing for %D
    const kPrev = rsiValues.length >= 2
      ? ((rsiValues[rsiValues.length - 2] - min) / (max - min)) * 100 : k;
    const d = (k + kPrev) / 2;
    return { k, d };
  }

  private computeWilliamsR(highs: number[], lows: number[], closes: number[], period = 14): number | null {
    if (closes.length < period) return null;
    const h = highs.slice(-period);
    const l = lows.slice(-period);
    const highestHigh = Math.max(...h);
    const lowestLow = Math.min(...l);
    const currentClose = closes[closes.length - 1];
    if (highestHigh === lowestLow) return -50;
    return ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
  }

  private computeCCI(highs: number[], lows: number[], closes: number[], period = 20): number | null {
    if (closes.length < period) return null;
    const typical = closes.map((c, i) => (highs[i] + lows[i] + c) / 3);
    const slice = typical.slice(-period);
    const mean = slice.reduce((s, v) => s + v, 0) / period;
    const meanDev = slice.reduce((s, v) => s + Math.abs(v - mean), 0) / period;
    if (meanDev === 0) return 0;
    return (typical[typical.length - 1] - mean) / (0.015 * meanDev);
  }

  private computeROC(closes: number[], period = 12): number | null {
    if (closes.length < period + 1) return null;
    const prev = closes[closes.length - 1 - period];
    const curr = closes[closes.length - 1];
    if (prev === 0) return 0;
    return ((curr - prev) / prev) * 100;
  }

  private computeStoch(highs: number[], lows: number[], closes: number[], period = 14): { k: number; d: number } | null {
    if (closes.length < period) return null;
    const h = highs.slice(-period);
    const l = lows.slice(-period);
    const high = Math.max(...h);
    const low = Math.min(...l);
    if (high === low) return { k: 50, d: 50 };
    const k = ((closes[closes.length - 1] - low) / (high - low)) * 100;
    // Simple %D using previous %K
    const h2 = highs.slice(-period - 1, -1);
    const l2 = lows.slice(-period - 1, -1);
    const high2 = Math.max(...h2);
    const low2 = Math.min(...l2);
    const k2 = h2.length >= period && high2 !== low2
      ? ((closes[closes.length - 2] - low2) / (high2 - low2)) * 100 : k;
    return { k, d: (k + k2) / 2 };
  }

  // ── Volatility Indicators ─────────────────────────────────────────────────

  private computeBollingerBands(closes: number[], period = 20, stdDevMult = 2): { upper: number; middle: number; lower: number } | null {
    if (closes.length < period) return null;
    const slice = closes.slice(-period);
    const mean = slice.reduce((s, v) => s + v, 0) / period;
    const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period;
    const std = Math.sqrt(variance);
    return { upper: mean + stdDevMult * std, middle: mean, lower: mean - stdDevMult * std };
  }

  private computeKeltnerChannels(closes: number[], highs: number[], lows: number[], period = 20, mult = 2): { upper: number; middle: number; lower: number } | null {
    const ema = this.computeEMA(closes, period);
    const atr = this.computeATR({ highs, lows, closes }, period);
    if (!ema || !atr) return null;
    return { upper: ema + mult * atr, middle: ema, lower: ema - mult * atr };
  }

  private computeATR(data: OHLCVCandle[] | { highs: number[]; lows: number[]; closes: number[] }, period = 14): number | null {
    let highs: number[], lows: number[], closes: number[];

    if (Array.isArray(data)) {
      if (data.length < period + 1) return null;
      highs = data.map((c) => c.high);
      lows = data.map((c) => c.low);
      closes = data.map((c) => c.close);
    } else {
      highs = data.highs; lows = data.lows; closes = data.closes;
      if (closes.length < period + 1) return null;
    }

    const trs: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      const hl = highs[i] - lows[i];
      const hc = Math.abs(highs[i] - closes[i - 1]);
      const lc = Math.abs(lows[i] - closes[i - 1]);
      trs.push(Math.max(hl, hc, lc));
    }
    return trs.slice(-period).reduce((s, v) => s + v, 0) / period;
  }

  // ── ADX with +DI / -DI ────────────────────────────────────────────────────

  private computeFullADX(candles: OHLCVCandle[], period = 14): { adx: number | null; plusDI: number; minusDI: number } {
    if (candles.length < period * 2) return { adx: null, plusDI: 50, minusDI: 50 };

    const slice = candles.slice(-period * 2);
    let sumPlusDM = 0, sumMinusDM = 0, sumTR = 0;
    const dxValues: number[] = [];

    for (let i = 1; i < slice.length; i++) {
      const upMove = slice[i].high - slice[i - 1].high;
      const downMove = slice[i - 1].low - slice[i].low;
      const plusDM = upMove > downMove && upMove > 0 ? upMove : 0;
      const minusDM = downMove > upMove && downMove > 0 ? downMove : 0;
      const tr = Math.max(
        slice[i].high - slice[i].low,
        Math.abs(slice[i].high - slice[i - 1].close),
        Math.abs(slice[i].low - slice[i - 1].close),
      );
      sumPlusDM += plusDM;
      sumMinusDM += minusDM;
      sumTR += tr;
    }

    if (sumTR === 0) return { adx: null, plusDI: 50, minusDI: 50 };
    const plusDI = (sumPlusDM / sumTR) * 100;
    const minusDI = (sumMinusDM / sumTR) * 100;
    const diSum = plusDI + minusDI;
    if (diSum === 0) return { adx: null, plusDI, minusDI };
    const dx = Math.abs(plusDI - minusDI) / diSum * 100;
    dxValues.push(dx);

    return { adx: dx, plusDI, minusDI };
  }

  // ── Volume Indicators ─────────────────────────────────────────────────────

  private computeOBV(closes: number[], volumes: number[]): number[] {
    const obv: number[] = [0];
    for (let i = 1; i < closes.length; i++) {
      const prev = obv[i - 1];
      if (closes[i] > closes[i - 1]) obv.push(prev + volumes[i]);
      else if (closes[i] < closes[i - 1]) obv.push(prev - volumes[i]);
      else obv.push(prev);
    }
    return obv;
  }

  private computeOBVScore(obv: number[], closes: number[]): number {
    if (obv.length < 20) return 0;
    // Check OBV trend vs price trend (divergence detection)
    const obvSlice = obv.slice(-20);
    const priceSlice = closes.slice(-20);
    const obvChange = (obvSlice[19] - obvSlice[0]) / (Math.abs(obvSlice[0]) || 1);
    const priceChange = (priceSlice[19] - priceSlice[0]) / priceSlice[0];
    // Converging: same direction = confirmation
    if (priceChange > 0 && obvChange > 0) return Math.min(0.5, obvChange);
    if (priceChange < 0 && obvChange < 0) return Math.max(-0.5, obvChange);
    // Diverging: OBV contradicts price = weak signal in OBV direction
    if (priceChange > 0 && obvChange < 0) return -0.3; // bearish divergence
    if (priceChange < 0 && obvChange > 0) return 0.3;  // bullish divergence
    return 0;
  }

  private computeVWAP(candles: OHLCVCandle[]): number | null {
    if (candles.length < 10) return null;
    // Use last session (last 24 candles approximate)
    const session = candles.slice(-Math.min(candles.length, 24));
    let tpvSum = 0, volSum = 0;
    for (const c of session) {
      const tp = (c.high + c.low + c.close) / 3;
      tpvSum += tp * c.volume;
      volSum += c.volume;
    }
    return volSum > 0 ? tpvSum / volSum : null;
  }

  private computeVolumeSMA(volumes: number[], period = 20): number | null {
    if (volumes.length < period) return null;
    return volumes.slice(-period).reduce((s, v) => s + v, 0) / period;
  }

  // ── Fibonacci ─────────────────────────────────────────────────────────────

  private computeFibonacciLevels(
    highs: number[], lows: number[], closes: number[],
  ): { support: number[]; resistance: number[] } | null {
    if (closes.length < 30) return null;
    const lookback = Math.min(closes.length, 100);
    const high = Math.max(...highs.slice(-lookback));
    const low = Math.min(...lows.slice(-lookback));
    const range = high - low;
    const current = closes[closes.length - 1];
    const isUptrend = current > (high + low) / 2;

    const ratios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    const levels = ratios.map((r) => isUptrend ? low + range * r : high - range * r);

    const support = levels.filter((l) => l < current).slice(-2);
    const resistance = levels.filter((l) => l > current).slice(0, 2);
    return { support, resistance };
  }

  // ── Support / Resistance ──────────────────────────────────────────────────

  computeSupportResistance(candles: OHLCVCandle[]): { support: number[]; resistance: number[] } {
    if (candles.length < 20) return { support: [], resistance: [] };
    const lookback = Math.min(candles.length, 150);
    const recent = candles.slice(-lookback);
    const support: number[] = [];
    const resistance: number[] = [];

    for (let i = 3; i < recent.length - 3; i++) {
      const isLocalLow = recent.slice(i - 3, i).every((c) => c.low >= recent[i].low)
        && recent.slice(i + 1, i + 4).every((c) => c.low >= recent[i].low);
      const isLocalHigh = recent.slice(i - 3, i).every((c) => c.high <= recent[i].high)
        && recent.slice(i + 1, i + 4).every((c) => c.high <= recent[i].high);
      if (isLocalLow) support.push(recent[i].low);
      if (isLocalHigh) resistance.push(recent[i].high);
    }

    return {
      support: this.clusterLevels(support).slice(-3),
      resistance: this.clusterLevels(resistance).slice(-3),
    };
  }

  private clusterLevels(prices: number[], tolerance = 0.005): number[] {
    if (!prices.length) return [];
    const sorted = [...prices].sort((a, b) => a - b);
    const clusters: number[][] = [[sorted[0]]];
    for (let i = 1; i < sorted.length; i++) {
      const last = clusters[clusters.length - 1];
      const mean = last.reduce((s, v) => s + v, 0) / last.length;
      Math.abs(sorted[i] - mean) / mean <= tolerance
        ? last.push(sorted[i])
        : clusters.push([sorted[i]]);
    }
    return clusters.map((c) => c.reduce((s, v) => s + v, 0) / c.length);
  }

  // ── Pattern Detection ─────────────────────────────────────────────────────

  private detectPatterns(candles: OHLCVCandle[]): string[] {
    const patterns: string[] = [];
    if (candles.length < 20) return patterns;

    const n = candles.length;
    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);

    // Double Top
    const recentHighs = highs.slice(-30);
    const maxH = Math.max(...recentHighs);
    const maxIdx = recentHighs.lastIndexOf(maxH);
    if (maxIdx < recentHighs.length - 5) {
      const secondMaxH = Math.max(...recentHighs.slice(maxIdx + 4));
      if (Math.abs(secondMaxH - maxH) / maxH < 0.015) patterns.push('Double Top');
    }

    // Double Bottom
    const recentLows = lows.slice(-30);
    const minL = Math.min(...recentLows);
    const minIdx = recentLows.indexOf(minL);
    if (minIdx < recentLows.length - 5) {
      const secondMinL = Math.min(...recentLows.slice(minIdx + 4));
      if (Math.abs(secondMinL - minL) / minL < 0.015) patterns.push('Double Bottom');
    }

    // Bullish/Bearish Engulfing (last 2 candles)
    if (n >= 2) {
      const prev = candles[n - 2], curr = candles[n - 1];
      if (prev.close < prev.open && curr.close > curr.open
        && curr.open < prev.close && curr.close > prev.open) {
        patterns.push('Bullish Engulfing');
      }
      if (prev.close > prev.open && curr.close < curr.open
        && curr.open > prev.close && curr.close < prev.open) {
        patterns.push('Bearish Engulfing');
      }
    }

    // Doji (indecision)
    const last = candles[n - 1];
    const bodySize = Math.abs(last.close - last.open);
    const totalRange = last.high - last.low;
    if (totalRange > 0 && bodySize / totalRange < 0.1) patterns.push('Doji');

    // Higher highs + higher lows → uptrend
    if (n >= 10) {
      const slice = candles.slice(-10);
      const hhhl = slice.every((c, i) => i === 0 || (c.high >= slice[i - 1].high && c.low >= slice[i - 1].low));
      const llhl = slice.every((c, i) => i === 0 || (c.high <= slice[i - 1].high && c.low <= slice[i - 1].low));
      if (hhhl) patterns.push('Higher Highs');
      if (llhl) patterns.push('Lower Lows');
    }

    // Golden/Death cross check via SMAs
    const sma50 = this.computeSMA(closes, 50);
    const sma200 = this.computeSMA(closes, 200);
    if (sma50 && sma200) {
      const prevSma50 = this.computeSMA(closes.slice(0, -1), 50);
      const prevSma200 = this.computeSMA(closes.slice(0, -1), 200);
      if (prevSma50 && prevSma200) {
        if (prevSma50 < prevSma200 && sma50 > sma200) patterns.push('Golden Cross');
        if (prevSma50 > prevSma200 && sma50 < sma200) patterns.push('Death Cross');
      }
    }

    return patterns;
  }

  private emptyResult(symbol: string, timeframe: string): TechnicalAnalysisResult {
    return {
      asset: symbol, timeframe, compositeScore: 0, indicators: [],
      supportLevels: [], resistanceLevels: [], trend: 'SIDEWAYS',
      patterns: [], atr: 0, timestamp: new Date(),
    };
  }
}
