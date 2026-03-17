import { Injectable, Logger } from '@nestjs/common';
import { ExternalDataService } from './external-data.service';
import { FundamentalAnalysisResult, AssetClass } from '../interfaces/signal.interface';

@Injectable()
export class FundamentalAnalysisService {
  private readonly logger = new Logger(FundamentalAnalysisService.name);

  constructor(private readonly externalData: ExternalDataService) {}

  async analyze(symbol: string, assetClass: AssetClass): Promise<FundamentalAnalysisResult> {
    const [news, fundamentals, globalMetrics, trending, orderBookImbalance] = await Promise.all([
      this.externalData.getNews(symbol, 20).catch(() => []),
      assetClass === 'CRYPTO'
        ? this.externalData.getCryptoFundamentals(symbol).catch(() => null)
        : Promise.resolve(null),
      assetClass === 'CRYPTO'
        ? this.externalData.getCryptoGlobalMetrics().catch(() => null)
        : Promise.resolve(null),
      assetClass === 'CRYPTO'
        ? this.externalData.getTrendingCrypto().catch(() => [] as string[])
        : Promise.resolve([] as string[]),
      assetClass === 'CRYPTO'
        ? this.externalData.getOrderBookImbalance(symbol).catch(() => 0)
        : Promise.resolve(0),
    ]);

    // ── News Sentiment ────────────────────────────────────────────────────────
    const sentimentScore = this.aggregateSentiment(news);

    // ── Catalyst detection ────────────────────────────────────────────────────
    const catalysts = this.extractCatalysts(symbol, fundamentals, news, trending);

    // ── Market metrics compilation ────────────────────────────────────────────
    const marketMetrics: Record<string, unknown> = {};

    if (fundamentals) {
      marketMetrics.marketCap = fundamentals.marketCap;
      marketMetrics.marketCapRank = fundamentals.marketCapRank;
      marketMetrics.volume24h = fundamentals.volume24h;
      marketMetrics.priceChange24h = fundamentals.priceChangePercent24h;
      marketMetrics.priceChange7d = fundamentals.priceChangePercent7d;
      marketMetrics.communityScore = fundamentals.communityScore;
      marketMetrics.developerScore = fundamentals.developerScore;
      marketMetrics.liquidityScore = fundamentals.liquidityScore;
    }

    if (globalMetrics) {
      const gm = globalMetrics as Record<string, unknown>;
      marketMetrics.globalMarketCapChangePercent24h = gm.market_cap_change_percentage_24h_usd;
      marketMetrics.btcDominance = (gm.market_cap_percentage as Record<string, number>)?.btc;
      marketMetrics.ethDominance = (gm.market_cap_percentage as Record<string, number>)?.eth;
    }

    if (orderBookImbalance !== 0) {
      marketMetrics.orderBookImbalance = orderBookImbalance;
    }

    // ── Composite fundamental score ───────────────────────────────────────────
    let compositeScore = sentimentScore * 0.4;

    if (fundamentals) {
      // Price momentum score (24h change)
      const momentumScore = Math.max(-0.5, Math.min(0.5, fundamentals.priceChangePercent24h / 20));
      compositeScore += momentumScore * 0.25;

      // Volume surge (high volume = conviction)
      // High volume with positive price = bullish, high volume with negative = bearish
      const volScore = fundamentals.priceChangePercent24h > 0 ? 0.1 : -0.1;
      compositeScore += volScore * 0.1;

      // Trending = additional bullish signal
      const bareSymbol = symbol.replace('USD', '').replace('USDT', '');
      if (trending.some((t) => t.toUpperCase() === bareSymbol.toUpperCase())) {
        compositeScore += 0.15;
        catalysts.unshift(`${bareSymbol} is currently trending on CoinGecko`);
      }
    }

    // Order book imbalance (crypto only)
    if (orderBookImbalance !== 0) {
      compositeScore += orderBookImbalance * 0.15;
    }

    // Global market context (crypto only)
    if (globalMetrics) {
      const gm = globalMetrics as Record<string, number>;
      const globalChange = gm.market_cap_change_percentage_24h_usd ?? 0;
      compositeScore += Math.max(-0.1, Math.min(0.1, globalChange / 50));
    }

    return {
      asset: symbol,
      compositeScore: Math.max(-1, Math.min(1, compositeScore)),
      sentimentScore,
      newsItems: news.slice(0, 10).map((n) => ({
        headline: n.headline,
        sentiment: n.sentiment ?? 0,
        source: n.source,
        publishedAt: n.publishedAt,
      })),
      marketMetrics: Object.keys(marketMetrics).length ? marketMetrics : undefined,
      catalysts,
      timestamp: new Date(),
    };
  }

  private aggregateSentiment(
    news: Array<{ sentiment?: number; publishedAt: Date; relevance?: number }>,
  ): number {
    if (!news.length) return 0;
    const now = Date.now();
    let weightedSum = 0, totalWeight = 0;

    for (const item of news) {
      const ageHours = (now - item.publishedAt.getTime()) / (1000 * 60 * 60);
      // Exponential decay: half-life 12 hours
      const recencyWeight = Math.exp(-ageHours / 12);
      const relevanceWeight = item.relevance ?? 0.7;
      const weight = recencyWeight * relevanceWeight;
      weightedSum += (item.sentiment ?? 0) * weight;
      totalWeight += weight;
    }
    return totalWeight > 0 ? Math.max(-1, Math.min(1, weightedSum / totalWeight)) : 0;
  }

  private extractCatalysts(
    symbol: string,
    fundamentals: { priceChangePercent24h: number; priceChangePercent7d?: number; marketCapRank: number } | null,
    news: Array<{ headline: string; sentiment?: number; source: string }>,
    trending: string[],
  ): string[] {
    const catalysts: string[] = [];

    if (fundamentals) {
      const c24h = fundamentals.priceChangePercent24h;
      const c7d = fundamentals.priceChangePercent7d ?? 0;

      if (c24h > 10) catalysts.push(`Strong 24h gain: +${c24h.toFixed(1)}%`);
      else if (c24h < -10) catalysts.push(`Strong 24h decline: ${c24h.toFixed(1)}%`);
      else if (Math.abs(c24h) > 5) catalysts.push(`Significant 24h move: ${c24h > 0 ? '+' : ''}${c24h.toFixed(1)}%`);

      if (Math.abs(c7d) > 15) {
        catalysts.push(`7-day ${c7d > 0 ? 'rally' : 'selloff'}: ${c7d > 0 ? '+' : ''}${c7d.toFixed(1)}%`);
      }

      if (fundamentals.marketCapRank <= 5) {
        catalysts.push(`Top ${fundamentals.marketCapRank} asset by market cap`);
      }
    }

    // High-sentiment news
    const bullishNews = news.filter((n) => (n.sentiment ?? 0) > 0.5).slice(0, 2);
    const bearishNews = news.filter((n) => (n.sentiment ?? 0) < -0.5).slice(0, 2);
    for (const item of bullishNews) {
      catalysts.push(`📈 ${item.headline.slice(0, 90)}`);
    }
    for (const item of bearishNews) {
      catalysts.push(`📉 ${item.headline.slice(0, 90)}`);
    }

    return catalysts.slice(0, 6);
  }

  /**
   * Returns a sentiment score for a given asset class using relevant keywords.
   * Used for FOREX, STOCK, COMMODITY where we don't have dedicated fundamentals.
   */
  async getAssetClassSentiment(symbol: string, assetClass: AssetClass): Promise<number> {
    const queries: string[] = [symbol];

    // Add contextual queries based on asset class
    if (assetClass === 'FOREX') {
      if (symbol.includes('USD')) queries.push('Federal Reserve', 'USD');
      if (symbol.includes('EUR')) queries.push('European Central Bank', 'Euro');
      if (symbol.includes('JPY')) queries.push('Bank of Japan', 'Yen');
      if (symbol.includes('GBP')) queries.push('Bank of England', 'Pound');
    } else if (assetClass === 'COMMODITY') {
      if (symbol.includes('XAU')) queries.push('gold price', 'inflation');
      if (symbol.includes('OIL') || symbol.includes('USO')) queries.push('crude oil', 'OPEC');
    } else if (assetClass === 'STOCK') {
      queries.push(symbol + ' earnings', symbol + ' stock');
    }

    const scores = await Promise.all(
      queries.map((q) => this.externalData.getNewsSentimentScore(q).catch(() => 0))
    );
    return scores.reduce((s, v) => s + v, 0) / scores.length;
  }
}
