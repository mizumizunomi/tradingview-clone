import { Injectable } from '@nestjs/common';

export interface SupportResistanceLevel {
  price: number;
  strength: number;  // 0-1
  touches: number;
  lastTouch: number; // unix seconds of most recent touch
  isSupport: boolean;
}

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

@Injectable()
export class LevelDetectionService {
  /**
   * Detect swing highs / swing lows, cluster nearby levels, score by touches + recency.
   * Returns top supports and top resistances.
   */
  detectLevels(
    candles: Candle[],
    lookback = 200,
    clusterThreshold = 0.005, // 0.5% clustering
    topN = 3,
  ): { supports: SupportResistanceLevel[]; resistances: SupportResistanceLevel[] } {
    const slice = candles.slice(-lookback);
    if (slice.length < 10) return { supports: [], resistances: [] };

    const currentPrice = slice[slice.length - 1].close;
    const highs = this.findSwingHighs(slice);
    const lows = this.findSwingLows(slice);

    const resistanceClusters = this.clusterLevels(highs, clusterThreshold);
    const supportClusters = this.clusterLevels(lows, clusterThreshold);

    const scoredResistances = resistanceClusters
      .map((c) => this.scoreLevel(c, currentPrice, false, slice))
      .filter((l) => l.price > currentPrice)
      .sort((a, b) => b.strength - a.strength)
      .slice(0, topN);

    const scoredSupports = supportClusters
      .map((c) => this.scoreLevel(c, currentPrice, true, slice))
      .filter((l) => l.price < currentPrice)
      .sort((a, b) => b.strength - a.strength)
      .slice(0, topN);

    return { supports: scoredSupports, resistances: scoredResistances };
  }

  /**
   * Calculate Fibonacci retracement levels between swing high and low.
   */
  getFibonacciLevels(
    candles: Candle[],
    lookback = 100,
  ): { highPrice: number; highTime: number; lowPrice: number; lowTime: number; levels: { ratio: number; price: number; label: string }[] } | null {
    const slice = candles.slice(-lookback);
    if (slice.length < 10) return null;

    let highIdx = 0, lowIdx = 0;
    for (let i = 1; i < slice.length; i++) {
      if (slice[i].high > slice[highIdx].high) highIdx = i;
      if (slice[i].low < slice[lowIdx].low) lowIdx = i;
    }

    const high = slice[highIdx];
    const low = slice[lowIdx];
    const range = high.high - low.low;
    if (range <= 0) return null;

    const FIB_RATIOS = [
      { ratio: 0, label: '0%' },
      { ratio: 0.236, label: '23.6%' },
      { ratio: 0.382, label: '38.2%' },
      { ratio: 0.5, label: '50%' },
      { ratio: 0.618, label: '61.8%' },
      { ratio: 0.786, label: '78.6%' },
      { ratio: 1, label: '100%' },
    ];

    // Determine direction: if high comes after low, retracement goes down
    const isUptrend = highIdx > lowIdx;
    const levels = FIB_RATIOS.map(({ ratio, label }) => ({
      ratio,
      price: isUptrend
        ? high.high - ratio * range
        : low.low + ratio * range,
      label,
    }));

    return {
      highPrice: high.high,
      highTime: high.time,
      lowPrice: low.low,
      lowTime: low.time,
      levels,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private findSwingHighs(candles: Candle[], n = 3): { price: number; time: number; volume: number }[] {
    const results: { price: number; time: number; volume: number }[] = [];
    for (let i = n; i < candles.length - n; i++) {
      const c = candles[i];
      let isHigh = true;
      for (let j = i - n; j <= i + n; j++) {
        if (j !== i && candles[j].high >= c.high) { isHigh = false; break; }
      }
      if (isHigh) results.push({ price: c.high, time: c.time, volume: c.volume ?? 0 });
    }
    return results;
  }

  private findSwingLows(candles: Candle[], n = 3): { price: number; time: number; volume: number }[] {
    const results: { price: number; time: number; volume: number }[] = [];
    for (let i = n; i < candles.length - n; i++) {
      const c = candles[i];
      let isLow = true;
      for (let j = i - n; j <= i + n; j++) {
        if (j !== i && candles[j].low <= c.low) { isLow = false; break; }
      }
      if (isLow) results.push({ price: c.low, time: c.time, volume: c.volume ?? 0 });
    }
    return results;
  }

  private clusterLevels(
    points: { price: number; time: number; volume: number }[],
    threshold: number,
  ): { price: number; times: number[]; volumes: number[] }[] {
    const clusters: { price: number; times: number[]; volumes: number[] }[] = [];
    for (const pt of points) {
      const existing = clusters.find(
        (c) => Math.abs(c.price - pt.price) / c.price < threshold,
      );
      if (existing) {
        existing.price = (existing.price * existing.times.length + pt.price) / (existing.times.length + 1);
        existing.times.push(pt.time);
        existing.volumes.push(pt.volume);
      } else {
        clusters.push({ price: pt.price, times: [pt.time], volumes: [pt.volume] });
      }
    }
    return clusters;
  }

  private scoreLevel(
    cluster: { price: number; times: number[]; volumes: number[] },
    currentPrice: number,
    isSupport: boolean,
    candles: Candle[],
  ): SupportResistanceLevel {
    const touches = cluster.times.length;
    const lastTouch = Math.max(...cluster.times);
    const now = candles[candles.length - 1].time;

    // Recency score: exponential decay (recent = higher score)
    const ageInBars = candles.findIndex((c) => c.time >= lastTouch);
    const recencyScore = Math.exp(-ageInBars / 50);

    // Proximity score: levels close to current price are more relevant
    const proximityPct = Math.abs(cluster.price - currentPrice) / currentPrice;
    const proximityScore = Math.max(0, 1 - proximityPct * 10);

    // Volume score: high volume at level = stronger
    const avgVolume = cluster.volumes.reduce((a, b) => a + b, 0) / cluster.volumes.length;
    const maxVol = Math.max(...candles.map((c) => c.volume ?? 0));
    const volumeScore = maxVol > 0 ? Math.min(1, avgVolume / maxVol) : 0.5;

    // Composite strength
    const strength = Math.min(
      1,
      (touches * 0.15 + recencyScore * 0.35 + proximityScore * 0.3 + volumeScore * 0.2),
    );

    return {
      price: cluster.price,
      strength,
      touches,
      lastTouch,
      isSupport,
    };
  }
}
