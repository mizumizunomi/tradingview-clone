import { Injectable } from '@nestjs/common';
import { OHLCVCandle } from '../interfaces/provider.interface';

export type MarketPhase = 'ACCUMULATION' | 'MARKUP' | 'DISTRIBUTION' | 'MARKDOWN' | 'RANGING';
export type StructureEvent = 'BOS' | 'CHOCH' | 'HIGHER_HIGH' | 'HIGHER_LOW' | 'LOWER_HIGH' | 'LOWER_LOW';

export interface SwingPoint {
  index: number;
  price: number;
  type: 'HIGH' | 'LOW';
}

export interface StructureAnalysis {
  phase: MarketPhase;
  trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
  recentEvents: StructureEvent[];
  swingHighs: number[];
  swingLows: number[];
  lastBOS: { price: number; direction: 'UP' | 'DOWN' } | null;
  lastCHoCH: { price: number; direction: 'UP' | 'DOWN' } | null;
  structureScore: number; // -1.0 to +1.0 (bearish to bullish)
}

@Injectable()
export class MarketStructureService {

  /**
   * Full market structure analysis: swing points, trend, BOS/CHoCH, phase.
   */
  analyze(candles: OHLCVCandle[]): StructureAnalysis {
    if (candles.length < 20) {
      return this.emptyAnalysis();
    }

    const swingPoints = this.detectSwingPoints(candles);
    const swingHighs = swingPoints.filter((p) => p.type === 'HIGH');
    const swingLows = swingPoints.filter((p) => p.type === 'LOW');

    const events: StructureEvent[] = [];
    let structureScore = 0;

    // Classify swing sequence
    if (swingHighs.length >= 2 && swingLows.length >= 2) {
      const lastHH = swingHighs[swingHighs.length - 1];
      const prevHH = swingHighs[swingHighs.length - 2];
      const lastLL = swingLows[swingLows.length - 1];
      const prevLL = swingLows[swingLows.length - 2];

      if (lastHH.price > prevHH.price) {
        events.push('HIGHER_HIGH');
        structureScore += 0.25;
      } else {
        events.push('LOWER_HIGH');
        structureScore -= 0.25;
      }

      if (lastLL.price > prevLL.price) {
        events.push('HIGHER_LOW');
        structureScore += 0.25;
      } else {
        events.push('LOWER_LOW');
        structureScore -= 0.25;
      }
    }

    // Detect BOS (Break of Structure) — continuation
    const lastBOS = this.detectBOS(candles, swingHighs, swingLows);
    if (lastBOS) {
      events.push('BOS');
      structureScore += lastBOS.direction === 'UP' ? 0.30 : -0.30;
    }

    // Detect CHoCH (Change of Character) — potential reversal
    const lastCHoCH = this.detectCHoCH(candles, swingHighs, swingLows);
    if (lastCHoCH) {
      events.push('CHOCH');
      // CHoCH signals AGAINST current trend — weaken it
      structureScore *= 0.5;
    }

    const trend = this.determineTrend(structureScore, events);
    const phase = this.detectWyckoffPhase(candles, swingHighs, swingLows, trend);

    return {
      phase,
      trend,
      recentEvents: events,
      swingHighs: swingHighs.slice(-5).map((p) => p.price),
      swingLows: swingLows.slice(-5).map((p) => p.price),
      lastBOS,
      lastCHoCH,
      structureScore: Math.max(-1, Math.min(1, structureScore)),
    };
  }

  /** Detect swing highs and lows using a pivot-point algorithm */
  private detectSwingPoints(candles: OHLCVCandle[], strength = 3): SwingPoint[] {
    const points: SwingPoint[] = [];
    const len = candles.length;

    for (let i = strength; i < len - strength; i++) {
      const hi = candles[i].high;
      const lo = candles[i].low;

      let isSwingHigh = true;
      let isSwingLow = true;

      for (let j = i - strength; j <= i + strength; j++) {
        if (j === i) continue;
        if (candles[j].high >= hi) isSwingHigh = false;
        if (candles[j].low <= lo) isSwingLow = false;
      }

      if (isSwingHigh) points.push({ index: i, price: hi, type: 'HIGH' });
      if (isSwingLow) points.push({ index: i, price: lo, type: 'LOW' });
    }

    return points;
  }

  /** BOS: price cleanly breaks through the last confirmed swing level */
  private detectBOS(
    candles: OHLCVCandle[],
    swingHighs: SwingPoint[],
    swingLows: SwingPoint[],
  ): { price: number; direction: 'UP' | 'DOWN' } | null {
    if (!candles.length || !swingHighs.length || !swingLows.length) return null;

    const currentClose = candles[candles.length - 1].close;
    const lastSwingHigh = swingHighs[swingHighs.length - 1];
    const lastSwingLow = swingLows[swingLows.length - 1];

    // Bullish BOS: price closes above last swing high
    if (currentClose > lastSwingHigh.price) {
      return { price: lastSwingHigh.price, direction: 'UP' };
    }

    // Bearish BOS: price closes below last swing low
    if (currentClose < lastSwingLow.price) {
      return { price: lastSwingLow.price, direction: 'DOWN' };
    }

    return null;
  }

  /** CHoCH: first structural break against the current trend */
  private detectCHoCH(
    candles: OHLCVCandle[],
    swingHighs: SwingPoint[],
    swingLows: SwingPoint[],
  ): { price: number; direction: 'UP' | 'DOWN' } | null {
    if (swingHighs.length < 3 || swingLows.length < 3) return null;

    const len = candles.length;
    const recentClose = candles[len - 1].close;
    const prevClose = candles[Math.max(0, len - 5)].close;

    // In a downtrend (lower highs), first break above a recent swing high = CHoCH up
    const lastTwo = swingHighs.slice(-2);
    if (lastTwo[0].price > lastTwo[1].price && recentClose > lastTwo[1].price) {
      return { price: lastTwo[1].price, direction: 'UP' };
    }

    // In an uptrend (higher lows), first break below a recent swing low = CHoCH down
    const lastTwoLows = swingLows.slice(-2);
    if (lastTwoLows[0].price < lastTwoLows[1].price && recentClose < lastTwoLows[1].price) {
      return { price: lastTwoLows[1].price, direction: 'DOWN' };
    }

    return null;
  }

  private determineTrend(
    score: number,
    events: StructureEvent[],
  ): 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS' {
    if (score > 0.3) return 'UPTREND';
    if (score < -0.3) return 'DOWNTREND';
    return 'SIDEWAYS';
  }

  /** Simplified Wyckoff phase detection based on volume and price structure */
  private detectWyckoffPhase(
    candles: OHLCVCandle[],
    swingHighs: SwingPoint[],
    swingLows: SwingPoint[],
    trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS',
  ): MarketPhase {
    if (candles.length < 30) return 'RANGING';

    const recent = candles.slice(-20);
    const avgVol = recent.reduce((s, c) => s + c.volume, 0) / recent.length;
    const lastVol = candles[candles.length - 1].volume;
    const volExpanding = lastVol > avgVol * 1.3;

    if (trend === 'UPTREND' && volExpanding) return 'MARKUP';
    if (trend === 'DOWNTREND' && volExpanding) return 'MARKDOWN';
    if (trend === 'SIDEWAYS' && !volExpanding) {
      // Check if at lows (accumulation) or highs (distribution)
      const midpoint = (
        Math.max(...swingHighs.slice(-3).map((p) => p.price)) +
        Math.min(...swingLows.slice(-3).map((p) => p.price))
      ) / 2;
      const currentPrice = candles[candles.length - 1].close;
      return currentPrice < midpoint ? 'ACCUMULATION' : 'DISTRIBUTION';
    }

    return 'RANGING';
  }

  private emptyAnalysis(): StructureAnalysis {
    return {
      phase: 'RANGING',
      trend: 'SIDEWAYS',
      recentEvents: [],
      swingHighs: [],
      swingLows: [],
      lastBOS: null,
      lastCHoCH: null,
      structureScore: 0,
    };
  }
}
