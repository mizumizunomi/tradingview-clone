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
export class BinanceProvider implements IMarketDataProvider {
  private readonly logger = new Logger(BinanceProvider.name);
  private readonly client: AxiosInstance;
  private available = true;

  private readonly INTERVAL_MAP: Record<string, string> = {
    '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m',
    '1h': '1h', '2h': '2h', '4h': '4h', '6h': '6h', '8h': '8h', '12h': '12h',
    '1d': '1d', '1D': '1d', '3d': '3d', '1w': '1w', '1W': '1w', '1M': '1M',
  };

  // Map our internal symbols to Binance format
  private readonly SYMBOL_MAP: Record<string, string> = {
    BTCUSD: 'BTCUSDT', ETHUSD: 'ETHUSDT', BNBUSD: 'BNBUSDT',
    SOLUSD: 'SOLUSDT', XRPUSD: 'XRPUSDT', ADAUSD: 'ADAUSDT',
    DOGEUSD: 'DOGEUSDT', AVAXUSD: 'AVAXUSDT', DOTUSD: 'DOTUSDT',
    LINKUSD: 'LINKUSDT', UNIUSD: 'UNIUSDT', LTCUSD: 'LTCUSDT',
    BCHUSD: 'BCHUSDT', ATOMUSD: 'ATOMUSDT',
  };

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.binance.com',
      timeout: 10_000,
      headers: { 'X-MBX-APIKEY': process.env.BINANCE_API_KEY || '' },
    });
  }

  getName(): string { return 'Binance'; }
  isAvailable(): boolean { return this.available; }

  private toBinanceSymbol(symbol: string): string {
    return this.SYMBOL_MAP[symbol] ?? symbol;
  }

  async getCandles(symbol: string, interval: string, limit = 500): Promise<OHLCVCandle[]> {
    const binanceSymbol = this.toBinanceSymbol(symbol);
    const binanceInterval = this.INTERVAL_MAP[interval] ?? '1h';
    try {
      const res = await this.client.get('/api/v3/klines', {
        params: { symbol: binanceSymbol, interval: binanceInterval, limit },
      });
      this.available = true;
      return (res.data as unknown[][]).map((k) => ({
        time: Math.floor((k[0] as number) / 1000),
        open: parseFloat(k[1] as string),
        high: parseFloat(k[2] as string),
        low: parseFloat(k[3] as string),
        close: parseFloat(k[4] as string),
        volume: parseFloat(k[5] as string),
      }));
    } catch (err) {
      this.available = false;
      this.logger.warn(`Binance candles failed for ${symbol}: ${(err as Error).message}`);
      return [];
    }
  }

  async getOrderBook(symbol: string, depth = 20): Promise<OrderBook | null> {
    const binanceSymbol = this.toBinanceSymbol(symbol);
    try {
      const res = await this.client.get('/api/v3/depth', {
        params: { symbol: binanceSymbol, limit: depth },
      });
      this.available = true;
      return {
        symbol,
        bids: (res.data.bids as string[][]).map(([p, q]) => ({
          price: parseFloat(p), quantity: parseFloat(q),
        })),
        asks: (res.data.asks as string[][]).map(([p, q]) => ({
          price: parseFloat(p), quantity: parseFloat(q),
        })),
        timestamp: Date.now(),
      };
    } catch (err) {
      this.available = false;
      this.logger.warn(`Binance order book failed for ${symbol}: ${(err as Error).message}`);
      return null;
    }
  }

  async getFundingRate(symbol: string): Promise<FundingRate | null> {
    const binanceSymbol = this.toBinanceSymbol(symbol) + (this.toBinanceSymbol(symbol).endsWith('T') ? '' : 'T');
    try {
      const res = await this.client.get('/fapi/v1/premiumIndex', {
        params: { symbol: binanceSymbol },
        baseURL: 'https://fapi.binance.com',
      });
      return {
        symbol,
        fundingRate: parseFloat(res.data.lastFundingRate),
        nextFundingTime: res.data.nextFundingTime,
      };
    } catch (err) {
      this.logger.warn(`Binance funding rate failed for ${symbol}: ${(err as Error).message}`);
      return null;
    }
  }

  async getOpenInterest(symbol: string): Promise<OpenInterest | null> {
    const binanceSymbol = this.toBinanceSymbol(symbol);
    try {
      const res = await this.client.get('/fapi/v1/openInterest', {
        params: { symbol: binanceSymbol },
        baseURL: 'https://fapi.binance.com',
      });
      return {
        symbol,
        openInterest: parseFloat(res.data.openInterest),
        timestamp: res.data.time,
      };
    } catch (err) {
      this.logger.warn(`Binance open interest failed for ${symbol}: ${(err as Error).message}`);
      return null;
    }
  }

  async get24hTicker(symbol: string): Promise<{ priceChange: number; priceChangePercent: number; volume: number } | null> {
    const binanceSymbol = this.toBinanceSymbol(symbol);
    try {
      const res = await this.client.get('/api/v3/ticker/24hr', {
        params: { symbol: binanceSymbol },
      });
      return {
        priceChange: parseFloat(res.data.priceChange),
        priceChangePercent: parseFloat(res.data.priceChangePercent),
        volume: parseFloat(res.data.volume),
      };
    } catch (err) {
      this.logger.warn(`Binance 24h ticker failed for ${symbol}: ${(err as Error).message}`);
      return null;
    }
  }
}
