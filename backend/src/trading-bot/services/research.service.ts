import { Injectable, Logger } from '@nestjs/common';
import { ExternalDataService } from './external-data.service';
import { TechnicalAnalysisService } from './technical-analysis.service';
import { FundamentalAnalysisService } from './fundamental-analysis.service';
import { ResearchReport, MultiTimeframeAnalysis } from '../interfaces/analysis.interface';
import { AssetClass } from '../interfaces/signal.interface';

@Injectable()
export class ResearchService {
  private readonly logger = new Logger(ResearchService.name);

  constructor(
    private readonly externalData: ExternalDataService,
    private readonly technicalAnalysis: TechnicalAnalysisService,
    private readonly fundamentalAnalysis: FundamentalAnalysisService,
  ) {}

  async generateReport(symbol: string, assetClass: AssetClass): Promise<ResearchReport> {
    this.logger.log(`Generating research report for ${symbol}`);

    const timeframes = ['1h', '4h', '1d'];

    // Run all analyses in parallel
    const [taResults, fa, news] = await Promise.all([
      Promise.all(
        timeframes.map((tf) =>
          this.technicalAnalysis.analyze(symbol, assetClass, tf).catch((err) => {
            this.logger.warn(`TA failed for ${symbol} ${tf}: ${(err as Error).message}`);
            return null;
          })
        )
      ),
      this.fundamentalAnalysis.analyze(symbol, assetClass).catch(() => null),
      this.externalData.getNews(symbol, 10).catch(() => []),
    ]);

    // Build multi-timeframe analysis
    const priceActionSummary: MultiTimeframeAnalysis = {
      asset: symbol,
      timeframes: {},
    };

    for (let i = 0; i < timeframes.length; i++) {
      const ta = taResults[i];
      if (ta) {
        priceActionSummary.timeframes[timeframes[i]] = {
          trend: ta.trend,
          compositeScore: ta.compositeScore,
          keyLevels: {
            support: ta.supportLevels,
            resistance: ta.resistanceLevels,
          },
        };
      }
    }

    // Correlations (simplified — BTC/ETH/SPX correlation for crypto)
    const correlations = {
      asset: symbol,
      correlatedAssets: assetClass === 'CRYPTO'
        ? [
            { symbol: 'BTC', correlation: symbol === 'BTCUSD' ? 1.0 : 0.75, period: '30d' },
            { symbol: 'ETH', correlation: symbol === 'ETHUSD' ? 1.0 : 0.68, period: '30d' },
          ]
        : [],
    };

    // Generate plain-English verdicts
    const primaryTA = taResults.find((r) => r !== null);
    const taScore = primaryTA?.compositeScore ?? 0;
    const faScore = fa?.compositeScore ?? 0;
    const combinedScore = taScore * 0.6 + faScore * 0.4;

    const technicalSummary = primaryTA
      ? this.buildTechnicalSummary(primaryTA, taResults.filter(Boolean) as NonNullable<typeof primaryTA>[])
      : 'Technical data unavailable.';

    const fundamentalSummary = fa
      ? this.buildFundamentalSummary(fa, news)
      : 'Fundamental data unavailable.';

    const overallVerdict = this.buildVerdict(combinedScore, technicalSummary, fundamentalSummary);

    // Entry/exit levels from primary timeframe
    const atr = primaryTA?.atr ?? 0;
    const lastSupport = primaryTA?.supportLevels.at(-1);
    const lastResistance = primaryTA?.resistanceLevels.at(-1);
    const currentPrice = await this.externalData.getCurrentPrice(symbol).catch(() => null);

    const dataSources = ['TwelveData'];
    if (assetClass === 'CRYPTO') dataSources.push('Binance', 'Bybit', 'CoinGecko');
    dataSources.push('NewsAggregator');

    return {
      asset: symbol,
      assetClass,
      generatedAt: new Date(),
      priceActionSummary,
      technicalSummary,
      fundamentalSummary,
      correlations,
      overallVerdict,
      confidence: Math.min(1, Math.abs(combinedScore)),
      suggestedEntry: currentPrice ?? undefined,
      suggestedStopLoss: currentPrice && atr
        ? combinedScore > 0 ? currentPrice - 1.5 * atr : currentPrice + 1.5 * atr
        : lastSupport,
      suggestedTakeProfit: currentPrice && atr
        ? combinedScore > 0 ? currentPrice + 3 * atr : currentPrice - 3 * atr
        : lastResistance,
      riskRewardRatio: 2.0,
      dataSources,
      unavailableSources: this.externalData.getUnavailableProviders(),
    };
  }

  private buildTechnicalSummary(
    primary: NonNullable<Awaited<ReturnType<TechnicalAnalysisService['analyze']>>>,
    all: NonNullable<Awaited<ReturnType<TechnicalAnalysisService['analyze']>>>[],
  ): string {
    const parts: string[] = [];
    parts.push(`${primary.trend === 'UPTREND' ? 'Bullish' : primary.trend === 'DOWNTREND' ? 'Bearish' : 'Sideways'} bias on 1h.`);

    const trends = all.map((r) => r.trend);
    const allBullish = trends.every((t) => t === 'UPTREND');
    const allBearish = trends.every((t) => t === 'DOWNTREND');
    if (allBullish) parts.push('All timeframes align bullish.');
    if (allBearish) parts.push('All timeframes align bearish.');

    const rsiInd = primary.indicators.find((i) => i.name.startsWith('RSI'));
    if (rsiInd) parts.push(`RSI at ${(rsiInd.value as number).toFixed(1)} (${rsiInd.signal.toLowerCase()}).`);

    if (primary.patterns.length) parts.push(`Patterns: ${primary.patterns.join(', ')}.`);
    if (primary.supportLevels.length) parts.push(`Support: ${primary.supportLevels.map((s) => s.toFixed(4)).join(', ')}.`);
    if (primary.resistanceLevels.length) parts.push(`Resistance: ${primary.resistanceLevels.map((r) => r.toFixed(4)).join(', ')}.`);

    return parts.join(' ');
  }

  private buildFundamentalSummary(
    fa: Awaited<ReturnType<FundamentalAnalysisService['analyze']>>,
    news: { headline: string; sentiment?: number }[],
  ): string {
    const parts: string[] = [];
    const sentiment = fa.sentimentScore;
    parts.push(`News sentiment: ${sentiment > 0.2 ? 'positive' : sentiment < -0.2 ? 'negative' : 'neutral'} (${(sentiment * 100).toFixed(0)}%).`);

    if (fa.catalysts.length) {
      parts.push(`Key catalysts: ${fa.catalysts.slice(0, 3).join('; ')}.`);
    }

    const topNewsItem = news[0];
    if (topNewsItem) parts.push(`Latest: "${topNewsItem.headline.slice(0, 80)}".`);

    return parts.join(' ');
  }

  private buildVerdict(score: number, technical: string, fundamental: string): string {
    const direction = score > 0.3 ? 'BULLISH' : score < -0.3 ? 'BEARISH' : 'NEUTRAL';
    const strength = Math.abs(score) > 0.6 ? 'strong' : Math.abs(score) > 0.3 ? 'moderate' : 'weak';
    return `Overall ${strength} ${direction} signal. ${technical} ${fundamental}`;
  }
}
