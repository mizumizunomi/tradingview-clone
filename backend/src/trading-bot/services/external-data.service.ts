import { Injectable, Logger } from '@nestjs/common';
import { BinanceProvider } from '../providers/binance.provider';
import { BybitProvider } from '../providers/bybit.provider';
import { CoinGeckoProvider } from '../providers/coingecko.provider';
import { TwelveDataProvider } from '../providers/twelvedata.provider';
import { NewsAggregatorProvider } from '../providers/news-aggregator.provider';
import {
  OHLCVCandle,
  OrderBook,
  CryptoFundamentals,
  NewsItem,
  ProviderStatus,
  FundingRate,
  OpenInterest,
} from '../interfaces/provider.interface';
import { AssetClass } from '../interfaces/signal.interface';

/**
 * ExternalDataService is the single entry-point for all external market data.
 * It abstracts provider selection, fallback chains, and graceful degradation.
 * Callers never need to know which provider is being used.
 */
@Injectable()
export class ExternalDataService {
  private readonly logger = new Logger(ExternalDataService.name);

  // In-memory cache: cacheKey → { data, expiresAt }
  private readonly cache = new Map<string, { data: unknown; expiresAt: number }>();
  private readonly TTL_MS = (parseInt(process.env.BOT_CACHE_TTL_SECONDS ?? '300') * 1000);

  constructor(
    private readonly binance: BinanceProvider,
    private readonly bybit: BybitProvider,
    private readonly coinGecko: CoinGeckoProvider,
    private readonly twelveData: TwelveDataProvider,
    private readonly newsAggregator: NewsAggregatorProvider,
  ) {}

  // ── Cache helpers ────────────────────────────────────────────────────────────

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && entry.expiresAt > Date.now()) return entry.data as T;
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: unknown, ttlMs?: number): void {
    this.cache.set(key, { data, expiresAt: Date.now() + (ttlMs ?? this.TTL_MS) });
  }

  // ── Candle Data ──────────────────────────────────────────────────────────────

  /**
   * Fetch OHLCV candles with provider fallback chain.
   * For crypto: Binance → Bybit → TwelveData
   * For everything else: TwelveData only
   */
  async getCandles(
    symbol: string,
    interval: string,
    assetClass: AssetClass,
    limit = 200,
  ): Promise<OHLCVCandle[]> {
    const cacheKey = `candles:${symbol}:${interval}:${limit}`;
    const cached = this.getCached<OHLCVCandle[]>(cacheKey);
    if (cached) return cached;

    let candles: OHLCVCandle[] = [];

    if (assetClass === 'CRYPTO') {
      candles = await this.binance.getCandles(symbol, interval, limit);
      if (!candles.length) candles = await this.bybit.getCandles(symbol, interval, limit);
      if (!candles.length) candles = await this.twelveData.getCandles(symbol, interval, limit);
    } else {
      candles = await this.twelveData.getCandles(symbol, interval, limit);
    }

    if (candles.length) this.setCache(cacheKey, candles, 60_000); // 1 min for price data
    else this.logger.warn(`No candles available for ${symbol} ${interval}`);

    return candles;
  }

  // ── Order Book ───────────────────────────────────────────────────────────────

  async getOrderBook(symbol: string, assetClass: AssetClass): Promise<OrderBook | null> {
    if (assetClass !== 'CRYPTO') return null;
    const cacheKey = `orderbook:${symbol}`;
    const cached = this.getCached<OrderBook>(cacheKey);
    if (cached) return cached;

    let book = await this.binance.getOrderBook(symbol);
    if (!book) book = await this.bybit.getOrderBook(symbol);

    if (book) this.setCache(cacheKey, book, 10_000); // 10s for order books
    return book;
  }

  // ── Order Book Imbalance ─────────────────────────────────────────────────────

  /**
   * Returns a value from -1 (heavy sell pressure) to +1 (heavy buy pressure).
   */
  async getOrderBookImbalance(symbol: string): Promise<number> {
    const book = await this.getOrderBook(symbol, 'CRYPTO');
    if (!book) return 0;
    const topLevels = 10;
    const bidVolume = book.bids.slice(0, topLevels).reduce((s, l) => s + l.quantity, 0);
    const askVolume = book.asks.slice(0, topLevels).reduce((s, l) => s + l.quantity, 0);
    const total = bidVolume + askVolume;
    if (total === 0) return 0;
    return (bidVolume - askVolume) / total; // -1 to +1
  }

  // ── Crypto Derivatives ───────────────────────────────────────────────────────

  async getFundingRate(symbol: string): Promise<FundingRate | null> {
    const cacheKey = `funding:${symbol}`;
    const cached = this.getCached<FundingRate>(cacheKey);
    if (cached) return cached;

    let rate = await this.binance.getFundingRate(symbol);
    if (!rate) rate = await this.bybit.getFundingRate(symbol);

    if (rate) this.setCache(cacheKey, rate, 60_000);
    return rate;
  }

  async getOpenInterest(symbol: string): Promise<OpenInterest | null> {
    const cacheKey = `oi:${symbol}`;
    const cached = this.getCached<OpenInterest>(cacheKey);
    if (cached) return cached;

    let oi = await this.binance.getOpenInterest(symbol);
    if (!oi) oi = await this.bybit.getOpenInterest(symbol);

    if (oi) this.setCache(cacheKey, oi, 60_000);
    return oi;
  }

  // ── Crypto Fundamentals ──────────────────────────────────────────────────────

  async getCryptoFundamentals(symbol: string): Promise<CryptoFundamentals | null> {
    return this.coinGecko.getFundamentals(symbol);
  }

  async getCryptoGlobalMetrics(): Promise<Record<string, unknown> | null> {
    return this.coinGecko.getGlobalMetrics();
  }

  async getTrendingCrypto(): Promise<string[]> {
    return this.coinGecko.getTrending();
  }

  // ── Technical Indicators (TwelveData) ────────────────────────────────────────

  async getRSI(symbol: string, interval: string, period = 14): Promise<number | null> {
    return this.twelveData.getRSI(symbol, interval, period);
  }

  async getMACD(symbol: string, interval: string): Promise<{ macd: number; signal: number; histogram: number } | null> {
    return this.twelveData.getMACD(symbol, interval);
  }

  async getBollingerBands(symbol: string, interval: string): Promise<{ upper: number; middle: number; lower: number } | null> {
    return this.twelveData.getBollingerBands(symbol, interval);
  }

  async getEMA(symbol: string, interval: string, period: number): Promise<number | null> {
    return this.twelveData.getEMA(symbol, interval, period);
  }

  async getATR(symbol: string, interval: string, period = 14): Promise<number | null> {
    return this.twelveData.getATR(symbol, interval, period);
  }

  async getADX(symbol: string, interval: string): Promise<number | null> {
    return this.twelveData.getADX(symbol, interval);
  }

  async getStoch(symbol: string, interval: string): Promise<{ k: number; d: number } | null> {
    return this.twelveData.getStoch(symbol, interval);
  }

  async getCurrentPrice(symbol: string): Promise<number | null> {
    return this.twelveData.getCurrentPrice(symbol);
  }

  // ── News & Sentiment ─────────────────────────────────────────────────────────

  async getNews(symbol: string, limit = 20): Promise<NewsItem[]> {
    return this.newsAggregator.getNews(symbol, limit);
  }

  async getNewsSentimentScore(symbol: string): Promise<number> {
    return this.newsAggregator.getNewsSentimentScore(symbol);
  }

  // ── Provider Status ──────────────────────────────────────────────────────────

  getProviderStatuses(): ProviderStatus[] {
    return [
      { name: 'Binance', available: this.binance.isAvailable(), lastChecked: new Date() },
      { name: 'Bybit', available: this.bybit.isAvailable(), lastChecked: new Date() },
      { name: 'CoinGecko', available: this.coinGecko.isAvailable(), lastChecked: new Date() },
      { name: 'TwelveData', available: this.twelveData.isAvailable(), lastChecked: new Date() },
      { name: 'NewsAggregator', available: this.newsAggregator.isAvailable(), lastChecked: new Date() },
    ];
  }

  getUnavailableProviders(): string[] {
    return this.getProviderStatuses()
      .filter((s) => !s.available)
      .map((s) => s.name);
  }

  // ── Cache Management ─────────────────────────────────────────────────────────

  clearCache(): void {
    this.cache.clear();
    this.logger.log('ExternalDataService cache cleared');
  }

  getCacheStats(): { size: number; keys: string[] } {
    return { size: this.cache.size, keys: Array.from(this.cache.keys()) };
  }
}
