import { Injectable } from '@nestjs/common';
import { IndicatorSnapshot, TechnicalAnalysisResult } from '../interfaces/signal.interface';
import { StrategyDefinition } from '../strategies/strategy.interface';
import { StructureAnalysis } from './market-structure.service';

export interface ScoredSignal {
  compositeScore: number;     // -1 to +1
  confidence: number;         // 0 to 1
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  dominantFactors: string[];  // top contributing indicators
  warnings: string[];         // risk warnings
}

@Injectable()
export class SignalScorerService {

  /**
   * Score a signal using strategy-specific indicator weights
   * plus market structure alignment.
   */
  score(
    ta: TechnicalAnalysisResult,
    structure: StructureAnalysis,
    strategy: StrategyDefinition,
    faScore: number,
    faWeight: number,
  ): ScoredSignal {
    const taWeight = 1 - faWeight;

    // Build weighted TA score using strategy indicator weights
    const taScore = this.computeWeightedTAScore(ta.indicators, strategy);

    // Blend structure score in with TA
    const blendedTA = taScore * 0.80 + structure.structureScore * 0.20;

    // Final composite
    const compositeScore = blendedTA * taWeight + faScore * faWeight;

    // Count signal directions
    let bullishCount = 0, bearishCount = 0, neutralCount = 0;
    for (const ind of ta.indicators) {
      if (ind.signal === 'BULLISH') bullishCount++;
      else if (ind.signal === 'BEARISH') bearishCount++;
      else neutralCount++;
    }

    // Dominant factors (highest absolute weighted contribution)
    const dominantFactors = this.getDominantFactors(ta.indicators, strategy);

    // Warnings
    const warnings = this.generateWarnings(ta, structure, strategy, compositeScore);

    // Confidence = combination of score magnitude, indicator agreement, and data quality
    const signalThreshold = strategy.signalThreshold ?? 0.25;
    const agreement = Math.max(bullishCount, bearishCount) / Math.max(ta.indicators.length, 1);
    const scoreMagnitude = Math.min(1, Math.abs(compositeScore) / 0.8);
    const confidence = (scoreMagnitude * 0.60 + agreement * 0.40);

    return {
      compositeScore: Math.max(-1, Math.min(1, compositeScore)),
      confidence: Math.max(0, Math.min(1, confidence)),
      bullishCount,
      bearishCount,
      neutralCount,
      dominantFactors,
      warnings,
    };
  }

  private computeWeightedTAScore(
    indicators: IndicatorSnapshot[],
    strategy: StrategyDefinition,
  ): number {
    if (!indicators.length) return 0;

    // Build weight map from strategy
    const weightMap = new Map<string, number>();
    for (const iw of strategy.indicatorWeights) {
      weightMap.set(iw.indicator.toLowerCase(), iw.weight);
    }

    let weightedSum = 0;
    let totalWeight = 0;

    for (const ind of indicators) {
      const normalizedName = ind.name.toLowerCase();
      // Find matching weight (exact or partial)
      let weight = 1.0;
      for (const [key, w] of weightMap) {
        if (normalizedName.includes(key) || key.includes(normalizedName.split('(')[0])) {
          weight = w;
          break;
        }
      }

      weightedSum += ind.score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private getDominantFactors(
    indicators: IndicatorSnapshot[],
    strategy: StrategyDefinition,
  ): string[] {
    const weightMap = new Map<string, number>();
    for (const iw of strategy.indicatorWeights) {
      weightMap.set(iw.indicator.toLowerCase(), iw.weight);
    }

    return indicators
      .map((ind) => {
        const nameKey = ind.name.toLowerCase();
        let weight = 1.0;
        for (const [key, w] of weightMap) {
          if (nameKey.includes(key.split('(')[0].trim())) {
            weight = w;
            break;
          }
        }
        return { name: ind.name, score: Math.abs(ind.score) * weight };
      })
      .filter((x) => x.score > 0.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((x) => x.name);
  }

  private generateWarnings(
    ta: TechnicalAnalysisResult,
    structure: StructureAnalysis,
    strategy: StrategyDefinition,
    compositeScore: number,
  ): string[] {
    const warnings: string[] = [];

    // Low confidence signal
    if (Math.abs(compositeScore) < 0.15) {
      warnings.push('Weak signal — low composite score');
    }

    // CHoCH detected (potential reversal)
    if (structure.lastCHoCH) {
      warnings.push('CHoCH detected — possible trend reversal');
    }

    // Sideways market with trend strategy
    if (structure.trend === 'SIDEWAYS' && strategy.category === 'TREND') {
      warnings.push('Trend strategy in sideways market — reduced reliability');
    }

    // Low ATR (low volatility)
    if (ta.atr > 0) {
      const lastPrice = ta.supportLevels[0] ?? 1;
      const atrPct = (ta.atr / lastPrice) * 100;
      if (atrPct < 0.3) {
        warnings.push('Very low volatility — tight price action');
      }
    }

    // Distribution phase with bullish signal
    if (structure.phase === 'DISTRIBUTION' && compositeScore > 0.3) {
      warnings.push('Distribution phase — be cautious on longs');
    }

    // Accumulation phase with bearish signal
    if (structure.phase === 'ACCUMULATION' && compositeScore < -0.3) {
      warnings.push('Accumulation phase — be cautious on shorts');
    }

    // Conflicting timeframe
    if (strategy.bestTimeframes.length > 0 && ta.timeframe) {
      if (!strategy.bestTimeframes.includes(ta.timeframe)) {
        warnings.push(`Suboptimal timeframe for ${strategy.displayName}`);
      }
    }

    return warnings.slice(0, 3);
  }
}
