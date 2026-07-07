import { Injectable } from '@nestjs/common';
import { OHLCVCandle } from '../interfaces/provider.interface';

export interface CandlePattern {
  name: string;
  type: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: number; // 0-1
  index: number;    // candle index where pattern was detected
}

export interface ChartPattern {
  name: string;
  type: 'BULLISH' | 'BEARISH';
  targetPrice: number;
  confirmationLevel: number;
  strength: number;
}

@Injectable()
export class PatternRecognitionService {

  /**
   * Detect single and multi-candle patterns in the recent candle data.
   * Returns patterns from most recent candles only.
   */
  detectCandlePatterns(candles: OHLCVCandle[], lookback = 5): CandlePattern[] {
    const patterns: CandlePattern[] = [];
    const len = candles.length;
    if (len < 3) return patterns;

    const start = Math.max(0, len - lookback);

    for (let i = start; i < len; i++) {
      const c = candles[i];
      const prev = i > 0 ? candles[i - 1] : null;
      const prev2 = i > 1 ? candles[i - 2] : null;

      const body = Math.abs(c.close - c.open);
      const range = c.high - c.low;
      const upperWick = c.high - Math.max(c.open, c.close);
      const lowerWick = Math.min(c.open, c.close) - c.low;
      const isBullish = c.close > c.open;
      const isBearish = c.close < c.open;

      // ── Single candle patterns ──────────────────────────────────────────────

      // Doji
      if (body < range * 0.1 && range > 0) {
        patterns.push({ name: 'Doji', type: 'NEUTRAL', strength: 0.5, index: i });
      }

      // Hammer (bullish)
      if (lowerWick > body * 2 && upperWick < body * 0.5 && range > 0) {
        patterns.push({ name: 'Hammer', type: 'BULLISH', strength: 0.7, index: i });
      }

      // Inverted Hammer / Shooting Star
      if (upperWick > body * 2 && lowerWick < body * 0.5 && range > 0) {
        patterns.push({
          name: isBullish ? 'Inverted Hammer' : 'Shooting Star',
          type: isBullish ? 'BULLISH' : 'BEARISH',
          strength: 0.65,
          index: i,
        });
      }

      // Marubozu (strong body, minimal wicks)
      if (body > range * 0.85) {
        patterns.push({
          name: isBullish ? 'Bullish Marubozu' : 'Bearish Marubozu',
          type: isBullish ? 'BULLISH' : 'BEARISH',
          strength: 0.8,
          index: i,
        });
      }

      // ── Two-candle patterns ─────────────────────────────────────────────────
      if (!prev) continue;

      const prevBody = Math.abs(prev.close - prev.open);
      const prevIsBullish = prev.close > prev.open;

      // Bullish Engulfing
      if (
        !prevIsBullish && isBullish &&
        c.open < prev.close && c.close > prev.open &&
        body > prevBody * 0.9
      ) {
        patterns.push({ name: 'Bullish Engulfing', type: 'BULLISH', strength: 0.85, index: i });
      }

      // Bearish Engulfing
      if (
        prevIsBullish && isBearish &&
        c.open > prev.close && c.close < prev.open &&
        body > prevBody * 0.9
      ) {
        patterns.push({ name: 'Bearish Engulfing', type: 'BEARISH', strength: 0.85, index: i });
      }

      // Piercing Line
      if (
        !prevIsBullish && isBullish &&
        c.open < prev.low &&
        c.close > (prev.open + prev.close) / 2
      ) {
        patterns.push({ name: 'Piercing Line', type: 'BULLISH', strength: 0.70, index: i });
      }

      // Dark Cloud Cover
      if (
        prevIsBullish && isBearish &&
        c.open > prev.high &&
        c.close < (prev.open + prev.close) / 2
      ) {
        patterns.push({ name: 'Dark Cloud Cover', type: 'BEARISH', strength: 0.70, index: i });
      }

      // Tweezer Tops / Bottoms
      if (Math.abs(c.high - prev.high) / c.high < 0.001 && !isBullish && prevIsBullish) {
        patterns.push({ name: 'Tweezer Top', type: 'BEARISH', strength: 0.65, index: i });
      }
      if (Math.abs(c.low - prev.low) / c.low < 0.001 && isBullish && !prevIsBullish) {
        patterns.push({ name: 'Tweezer Bottom', type: 'BULLISH', strength: 0.65, index: i });
      }

      // ── Three-candle patterns ───────────────────────────────────────────────
      if (!prev2) continue;

      const prev2Bullish = prev2.close > prev2.open;

      // Morning Star
      if (
        !prev2Bullish && prevBody < prev.high - prev.low * 0.3 && isBullish &&
        c.close > (prev2.open + prev2.close) / 2
      ) {
        patterns.push({ name: 'Morning Star', type: 'BULLISH', strength: 0.90, index: i });
      }

      // Evening Star
      if (
        prev2Bullish && prevBody < prev.high - prev.low * 0.3 && isBearish &&
        c.close < (prev2.open + prev2.close) / 2
      ) {
        patterns.push({ name: 'Evening Star', type: 'BEARISH', strength: 0.90, index: i });
      }

      // Three White Soldiers
      if (
        isBullish && prevIsBullish && prev2Bullish &&
        c.open > prev.open && prev.open > prev2.open &&
        body > range * 0.6 && Math.abs(prev.close - prev.open) > prevBody * 0.6
      ) {
        patterns.push({ name: 'Three White Soldiers', type: 'BULLISH', strength: 0.90, index: i });
      }

      // Three Black Crows
      if (
        isBearish && !prevIsBullish && !prev2Bullish &&
        c.open < prev.open && prev.open < prev2.open
      ) {
        patterns.push({ name: 'Three Black Crows', type: 'BEARISH', strength: 0.90, index: i });
      }
    }

    // Deduplicate by keeping highest-strength pattern per index
    const byIndex = new Map<string, CandlePattern>();
    for (const p of patterns) {
      const key = `${p.index}:${p.name}`;
      if (!byIndex.has(key) || byIndex.get(key)!.strength < p.strength) {
        byIndex.set(key, p);
      }
    }

    return Array.from(byIndex.values()).sort((a, b) => b.index - a.index);
  }

  /**
   * Detect chart patterns (double top/bottom, head & shoulders, triangles).
   * These require more historical data (50+ candles).
   */
  detectChartPatterns(candles: OHLCVCandle[]): ChartPattern[] {
    const patterns: ChartPattern[] = [];
    if (candles.length < 50) return patterns;

    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const closes = candles.map((c) => c.close);
    const len = candles.length;
    const currentPrice = closes[len - 1];

    // ── Double Top ─────────────────────────────────────────────────────────────
    const doubleTop = this.findDoubleTop(highs, closes, len);
    if (doubleTop) patterns.push(doubleTop);

    // ── Double Bottom ──────────────────────────────────────────────────────────
    const doubleBottom = this.findDoubleBottom(lows, closes, len);
    if (doubleBottom) patterns.push(doubleBottom);

    // ── Ascending/Descending Triangle ──────────────────────────────────────────
    const triangle = this.detectTriangle(highs, lows, closes, len, currentPrice);
    if (triangle) patterns.push(triangle);

    return patterns;
  }

  private findDoubleTop(highs: number[], closes: number[], len: number): ChartPattern | null {
    const window = Math.min(len, 60);
    const slice = highs.slice(len - window);
    const maxH = Math.max(...slice);
    const threshold = maxH * 0.002; // 0.2% tolerance

    // Find two highs within tolerance
    const peaks: number[] = [];
    for (let i = 2; i < slice.length - 2; i++) {
      if (
        slice[i] >= maxH - threshold &&
        slice[i] > slice[i - 1] && slice[i] > slice[i + 1]
      ) {
        peaks.push(i);
      }
    }

    if (peaks.length >= 2) {
      const neckline = Math.min(...closes.slice(peaks[0], peaks[peaks.length - 1]));
      const target = neckline - (maxH - neckline);
      return {
        name: 'Double Top',
        type: 'BEARISH',
        targetPrice: target,
        confirmationLevel: neckline,
        strength: 0.80,
      };
    }
    return null;
  }

  private findDoubleBottom(lows: number[], closes: number[], len: number): ChartPattern | null {
    const window = Math.min(len, 60);
    const slice = lows.slice(len - window);
    const minL = Math.min(...slice);
    const threshold = minL * 0.002;

    const troughs: number[] = [];
    for (let i = 2; i < slice.length - 2; i++) {
      if (
        slice[i] <= minL + threshold &&
        slice[i] < slice[i - 1] && slice[i] < slice[i + 1]
      ) {
        troughs.push(i);
      }
    }

    if (troughs.length >= 2) {
      const neckline = Math.max(...closes.slice(troughs[0], troughs[troughs.length - 1]));
      const target = neckline + (neckline - minL);
      return {
        name: 'Double Bottom',
        type: 'BULLISH',
        targetPrice: target,
        confirmationLevel: neckline,
        strength: 0.80,
      };
    }
    return null;
  }

  private detectTriangle(
    highs: number[], lows: number[], closes: number[],
    len: number, currentPrice: number,
  ): ChartPattern | null {
    const window = Math.min(len, 40);
    const recentHighs = highs.slice(len - window);
    const recentLows = lows.slice(len - window);

    const highSlope = this.linearSlope(recentHighs);
    const lowSlope = this.linearSlope(recentLows);

    // Ascending triangle: flat top, rising bottom
    if (Math.abs(highSlope) < 0.0005 && lowSlope > 0.0003) {
      const resistance = Math.max(...recentHighs);
      return {
        name: 'Ascending Triangle',
        type: 'BULLISH',
        targetPrice: resistance + (resistance - Math.min(...recentLows)),
        confirmationLevel: resistance,
        strength: 0.72,
      };
    }

    // Descending triangle: declining top, flat bottom
    if (highSlope < -0.0003 && Math.abs(lowSlope) < 0.0005) {
      const support = Math.min(...recentLows);
      return {
        name: 'Descending Triangle',
        type: 'BEARISH',
        targetPrice: support - (Math.max(...recentHighs) - support),
        confirmationLevel: support,
        strength: 0.72,
      };
    }

    return null;
  }

  private linearSlope(values: number[]): number {
    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i; sumY += values[i];
      sumXY += i * values[i]; sumX2 += i * i;
    }
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) / (sumY / n);
  }

  /** Convert detected patterns to string names for the TA result */
  patternsToStrings(candle: CandlePattern[], chart: ChartPattern[]): string[] {
    const names: string[] = [];
    // Only include recent and significant patterns
    for (const p of candle.filter((c) => c.strength >= 0.65)) {
      names.push(p.name);
    }
    for (const p of chart) {
      names.push(p.name);
    }
    return [...new Set(names)].slice(0, 6);
  }
}
