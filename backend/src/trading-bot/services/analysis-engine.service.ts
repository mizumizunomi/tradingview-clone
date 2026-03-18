import { Injectable, Logger } from '@nestjs/common';
import { TechnicalAnalysisService } from './technical-analysis.service';
import { FundamentalAnalysisService } from './fundamental-analysis.service';
import { ExternalDataService } from './external-data.service';
import { LevelDetectionService } from './level-detection.service';
import { ChartDataService } from './chart-data.service';
import { AssetClass, SignalAction, TechnicalAnalysisResult } from '../interfaces/signal.interface';
import { AnalysisResponse } from '../interfaces/analysis-response.interface';

const ASSET_CLASS_WEIGHTS: Record<AssetClass, { ta: number; fa: number }> = {
  CRYPTO: { ta: 0.60, fa: 0.40 },
  FOREX:  { ta: 0.65, fa: 0.35 },
  STOCK:  { ta: 0.60, fa: 0.40 },
  COMMODITY: { ta: 0.80, fa: 0.20 },
};

const SIGNAL_THRESHOLD = 0.25;

const RELATED_TIMEFRAMES: Record<string, string[]> = {
  '1m': ['5m', '15m', '1h'],
  '5m': ['15m', '1h', '4h'],
  '15m': ['1h', '4h', '1D'],
  '30m': ['1h', '4h', '1D'],
  '1h': ['4h', '1D'],
  '4h': ['1D', '1W'],
  '1D': ['1W'],
  '1W': ['1D'],
};

@Injectable()
export class AnalysisEngineService {
  private readonly logger = new Logger(AnalysisEngineService.name);

  constructor(
    private readonly ta: TechnicalAnalysisService,
    private readonly fa: FundamentalAnalysisService,
    private readonly externalData: ExternalDataService,
    private readonly levelDetection: LevelDetectionService,
    private readonly chartData: ChartDataService,
  ) {}

  async analyze(
    symbol: string,
    assetClass: AssetClass,
    timeframe: string,
  ): Promise<AnalysisResponse> {
    this.logger.log(`Full analysis: ${symbol} [${assetClass}] ${timeframe}`);

    const weights = ASSET_CLASS_WEIGHTS[assetClass];

    // ── 1. Run TA, FA, and multi-timeframe in parallel ──────────────────────
    const [primaryTA, faResult, candles, currentPrice] = await Promise.allSettled([
      this.ta.analyze(symbol, assetClass, timeframe),
      this.fa.analyze(symbol, assetClass),
      this.externalData.getCandles(symbol, timeframe, assetClass, 300),
      this.externalData.getCurrentPrice(symbol),
    ]);

    const taResult = primaryTA.status === 'fulfilled' ? primaryTA.value : this.emptyTA(symbol, timeframe);
    const fundamentals = faResult.status === 'fulfilled' ? faResult.value : null;
    const candleData = candles.status === 'fulfilled' ? candles.value : [];
    const livePrice = currentPrice.status === 'fulfilled' ? currentPrice.value : null;

    // ── 2. Composite score ───────────────────────────────────────────────────
    const faScore = fundamentals?.compositeScore ?? 0;
    const compositeScore = taResult.compositeScore * weights.ta + faScore * weights.fa;

    const action: SignalAction =
      compositeScore > SIGNAL_THRESHOLD ? 'BUY' :
      compositeScore < -SIGNAL_THRESHOLD ? 'SELL' : 'HOLD';

    const distance = Math.abs(compositeScore) - (action !== 'HOLD' ? SIGNAL_THRESHOLD : 0);
    const rawConfidence = action !== 'HOLD'
      ? Math.min(1, distance / (1 - SIGNAL_THRESHOLD) + SIGNAL_THRESHOLD)
      : Math.max(0, 1 - Math.abs(compositeScore) / SIGNAL_THRESHOLD) * 0.5;
    const confidence = Math.round(rawConfidence * 100);

    // ── 3. Support / Resistance levels ──────────────────────────────────────
    const srLevels = candleData.length >= 10
      ? this.levelDetection.detectLevels(candleData)
      : { supports: [], resistances: [] };

    const fibData = candleData.length >= 10
      ? this.levelDetection.getFibonacciLevels(candleData)
      : null;

    // ── 4. Calculate trade levels ────────────────────────────────────────────
    const price = livePrice ?? (candleData.length > 0 ? candleData[candleData.length - 1].close : 0);
    const atr = taResult.atr || price * 0.015;

    const nearestSupport = srLevels.supports[0]?.price ?? (price - atr * 2);
    const nearestResistance = srLevels.resistances[0]?.price ?? (price + atr * 2);

    let entry = price;
    let stopLoss: number;
    let takeProfit1: number;
    let takeProfit2: number;

    if (action === 'BUY') {
      stopLoss = nearestSupport - atr * 0.5;
      takeProfit1 = nearestResistance;
      takeProfit2 = entry + (entry - stopLoss) * 2;
    } else if (action === 'SELL') {
      stopLoss = nearestResistance + atr * 0.5;
      takeProfit1 = nearestSupport;
      takeProfit2 = entry - (stopLoss - entry) * 2;
    } else {
      stopLoss = price - atr * 2;
      takeProfit1 = price + atr * 2;
      takeProfit2 = price + atr * 4;
    }

    const risk = Math.abs(entry - stopLoss);
    const reward = Math.abs(takeProfit1 - entry);
    const riskRewardRatio = risk > 0 ? parseFloat((reward / risk).toFixed(2)) : 0;

    // ── 5. Multi-timeframe ───────────────────────────────────────────────────
    const relatedTfs = RELATED_TIMEFRAMES[timeframe] ?? [];
    const mtfResults = await this.getMultiTimeframe(symbol, assetClass, relatedTfs.slice(0, 2));

    const confluenceScore = mtfResults.filter((m) => {
      const a = action;
      return (a === 'BUY' && m.signal === 'bullish') || (a === 'SELL' && m.signal === 'bearish');
    }).length / Math.max(mtfResults.length, 1);

    // ── 6. Build summary text ────────────────────────────────────────────────
    const summary = this.buildSummary(symbol, action, confidence, taResult, compositeScore, price, entry, stopLoss, takeProfit1);

    // ── 7. Format indicators for response ───────────────────────────────────
    const formattedIndicators = this.formatIndicators(taResult);

    // ── 8. Fundamental data for response ────────────────────────────────────
    const newsHeadlines = (fundamentals?.newsItems ?? []).slice(0, 5).map((n) => ({
      title: n.headline,
      sentiment: n.sentiment,
      source: n.source,
    }));

    const sentimentScore = fundamentals?.sentimentScore ?? 0;
    const sentimentLabel = sentimentScore > 0.3 ? 'Positive' : sentimentScore < -0.3 ? 'Negative' : 'Neutral';

    // ── 9. Build chart drawings ──────────────────────────────────────────────
    const currentTime = candleData.length > 0 ? candleData[candleData.length - 1].time : Math.floor(Date.now() / 1000);

    const drawings = this.chartData.buildDrawingSet({
      asset: symbol,
      timeframe,
      action,
      confidence: rawConfidence,
      levels: {
        entry,
        stopLoss,
        takeProfit1,
        takeProfit2,
        supports: srLevels.supports,
        resistances: srLevels.resistances,
      },
      fib: fibData,
      ta: taResult,
      currentTime,
      currentPrice: price,
    });

    // ── 10. Assemble response ────────────────────────────────────────────────
    const strength = confidence >= 70 ? 'strong' : confidence >= 50 ? 'moderate' : 'weak';

    return {
      asset: symbol,
      timeframe,
      timestamp: new Date().toISOString(),

      verdict: {
        action,
        confidence,
        strength,
        summary,
      },

      levels: {
        entry,
        stopLoss,
        takeProfit1,
        takeProfit2,
        riskRewardRatio,
      },

      technicals: {
        trend: taResult.trend === 'UPTREND' ? 'bullish' : taResult.trend === 'DOWNTREND' ? 'bearish' : 'neutral',
        compositeScore: parseFloat(compositeScore.toFixed(3)),
        indicators: formattedIndicators,
        patterns: (taResult.patterns ?? []).map((p) => ({
          name: p,
          status: 'forming' as const,
          direction: compositeScore >= 0 ? 'bullish' as const : 'bearish' as const,
          detail: p,
        })),
        supportResistance: {
          supports: srLevels.supports.map((s) => ({
            price: s.price, strength: parseFloat(s.strength.toFixed(3)), touches: s.touches,
          })),
          resistances: srLevels.resistances.map((r) => ({
            price: r.price, strength: parseFloat(r.strength.toFixed(3)), touches: r.touches,
          })),
        },
      },

      multiTimeframe: mtfResults,
      confluenceScore: parseFloat(confluenceScore.toFixed(2)),

      fundamentals: {
        newsSentiment: {
          score: parseFloat(sentimentScore.toFixed(2)),
          label: sentimentLabel,
          headlines: newsHeadlines,
        },
        marketData: fundamentals?.marketMetrics
          ? this.extractMarketData(fundamentals.marketMetrics)
          : undefined,
      },

      drawings,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async getMultiTimeframe(
    symbol: string,
    assetClass: AssetClass,
    timeframes: string[],
  ): Promise<{ timeframe: string; signal: 'bullish' | 'bearish' | 'neutral'; confidence: number }[]> {
    const results = await Promise.allSettled(
      timeframes.map((tf) => this.ta.analyze(symbol, assetClass, tf)),
    );
    return results.map((r, i) => {
      if (r.status !== 'fulfilled') return { timeframe: timeframes[i], signal: 'neutral' as const, confidence: 0 };
      const score = r.value.compositeScore;
      return {
        timeframe: timeframes[i],
        signal: score > 0.2 ? 'bullish' : score < -0.2 ? 'bearish' : 'neutral',
        confidence: Math.round(Math.min(1, Math.abs(score) / 0.5) * 100),
      };
    });
  }

  private formatIndicators(ta: TechnicalAnalysisResult): AnalysisResponse['technicals']['indicators'] {
    return (ta.indicators ?? []).map((ind) => {
      const val = Array.isArray(ind.value) ? ind.value[0] : ind.value;
      const numVal = typeof val === 'number' ? val : 0;
      let detail = '';

      if (ind.name.toLowerCase().includes('rsi')) {
        detail = numVal > 70 ? `RSI at ${numVal.toFixed(1)} — overbought`
          : numVal < 30 ? `RSI at ${numVal.toFixed(1)} — oversold`
          : `RSI at ${numVal.toFixed(1)}`;
      } else if (ind.name.toLowerCase().includes('macd')) {
        detail = `MACD ${ind.signal === 'BULLISH' ? 'bullish crossover' : ind.signal === 'BEARISH' ? 'bearish crossover' : 'neutral'}`;
      } else if (ind.name.toLowerCase().includes('bb')) {
        detail = `Bollinger: price ${ind.signal === 'BULLISH' ? 'near lower band (bounce potential)' : ind.signal === 'BEARISH' ? 'near upper band (reversal risk)' : 'mid-band'}`;
      } else if (ind.name.toLowerCase().includes('adx')) {
        detail = numVal > 25 ? `ADX ${numVal.toFixed(1)} — strong trend` : `ADX ${numVal.toFixed(1)} — weak trend`;
      } else {
        detail = `${ind.name}: ${typeof val === 'number' ? val.toFixed(2) : '—'} (${ind.signal})`;
      }

      return {
        name: ind.name,
        value: typeof val === 'number' ? parseFloat(numVal.toFixed(4)) : (val ?? '—'),
        signal: ind.signal === 'BULLISH' ? 'bullish' : ind.signal === 'BEARISH' ? 'bearish' : 'neutral',
        detail,
      };
    });
  }

  private buildSummary(
    symbol: string,
    action: SignalAction,
    confidence: number,
    ta: TechnicalAnalysisResult,
    score: number,
    price: number,
    entry: number,
    sl: number,
    tp: number,
  ): string {
    const priceStr = price >= 1 ? `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : `$${price.toFixed(4)}`;
    const trend = ta.trend === 'UPTREND' ? 'bullish' : ta.trend === 'DOWNTREND' ? 'bearish' : 'sideways';
    const rsi = ta.indicators?.find((i) => i.name.toLowerCase().includes('rsi'));
    const rsiVal = rsi ? (Array.isArray(rsi.value) ? rsi.value[0] : rsi.value) : null;
    const topPatterns = (ta.patterns ?? []).slice(0, 2).join(', ');

    let summary = `${symbol} is trading at ${priceStr} in a ${trend} trend (composite score: ${score.toFixed(2)}). `;

    if (rsiVal !== null && typeof rsiVal === 'number') {
      summary += `RSI at ${rsiVal.toFixed(1)}${rsiVal > 70 ? ' (overbought)' : rsiVal < 30 ? ' (oversold)' : ''}. `;
    }

    if (topPatterns) summary += `Patterns detected: ${topPatterns}. `;

    if (action === 'BUY') {
      summary += `Recommend BUY with ${confidence}% confidence. Entry near $${entry.toFixed(2)}, stop-loss at $${sl.toFixed(2)}, target $${tp.toFixed(2)}.`;
    } else if (action === 'SELL') {
      summary += `Recommend SELL with ${confidence}% confidence. Entry near $${entry.toFixed(2)}, stop-loss at $${sl.toFixed(2)}, target $${tp.toFixed(2)}.`;
    } else {
      summary += `No clear directional edge. Recommend HOLD and wait for a stronger setup.`;
    }

    return summary;
  }

  private extractMarketData(metrics: Record<string, unknown>): AnalysisResponse['fundamentals']['marketData'] {
    return {
      volume24h: metrics.total_volume as number | undefined,
      volumeChange: metrics.volume_change_24h as number | undefined,
      marketCap: metrics.market_cap as number | undefined,
      fearGreedIndex: metrics.fear_greed_index as number | undefined,
      fundingRate: metrics.funding_rate as number | undefined,
      openInterest: metrics.open_interest as number | undefined,
    };
  }

  private emptyTA(symbol: string, timeframe: string): TechnicalAnalysisResult {
    return {
      asset: symbol,
      timeframe,
      compositeScore: 0,
      indicators: [],
      supportLevels: [],
      resistanceLevels: [],
      trend: 'SIDEWAYS',
      patterns: [],
      atr: 0,
      timestamp: new Date(),
    };
  }
}
