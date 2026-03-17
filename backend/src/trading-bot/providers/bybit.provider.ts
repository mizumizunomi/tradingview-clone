import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import {
  IMarketDataProvider,
  OHLCVCandle,
  OrderBook,
  FundingRate,
  OpenInterest,
} from '../interfaces/provider.interface';

@Injectable()
export class BybitProvider implements IMarketDataProvider {
  private readonly logger = new Logger(BybitProvider.name);
  private readonly client: AxiosInstance;
  private available = true;

  // Bybit uses different interval format
  private readonly INTERVAL_MAP: Record<string, string> = {
    '1m': '1', '3m': '3', '5m': '5', '15m': '15', '30m': '30',
    '1h': '60', '2h': '120', '4h': '240', '6h': '360', '12h': '720',
    '1d': 'D', '1D': 'D', '1w': 'W', '1W': 'W', '1M': 'M',
  };

  private readonly SYMBOL_MAP: Record<string, string> = {
    BTCUSD: 'BTCUSDT', ETHUSD: 'ETHUSDT', BNBUSD: 'BNBUSDT',
    SOLUSD: 'SOLUSDT', XRPUSD: 'XRPUSDT', ADAUSD: 'ADAUSDT',
    DOGEUSD: 'DOGEUSDT', AVAXUSD: 'AVAXUSDT', DOTUSD: 'DOTUSDT',
    LINKUSD: 'LINKUSDT', UNIUSD: 'UNIUSDT', LTCUSD: 'LTCUSDT',
    BCHUSD: 'BCHUSDT', ATOMUSD: 'ATOMUSDT',
  };

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.bybit.com',
      timeout: 10_000,
    });
  }

  getName(): string { return 'Bybit'; }
  isAvailable(): boolean { return this.available; }

  private toBybitSymbol(symbol: string): string {
    return this.SYMBOL_MAP[symbol] ?? symbol;
  }

  async getCandles(symbol: string, interval: string, limit = 200): Promise<OHLCVCandle[]> {
    const bybitSymbol = this.toBybitSymbol(symbol);
    const bybitInterval = this.INTERVAL_MAP[interval] ?? '60';
    try {
      const res = await this.client.get('/v5/market/kline', {
        params: {
          category: 'spot',
          symbol: bybitSymbol,
          interval: bybitInterval,
          limit,
        },
      });
      if (res.data.retCode !== 0) throw new Error(res.data.retMsg);
      this.available = true;
      // Bybit returns newest first — reverse to oldest-first
      return (res.data.result.list as string[][])
        .reverse()
        .map((k) => ({
          time: Math.floor(parseInt(k[0]) / 1000),
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
        }));
    } catch (err) {
      this.available = false;
      this.logger.warn(`Bybit candles failed for ${symbol}: ${(err as Error).message}`);
      return [];
    }
  }

  async getOrderBook(symbol: string, depth = 50): Promise<OrderBook | null> {
    const bybitSymbol = this.toBybitSymbol(symbol);
    try {
      const res = await this.client.get('/v5/market/orderbook', {
        params: { category: 'spot', symbol: bybitSymbol, limit: depth },
      });
      if (res.data.retCode !== 0) throw new Error(res.data.retMsg);
      this.available = true;
      return {
        symbol,
        bids: (res.data.result.b as string[][]).map(([p, q]) => ({
          price: parseFloat(p), quantity: parseFloat(q),
        })),
        asks: (res.data.result.a as string[][]).map(([p, q]) => ({
          price: parseFloat(p), quantity: parseFloat(q),
        })),
        timestamp: res.data.result.ts,
      };
    } catch (err) {
      this.available = false;
      this.logger.warn(`Bybit order book failed for ${symbol}: ${(err as Error).message}`);
      return null;
    }
  }

  async getFundingRate(symbol: string): Promise<FundingRate | null> {
    const bybitSymbol = this.toBybitSymbol(symbol).replace('USDT', 'USDT'); // linear perp
    try {
      const res = await this.client.get('/v5/market/funding/history', {
        params: { category: 'linear', symbol: bybitSymbol, limit: 1 },
      });
      if (res.data.retCode !== 0 || !res.data.result.list.length) return null;
      const item = res.data.result.list[0];
      return {
        symbol,
        fundingRate: parseFloat(item.fundingRate),
        nextFundingTime: 0, // not in history endpoint
      };
    } catch (err) {
      this.logger.warn(`Bybit funding rate failed for ${symbol}: ${(err as Error).message}`);
      return null;
    }
  }

  async getOpenInterest(symbol: string): Promise<OpenInterest | null> {
    const bybitSymbol = this.toBybitSymbol(symbol);
    try {
      const res = await this.client.get('/v5/market/open-interest', {
        params: { category: 'linear', symbol: bybitSymbol, intervalTime: '1h', limit: 1 },
      });
      if (res.data.retCode !== 0 || !res.data.result.list.length) return null;
      const item = res.data.result.list[0];
      return {
        symbol,
        openInterest: parseFloat(item.openInterest),
        timestamp: parseInt(item.timestamp),
      };
    } catch (err) {
      this.logger.warn(`Bybit open interest failed for ${symbol}: ${(err as Error).message}`);
      return null;
    }
  }

  async getTicker(symbol: string): Promise<{ lastPrice: number; volume24h: number; priceChangePercent24h: number } | null> {
    const bybitSymbol = this.toBybitSymbol(symbol);
    try {
      const res = await this.client.get('/v5/market/tickers', {
        params: { category: 'spot', symbol: bybitSymbol },
      });
      if (res.data.retCode !== 0 || !res.data.result.list.length) return null;
      const t = res.data.result.list[0];
      return {
        lastPrice: parseFloat(t.lastPrice),
        volume24h: parseFloat(t.volume24h),
        priceChangePercent24h: parseFloat(t.price24hPcnt) * 100,
      };
    } catch (err) {
      this.logger.warn(`Bybit ticker failed for ${symbol}: ${(err as Error).message}`);
      return null;
    }
  }
}
