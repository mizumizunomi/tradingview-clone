import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TechnicalAnalysisService } from './technical-analysis.service';
import { FundamentalAnalysisService } from './fundamental-analysis.service';
import { ExternalDataService } from './external-data.service';
import {
  SignalResult,
  AssetClass,
  SignalAction,
  TechnicalAnalysisResult,
  FundamentalAnalysisResult,
} from '../interfaces/signal.interface';

// Weight distribution per asset class:
// Crypto has more FA relevance (news, on-chain sentiment, OI)
// Forex has more macro/news relevance
// Stocks balance TA/FA
// Commodities mostly TA
const ASSET_CLASS_WEIGHTS: Record<AssetClass, { ta: number; fa: number }> = {
  CRYPTO: { ta: 0.60, fa: 0.40 },
  FOREX:  { ta: 0.65, fa: 0.35 },
  STOCK:  { ta: 0.60, fa: 0.40 },
  COMMODITY: { ta: 0.80, fa: 0.20 },
};

// Minimum composite score magnitude to generate a BUY/SELL (vs HOLD)
const SIGNAL_THRESHOLD = 0.25;

// Minimum confidence before persisting and broadcasting
const MIN_PERSIST_CONFIDENCE = 0.0; // always persist for dashboard visibility

@Injectable()
export class SignalEngineService {
  private readonly logger = new Logger(SignalEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly technicalAnalysis: TechnicalAnalysisService,
    private readonly fundamentalAnalysis: FundamentalAnalysisService,
    private readonly externalData: ExternalDataService,
  ) {}

  async generateSignal(
    userId: string,
    symbol: string,
    assetClass: AssetClass,
    timeframe = '1h',
    strategyName = 'DEFAULT',
  ): Promise<SignalResult> {
    this.logger.log(`Generating signal: ${symbol} [${assetClass}] ${timeframe}`);

    const weights = ASSET_CLASS_WEIGHTS[assetClass];

    // Run TA and FA in parallel
    const [ta, fa] = await Promise.all([
      this.technicalAnalysis.analyze(symbol, assetClass, timeframe),
      this.fundamentalAnalysis.analyze(symbol, assetClass),
    ]);

    // Weighted composite
    const compositeScore =
      ta.compositeScore * weights.ta + fa.compositeScore * weights.fa;

    // Map to action
    const action: SignalAction =
      compositeScore > SIGNAL_THRESHOLD ? 'BUY' :
      compositeScore < -SIGNAL_THRESHOLD ? 'SELL' : 'HOLD';

    // Confidence = normalised distance from threshold
    const distance = Math.abs(compositeScore) - (action !== 'HOLD' ? SIGNAL_THRESHOLD : 0);
    const confidence = action !== 'HOLD'
      ? Math.min(1, distance / (1 - SIGNAL_THRESHOLD) + SIGNAL_THRESHOLD)
      : Math.max(0, 1 - Math.abs(compositeScore) / SIGNAL_THRESHOLD) * 0.5;

    // Entry / SL / TP
    const currentPrice = await this.externalData.getCurrentPrice(symbol).catch(() => null);
    const { entryPrice, stopLoss, takeProfit } = this.calculateLevels(currentPrice, ta, action);

    const reasoning = this.buildReasoning(ta, fa, action, compositeScore, weights);
    const expiresAt = this.computeExpiry(timeframe);

    const result: SignalResult = {
      asset: symbol,
      assetClass,
      action,
      confidence: Math.max(0, Math.min(1, confidence)),
      strategy: strategyName,
      reasoning,
      technicalData: ta,
      fundamentalData: fa,
      entryPrice: entryPrice ?? undefined,
      stopLoss: stopLoss ?? undefined,
      takeProfit: takeProfit ?? undefined,
      timeframe,
      expiresAt,
    };

    await this.persistSignal(userId, result);
    return result;
  }

  /**
   * Generate signals for multiple assets at once (batch mode for the dashboard).
   */
  async generateBatchSignals(
    userId: string,
    assets: Array<{ symbol: string; assetClass: AssetClass }>,
    timeframe = '1h',
  ): Promise<SignalResult[]> {
    const maxConcurrent = parseInt(process.env.BOT_MAX_CONCURRENT_ANALYSES ?? '5');
    const results: SignalResult[] = [];

    // Process in chunks to respect rate limits
    for (let i = 0; i < assets.length; i += maxConcurrent) {
      const chunk = assets.slice(i, i + maxConcurrent);
      const chunkResults = await Promise.allSettled(
        chunk.map(({ symbol, assetClass }) =>
          this.generateSignal(userId, symbol, assetClass, timeframe)
        )
      );
      for (const r of chunkResults) {
        if (r.status === 'fulfilled') results.push(r.value);
        else this.logger.warn(`Batch signal failed: ${r.reason}`);
      }
    }
    return results;
  }

  private calculateLevels(
    currentPrice: number | null,
    ta: TechnicalAnalysisResult,
    action: SignalAction,
  ): { entryPrice: number | null; stopLoss: number | null; takeProfit: number | null } {
    if (!currentPrice || !ta.atr) return { entryPrice: null, stopLoss: null, takeProfit: null };

    const atr = ta.atr;
    const entryPrice = currentPrice;

    if (action === 'BUY') {
      // Stop just below nearest support or 1.5 ATR below entry
      const nearestSupport = ta.supportLevels
        .filter((s) => s < currentPrice * 0.999)
        .sort((a, b) => b - a)[0];
      const stopLoss = nearestSupport
        ? Math.max(nearestSupport * 0.999, entryPrice - 2 * atr)
        : entryPrice - 1.5 * atr;

      // Target at nearest resistance or 3 ATR above (min 2:1 R/R)
      const nearestResistance = ta.resistanceLevels
        .filter((r) => r > currentPrice * 1.001)
        .sort((a, b) => a - b)[0];
      const minTP = entryPrice + 2 * (entryPrice - stopLoss); // 2:1 R/R minimum
      const takeProfit = nearestResistance
        ? Math.max(nearestResistance, minTP)
        : entryPrice + 3 * atr;

      return { entryPrice, stopLoss, takeProfit };
    }

    if (action === 'SELL') {
      const nearestResistance = ta.resistanceLevels
        .filter((r) => r > currentPrice * 1.001)
        .sort((a, b) => a - b)[0];
      const stopLoss = nearestResistance
        ? Math.min(nearestResistance * 1.001, entryPrice + 2 * atr)
        : entryPrice + 1.5 * atr;

      const nearestSupport = ta.supportLevels
        .filter((s) => s < currentPrice * 0.999)
        .sort((a, b) => b - a)[0];
      const minTP = entryPrice - 2 * (stopLoss - entryPrice);
      const takeProfit = nearestSupport
        ? Math.min(nearestSupport, minTP)
        : entryPrice - 3 * atr;

      return { entryPrice, stopLoss, takeProfit };
    }

    return { entryPrice: null, stopLoss: null, takeProfit: null };
  }

  private buildReasoning(
    ta: TechnicalAnalysisResult,
    fa: FundamentalAnalysisResult,
    action: SignalAction,
    compositeScore: number,
    weights: { ta: number; fa: number },
  ): string {
    const parts: string[] = [];

    const confPct = (Math.abs(compositeScore) * 100).toFixed(0);
    const actionWord = action === 'BUY' ? '🟢 BUY' : action === 'SELL' ? '🔴 SELL' : '🟡 HOLD';
    parts.push(`${actionWord} signal with ${confPct}% composite score.`);

    // Trend
    parts.push(`Trend: ${ta.trend} on ${ta.timeframe} timeframe.`);

    // Top TA signals (most impactful indicators)
    const bullish = ta.indicators.filter((i) => i.score > 0.3).sort((a, b) => b.score - a.score).slice(0, 3);
    const bearish = ta.indicators.filter((i) => i.score < -0.3).sort((a, b) => a.score - b.score).slice(0, 3);
    if (bullish.length) parts.push(`Bullish signals: ${bullish.map((i) => i.name).join(', ')}.`);
    if (bearish.length) parts.push(`Bearish signals: ${bearish.map((i) => i.name).join(', ')}.`);

    // Patterns
    if (ta.patterns.length) {
      parts.push(`Patterns: ${ta.patterns.join(', ')}.`);
    }

    // Key levels
    const support = ta.supportLevels.at(-1);
    const resistance = ta.resistanceLevels.at(-1);
    if (support && resistance) {
      parts.push(`Key levels: Support ${support.toFixed(4)}, Resistance ${resistance.toFixed(4)}.`);
    }

    // FA
    if (weights.fa > 0.1) {
      const sentLabel = fa.sentimentScore > 0.2 ? 'positive' : fa.sentimentScore < -0.2 ? 'negative' : 'neutral';
      parts.push(`News sentiment: ${sentLabel} (${(fa.sentimentScore * 100).toFixed(0)}%).`);
      if (fa.catalysts.length) {
        parts.push(`Catalysts: ${fa.catalysts.slice(0, 2).join('; ')}.`);
      }
    }

    return parts.join(' ');
  }

  private computeExpiry(timeframe: string): Date {
    const multipliers: Record<string, number> = {
      '1m': 3, '5m': 15, '15m': 45, '30m': 90,
      '1h': 180, '4h': 720, '1d': 4320, '1w': 30240,
    };
    const minutes = multipliers[timeframe] ?? 180;
    return new Date(Date.now() + minutes * 60_000);
  }

  private async persistSignal(userId: string, signal: SignalResult): Promise<void> {
    try {
      await this.prisma.tradingSignal.create({
        data: {
          userId,
          asset: signal.asset,
          assetClass: signal.assetClass,
          action: signal.action,
          confidence: signal.confidence,
          strategy: signal.strategy,
          reasoning: signal.reasoning,
          technicalData: signal.technicalData as object,
          fundamentalData: signal.fundamentalData as object ?? undefined,
          entryPrice: signal.entryPrice ?? undefined,
          stopLoss: signal.stopLoss ?? undefined,
          takeProfit: signal.takeProfit ?? undefined,
          timeframe: signal.timeframe,
          status: 'PENDING',
          expiresAt: signal.expiresAt,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to persist signal: ${(err as Error).message}`);
    }
  }

  async getSignals(userId: string, filters?: {
    asset?: string;
    action?: string;
    status?: string;
    limit?: number;
  }) {
    return this.prisma.tradingSignal.findMany({
      where: {
        userId,
        ...(filters?.asset && { asset: filters.asset }),
        ...(filters?.action && { action: filters.action as SignalAction }),
        ...(filters?.status && {
          status: filters.status as 'PENDING' | 'EXECUTED' | 'EXPIRED' | 'CANCELLED',
        }),
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit ?? 50,
    });
  }

  async expireOldSignals(): Promise<number> {
    const result = await this.prisma.tradingSignal.updateMany({
      where: { status: 'PENDING', expiresAt: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    });
    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} stale signals`);
    }
    return result.count;
  }

  async getDashboardStats(userId: string) {
    const signals = await this.prisma.tradingSignal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const executed = signals.filter((s) => s.autoExecuted);
    const pending = signals.filter((s) => s.status === 'PENDING');
    const byAction = { BUY: 0, SELL: 0, HOLD: 0 };
    for (const s of signals) byAction[s.action]++;
    const avgConfidence = signals.length
      ? signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length : 0;
    return { totalSignals: signals.length, executedCount: executed.length, pendingCount: pending.length, byAction, avgConfidence };
  }
}
