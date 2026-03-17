import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { INewsProvider, NewsItem } from '../interfaces/provider.interface';

// Simple keyword-based sentiment scoring
function scoreSentiment(text: string): number {
  const bullish = [
    'surge', 'soar', 'jump', 'rally', 'gain', 'rise', 'bull', 'bullish', 'positive',
    'growth', 'record', 'high', 'beat', 'exceed', 'strong', 'buy', 'upgrade', 'breakout',
    'adoption', 'approval', 'launch', 'partnership', 'profit', 'earnings', 'revenue',
  ];
  const bearish = [
    'crash', 'plunge', 'drop', 'fall', 'decline', 'bear', 'bearish', 'negative', 'loss',
    'low', 'miss', 'weak', 'sell', 'downgrade', 'breakdown', 'ban', 'hack', 'breach',
    'fraud', 'lawsuit', 'regulation', 'restrict', 'fine', 'penalty', 'concern', 'risk',
  ];
  const lower = text.toLowerCase();
  let score = 0;
  for (const word of bullish) {
    const matches = (lower.match(new RegExp(`\\b${word}\\b`, 'g')) ?? []).length;
    score += matches * 0.1;
  }
  for (const word of bearish) {
    const matches = (lower.match(new RegExp(`\\b${word}\\b`, 'g')) ?? []).length;
    score -= matches * 0.1;
  }
  return Math.max(-1, Math.min(1, score));
}

@Injectable()
export class NewsAggregatorProvider implements INewsProvider {
  private readonly logger = new Logger(NewsAggregatorProvider.name);
  private readonly cache = new Map<string, { data: NewsItem[]; expiresAt: number }>();
  private readonly TTL_MS = 300_000; // 5 minutes
  private available = true;

  // Finnhub client
  private readonly finnhubClient: AxiosInstance;
  // NewsAPI client
  private readonly newsApiClient: AxiosInstance;

  private readonly FINNHUB_KEY = process.env.FINNHUB_API_KEY;
  private readonly NEWS_API_KEY = process.env.NEWS_API_KEY;

  constructor() {
    this.finnhubClient = axios.create({
      baseURL: 'https://finnhub.io/api/v1',
      timeout: 10_000,
    });
    this.newsApiClient = axios.create({
      baseURL: 'https://newsapi.org/v2',
      timeout: 10_000,
    });
  }

  getName(): string { return 'NewsAggregator'; }
  isAvailable(): boolean { return this.available; }

  private getCached(key: string): NewsItem[] | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.data;
    return null;
  }

  private setCache(key: string, data: NewsItem[]): void {
    this.cache.set(key, { data, expiresAt: Date.now() + this.TTL_MS });
  }

  async getNews(query: string, limit = 20): Promise<NewsItem[]> {
    const cacheKey = `news:${query}:${limit}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const results: NewsItem[] = [];

    // Try Finnhub first (better for stocks/crypto)
    if (this.FINNHUB_KEY) {
      const finnhubResults = await this.fetchFinnhubNews(query, limit);
      results.push(...finnhubResults);
    }

    // Supplement with NewsAPI if we don't have enough
    if (results.length < limit / 2 && this.NEWS_API_KEY) {
      const newsApiResults = await this.fetchNewsApiNews(query, limit);
      // Deduplicate by headline
      const existingHeadlines = new Set(results.map((r) => r.headline.toLowerCase()));
      for (const item of newsApiResults) {
        if (!existingHeadlines.has(item.headline.toLowerCase())) {
          results.push(item);
        }
      }
    }

    // Fall back to free RSS-based news if no API keys
    if (results.length === 0) {
      const rssResults = await this.fetchPublicRssNews(query, limit);
      results.push(...rssResults);
    }

    // Sort by date descending, limit
    const sorted = results
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
      .slice(0, limit);

    this.setCache(cacheKey, sorted);
    this.available = sorted.length > 0;
    return sorted;
  }

  private async fetchFinnhubNews(query: string, limit: number): Promise<NewsItem[]> {
    try {
      // For crypto/forex/stock symbols, use company/general news
      const category = this.detectCategory(query);
      let endpoint: string;
      let params: Record<string, string | number>;

      if (category === 'crypto') {
        endpoint = '/news';
        params = { category: 'crypto', token: this.FINNHUB_KEY! };
      } else if (category === 'stock') {
        const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const toDate = new Date().toISOString().split('T')[0];
        endpoint = `/company-news`;
        params = { symbol: query.toUpperCase(), from: fromDate, to: toDate, token: this.FINNHUB_KEY! };
      } else {
        endpoint = '/news';
        params = { category: 'forex', token: this.FINNHUB_KEY! };
      }

      const res = await this.finnhubClient.get(endpoint, { params });
      const articles = Array.isArray(res.data) ? res.data : [];

      return articles.slice(0, limit).map((a: Record<string, unknown>) => {
        const headline = (a.headline as string) ?? '';
        const summary = (a.summary as string) ?? '';
        const sentimentScore = scoreSentiment(`${headline} ${summary}`);
        return {
          id: `finnhub-${a.id as number}`,
          headline,
          summary,
          source: (a.source as string) ?? 'Finnhub',
          url: (a.url as string) ?? '',
          publishedAt: new Date(((a.datetime as number) ?? 0) * 1000),
          sentiment: sentimentScore,
          relevance: 0.8,
          relatedSymbols: [query],
        };
      });
    } catch (err) {
      this.logger.warn(`Finnhub news failed for ${query}: ${(err as Error).message}`);
      return [];
    }
  }

  private async fetchNewsApiNews(query: string, limit: number): Promise<NewsItem[]> {
    try {
      const res = await this.newsApiClient.get('/everything', {
        params: {
          q: query,
          sortBy: 'publishedAt',
          language: 'en',
          pageSize: Math.min(limit, 100),
          apiKey: this.NEWS_API_KEY,
        },
      });
      const articles = (res.data.articles as Array<Record<string, unknown>>) ?? [];
      return articles.map((a) => {
        const title = (a.title as string) ?? '';
        const description = (a.description as string) ?? '';
        return {
          id: `newsapi-${Buffer.from(title).toString('base64').slice(0, 16)}`,
          headline: title,
          summary: description,
          source: ((a.source as Record<string, string>)?.name) ?? 'NewsAPI',
          url: (a.url as string) ?? '',
          publishedAt: new Date((a.publishedAt as string) ?? Date.now()),
          sentiment: scoreSentiment(`${title} ${description}`),
          relevance: 0.6,
          relatedSymbols: [query],
        };
      });
    } catch (err) {
      this.logger.warn(`NewsAPI failed for ${query}: ${(err as Error).message}`);
      return [];
    }
  }

  private async fetchPublicRssNews(query: string, limit: number): Promise<NewsItem[]> {
    // Use CoinDesk RSS for crypto, generic finance fallback
    const rssFeedUrl = this.detectCategory(query) === 'crypto'
      ? 'https://www.coindesk.com/arc/outboundfeeds/rss/'
      : 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC&region=US&lang=en-US';

    try {
      const res = await axios.get(rssFeedUrl, { timeout: 8_000, responseType: 'text' });
      const xml = res.data as string;
      // Simple XML parsing without external libs
      const items: NewsItem[] = [];
      const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
      for (const match of itemMatches) {
        const item = match[1];
        const title = (/<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(item) ?? /<title>(.*?)<\/title>/.exec(item))?.[1] ?? '';
        const desc = (/<description><!\[CDATA\[(.*?)\]\]><\/description>/.exec(item) ?? /<description>(.*?)<\/description>/.exec(item))?.[1] ?? '';
        const link = (/<link>(.*?)<\/link>/.exec(item))?.[1] ?? '';
        const pubDate = (/<pubDate>(.*?)<\/pubDate>/.exec(item))?.[1] ?? '';
        if (!title) continue;
        items.push({
          id: `rss-${Buffer.from(title).toString('base64').slice(0, 16)}`,
          headline: title.trim(),
          summary: desc.replace(/<[^>]+>/g, '').trim().slice(0, 300),
          source: 'RSS',
          url: link.trim(),
          publishedAt: pubDate ? new Date(pubDate) : new Date(),
          sentiment: scoreSentiment(`${title} ${desc}`),
          relevance: 0.4,
          relatedSymbols: [query],
        });
        if (items.length >= limit) break;
      }
      return items;
    } catch (err) {
      this.logger.warn(`RSS fallback failed: ${(err as Error).message}`);
      return [];
    }
  }

  private detectCategory(query: string): 'crypto' | 'stock' | 'forex' | 'commodity' {
    const upper = query.toUpperCase();
    const cryptoSymbols = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'LINK',
      'BTCUSD', 'ETHUSD', 'BNBUSD', 'SOLUSD', 'XRPUSD'];
    const commoditySymbols = ['XAUUSD', 'XAGUSD', 'USOIL', 'UKOIL', 'GOLD', 'SILVER', 'OIL'];
    const forexSymbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'];

    if (cryptoSymbols.includes(upper)) return 'crypto';
    if (commoditySymbols.includes(upper)) return 'commodity';
    if (forexSymbols.includes(upper)) return 'forex';
    return 'stock';
  }

  async getNewsSentimentScore(query: string): Promise<number> {
    const news = await this.getNews(query, 10);
    if (!news.length) return 0;
    const weighted = news.reduce((sum, item, i) => {
      // More recent items weighted higher (exponential decay)
      const recencyWeight = Math.exp(-i * 0.15);
      return sum + (item.sentiment ?? 0) * recencyWeight;
    }, 0);
    const totalWeight = news.reduce((sum, _, i) => sum + Math.exp(-i * 0.15), 0);
    return totalWeight > 0 ? Math.max(-1, Math.min(1, weighted / totalWeight)) : 0;
  }
}
