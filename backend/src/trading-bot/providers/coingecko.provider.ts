import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import {
  ICryptoFundamentalsProvider,
  CryptoFundamentals,
} from '../interfaces/provider.interface';

@Injectable()
export class CoinGeckoProvider implements ICryptoFundamentalsProvider {
  private readonly logger = new Logger(CoinGeckoProvider.name);
  private readonly client: AxiosInstance;
  private available = true;
  private readonly cache = new Map<string, { data: unknown; expiresAt: number }>();
  private readonly TTL_MS = 300_000; // 5 minutes

  // Our symbol → CoinGecko ID
  private readonly COIN_ID_MAP: Record<string, string> = {
    BTCUSD: 'bitcoin', ETHUSD: 'ethereum', BNBUSD: 'binancecoin',
    SOLUSD: 'solana', XRPUSD: 'ripple', ADAUSD: 'cardano',
    DOGEUSD: 'dogecoin', AVAXUSD: 'avalanche-2', DOTUSD: 'polkadot',
    LINKUSD: 'chainlink', UNIUSD: 'uniswap', LTCUSD: 'litecoin',
    BCHUSD: 'bitcoin-cash', ATOMUSD: 'cosmos',
    // Also support bare symbols
    BTC: 'bitcoin', ETH: 'ethereum', BNB: 'binancecoin',
    SOL: 'solana', XRP: 'ripple', ADA: 'cardano',
    DOGE: 'dogecoin', AVAX: 'avalanche-2', DOT: 'polkadot',
    LINK: 'chainlink', UNI: 'uniswap', LTC: 'litecoin',
    BCH: 'bitcoin-cash', ATOM: 'cosmos',
  };

  constructor() {
    const apiKey = process.env.COINGECKO_API_KEY;
    this.client = axios.create({
      baseURL: apiKey ? 'https://pro-api.coingecko.com/api/v3' : 'https://api.coingecko.com/api/v3',
      timeout: 15_000,
      headers: apiKey ? { 'x-cg-pro-api-key': apiKey } : {},
    });
  }

  getName(): string { return 'CoinGecko'; }
  isAvailable(): boolean { return this.available; }

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.data as T;
    return null;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, { data, expiresAt: Date.now() + this.TTL_MS });
  }

  private toCoinId(symbol: string): string | null {
    return this.COIN_ID_MAP[symbol.toUpperCase()] ?? null;
  }

  async getFundamentals(symbol: string): Promise<CryptoFundamentals | null> {
    const coinId = this.toCoinId(symbol);
    if (!coinId) {
      this.logger.debug(`No CoinGecko ID mapping for ${symbol}`);
      return null;
    }

    const cacheKey = `fundamentals:${coinId}`;
    const cached = this.getCached<CryptoFundamentals>(cacheKey);
    if (cached) return cached;

    try {
      const res = await this.client.get(`/coins/${coinId}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: true,
          developer_data: true,
          sparkline: false,
        },
      });
      this.available = true;
      const d = res.data;
      const md = d.market_data;
      const result: CryptoFundamentals = {
        id: coinId,
        symbol: d.symbol.toUpperCase(),
        name: d.name,
        marketCap: md.market_cap?.usd ?? 0,
        marketCapRank: d.market_cap_rank ?? 0,
        volume24h: md.total_volume?.usd ?? 0,
        priceChangePercent24h: md.price_change_percentage_24h ?? 0,
        priceChangePercent7d: md.price_change_percentage_7d ?? undefined,
        circulatingSupply: md.circulating_supply ?? undefined,
        totalSupply: md.total_supply ?? undefined,
        developerScore: d.developer_score ?? undefined,
        communityScore: d.community_score ?? undefined,
        liquidityScore: d.liquidity_score ?? undefined,
        publicInterestScore: d.public_interest_score ?? undefined,
      };
      this.setCache(cacheKey, result);
      return result;
    } catch (err) {
      this.available = false;
      this.logger.warn(`CoinGecko fundamentals failed for ${symbol}: ${(err as Error).message}`);
      return null;
    }
  }

  async getGlobalMetrics(): Promise<Record<string, unknown> | null> {
    const cacheKey = 'global_metrics';
    const cached = this.getCached<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    try {
      const res = await this.client.get('/global');
      this.available = true;
      const data = res.data.data as Record<string, unknown>;
      this.setCache(cacheKey, data);
      return data;
    } catch (err) {
      this.available = false;
      this.logger.warn(`CoinGecko global metrics failed: ${(err as Error).message}`);
      return null;
    }
  }

  async getTrending(): Promise<string[]> {
    const cacheKey = 'trending';
    const cached = this.getCached<string[]>(cacheKey);
    if (cached) return cached;

    try {
      const res = await this.client.get('/search/trending');
      this.available = true;
      const coins = (res.data.coins as Array<{ item: { symbol: string } }>)
        .map((c) => c.item.symbol.toUpperCase());
      this.setCache(cacheKey, coins);
      return coins;
    } catch (err) {
      this.available = false;
      this.logger.warn(`CoinGecko trending failed: ${(err as Error).message}`);
      return [];
    }
  }

  async getMarketChart(symbol: string, days: number): Promise<Array<[number, number]>> {
    const coinId = this.toCoinId(symbol);
    if (!coinId) return [];
    const cacheKey = `chart:${coinId}:${days}`;
    const cached = this.getCached<Array<[number, number]>>(cacheKey);
    if (cached) return cached;

    try {
      const res = await this.client.get(`/coins/${coinId}/market_chart`, {
        params: { vs_currency: 'usd', days },
      });
      this.available = true;
      const prices = res.data.prices as Array<[number, number]>;
      this.setCache(cacheKey, prices);
      return prices;
    } catch (err) {
      this.logger.warn(`CoinGecko market chart failed for ${symbol}: ${(err as Error).message}`);
      return [];
    }
  }

  async getTopCoins(limit = 20): Promise<CryptoFundamentals[]> {
    const cacheKey = `top:${limit}`;
    const cached = this.getCached<CryptoFundamentals[]>(cacheKey);
    if (cached) return cached;

    try {
      const res = await this.client.get('/coins/markets', {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: limit,
          page: 1,
          sparkline: false,
          price_change_percentage: '24h,7d',
        },
      });
      this.available = true;
      const result: CryptoFundamentals[] = (res.data as Array<Record<string, unknown>>).map((c) => ({
        id: c.id as string,
        symbol: (c.symbol as string).toUpperCase(),
        name: c.name as string,
        marketCap: (c.market_cap as number) ?? 0,
        marketCapRank: (c.market_cap_rank as number) ?? 0,
        volume24h: (c.total_volume as number) ?? 0,
        priceChangePercent24h: (c.price_change_percentage_24h as number) ?? 0,
        priceChangePercent7d: (c.price_change_percentage_7d_in_currency as number) ?? undefined,
        circulatingSupply: (c.circulating_supply as number) ?? undefined,
        totalSupply: (c.total_supply as number) ?? undefined,
      }));
      this.setCache(cacheKey, result);
      return result;
    } catch (err) {
      this.available = false;
      this.logger.warn(`CoinGecko top coins failed: ${(err as Error).message}`);
      return [];
    }
  }
}
