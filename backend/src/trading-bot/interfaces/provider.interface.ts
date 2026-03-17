export interface OHLCVCandle {
  time: number; // Unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
}

export interface OrderBook {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
}

export interface FundingRate {
  symbol: string;
  fundingRate: number;
  nextFundingTime: number;
}

export interface OpenInterest {
  symbol: string;
  openInterest: number;
  timestamp: number;
}

export interface CryptoFundamentals {
  id: string;
  symbol: string;
  name: string;
  marketCap: number;
  marketCapRank: number;
  volume24h: number;
  priceChangePercent24h: number;
  priceChangePercent7d?: number;
  circulatingSupply?: number;
  totalSupply?: number;
  developerScore?: number;
  communityScore?: number;
  liquidityScore?: number;
  publicInterestScore?: number;
}

export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: Date;
  sentiment?: number; // -1.0 to 1.0
  relevance?: number; // 0.0 to 1.0
  relatedSymbols?: string[];
}

export interface ProviderStatus {
  name: string;
  available: boolean;
  lastChecked: Date;
  errorMessage?: string;
}

export interface IMarketDataProvider {
  getName(): string;
  isAvailable(): boolean;
  getCandles(symbol: string, interval: string, limit?: number): Promise<OHLCVCandle[]>;
  getOrderBook(symbol: string, depth?: number): Promise<OrderBook | null>;
}

export interface ICryptoFundamentalsProvider {
  getName(): string;
  isAvailable(): boolean;
  getFundamentals(symbol: string): Promise<CryptoFundamentals | null>;
  getGlobalMetrics(): Promise<Record<string, unknown> | null>;
  getTrending(): Promise<string[]>;
}

export interface INewsProvider {
  getName(): string;
  isAvailable(): boolean;
  getNews(query: string, limit?: number): Promise<NewsItem[]>;
}
