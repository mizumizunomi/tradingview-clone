import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { IMarketDataProvider, OHLCVCandle, OrderBook } from '../interfaces/provider.interface';

interface TechnicalIndicatorResult {
  values: Array<{ datetime: string; [key: string]: string }>;
  status: string;
}

@Injectable()
export class TwelveDataProvider implements IMarketDataProvider {
  private readonly logger = new Logger(TwelveDataProvider.name);
  private readonly client: AxiosInstance;
  private readonly KEY = process.env.TWELVE_DATA_API_KEY;
  private available = !!process.env.TWELVE_DATA_API_KEY;

  private readonly INTERVAL_MAP: Record<string, string> = {
    '1m': '1min', '5m': '5min', '15m': '15min', '30m': '30min',
    '1h': '1h', '4h': '4h', '1d': '1day', '1D': '1day',
    '1w': '1week', '1W': '1week',
  };

  // Our symbol → TwelveData symbol
  private readonly SYMBOL_MAP: Record<string, string> = {
    BTCUSD: 'BTC/USD', ETHUSD: 'ETH/USD', BNBUSD: 'BNB/USD',
    SOLUSD: 'SOL/USD', XRPUSD: 'XRP/USD', ADAUSD: 'ADA/USD',
    DOGEUSD: 'DOGE/USD', AVAXUSD: 'AVAX/USD', DOTUSD: 'DOT/USD',
    LINKUSD: 'LINK/USD', UNIUSD: 'UNI/USD', LTCUSD: 'LTC/USD',
    BCHUSD: 'BCH/USD', ATOMUSD: 'ATOM/USD',
    EURUSD: 'EUR/USD', GBPUSD: 'GBP/USD', USDJPY: 'USD/JPY',
    USDCHF: 'USD/CHF', AUDUSD: 'AUD/USD', USDCAD: 'USD/CAD',
    NZDUSD: 'NZD/USD', EURGBP: 'EUR/GBP', EURJPY: 'EUR/JPY', GBPJPY: 'GBP/JPY',
    XAUUSD: 'XAU/USD', XAGUSD: 'XAG/USD', USOIL: 'WTI/USD', UKOIL: 'BRENT/USD',
    AAPL: 'AAPL', GOOGL: 'GOOGL', MSFT: 'MSFT', AMZN: 'AMZN',
    TSLA: 'TSLA', NVDA: 'NVDA', META: 'META', NFLX: 'NFLX',
    SPX500: 'SPX', NAS100: 'NDX', DJI: 'DJI',
  };

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.twelvedata.com',
      timeout: 15_000,
    });
  }

  getName(): string { return 'TwelveData'; }
  isAvailable(): boolean { return this.available; }

  private toTdSymbol(symbol: string): string {
    return this.SYMBOL_MAP[symbol] ?? symbol;
  }

  async getCandles(symbol: string, interval: string, limit = 500): Promise<OHLCVCandle[]> {
    if (!this.KEY) return [];
    const tdSymbol = this.toTdSymbol(symbol);
    const tdInterval = this.INTERVAL_MAP[interval] ?? '1h';
    try {
      const res = await this.client.get('/time_series', {
        params: {
          symbol: tdSymbol,
          interval: tdInterval,
          outputsize: limit,
          apikey: this.KEY,
        },
      });
      if (res.data.status === 'error') throw new Error(res.data.message);
      this.available = true;
      return (res.data.values as Array<Record<string, string>>)
        .reverse()
        .map((c) => ({
          time: Math.floor(new Date(c.datetime).getTime() / 1000),
          open: parseFloat(c.open),
          high: parseFloat(c.high),
          low: parseFloat(c.low),
          close: parseFloat(c.close),
          volume: parseFloat(c.volume ?? '0'),
        }));
    } catch (err) {
      this.available = false;
      this.logger.warn(`TwelveData candles failed for ${symbol}: ${(err as Error).message}`);
      return [];
    }
  }

  // TwelveData doesn't provide order books
  async getOrderBook(_symbol: string, _depth?: number): Promise<OrderBook | null> {
    return null;
  }

  async getIndicator(
    symbol: string,
    indicator: string,
    interval: string,
    params: Record<string, string | number> = {},
  ): Promise<TechnicalIndicatorResult | null> {
    if (!this.KEY) return null;
    const tdSymbol = this.toTdSymbol(symbol);
    const tdInterval = this.INTERVAL_MAP[interval] ?? '1h';
    try {
      const res = await this.client.get(`/${indicator}`, {
        params: {
          symbol: tdSymbol,
          interval: tdInterval,
          outputsize: 100,
          apikey: this.KEY,
          ...params,
        },
      });
      if (res.data.status === 'error') throw new Error(res.data.message);
      this.available = true;
      return res.data as TechnicalIndicatorResult;
    } catch (err) {
      this.logger.warn(`TwelveData ${indicator} failed for ${symbol}: ${(err as Error).message}`);
      return null;
    }
  }

  async getRSI(symbol: string, interval: string, period = 14): Promise<number | null> {
    const result = await this.getIndicator(symbol, 'rsi', interval, { time_period: period });
    const val = result?.values?.[0]?.rsi;
    return val ? parseFloat(val) : null;
  }

  async getMACD(symbol: string, interval: string): Promise<{ macd: number; signal: number; histogram: number } | null> {
    const result = await this.getIndicator(symbol, 'macd', interval);
    const v = result?.values?.[0];
    if (!v) return null;
    return {
      macd: parseFloat(v.macd ?? '0'),
      signal: parseFloat(v.macd_signal ?? '0'),
      histogram: parseFloat(v.macd_hist ?? '0'),
    };
  }

  async getBollingerBands(symbol: string, interval: string): Promise<{ upper: number; middle: number; lower: number } | null> {
    const result = await this.getIndicator(symbol, 'bbands', interval);
    const v = result?.values?.[0];
    if (!v) return null;
    return {
      upper: parseFloat(v.upper_band ?? '0'),
      middle: parseFloat(v.middle_band ?? '0'),
      lower: parseFloat(v.lower_band ?? '0'),
    };
  }

  async getEMA(symbol: string, interval: string, period: number): Promise<number | null> {
    const result = await this.getIndicator(symbol, 'ema', interval, { time_period: period });
    const val = result?.values?.[0]?.ema;
    return val ? parseFloat(val) : null;
  }

  async getATR(symbol: string, interval: string, period = 14): Promise<number | null> {
    const result = await this.getIndicator(symbol, 'atr', interval, { time_period: period });
    const val = result?.values?.[0]?.atr;
    return val ? parseFloat(val) : null;
  }

  async getADX(symbol: string, interval: string, period = 14): Promise<number | null> {
    const result = await this.getIndicator(symbol, 'adx', interval, { time_period: period });
    const val = result?.values?.[0]?.adx;
    return val ? parseFloat(val) : null;
  }

  async getStoch(symbol: string, interval: string): Promise<{ k: number; d: number } | null> {
    const result = await this.getIndicator(symbol, 'stoch', interval);
    const v = result?.values?.[0];
    if (!v) return null;
    return { k: parseFloat(v.slow_k ?? '0'), d: parseFloat(v.slow_d ?? '0') };
  }

  async getCurrentPrice(symbol: string): Promise<number | null> {
    if (!this.KEY) return null;
    const tdSymbol = this.toTdSymbol(symbol);
    try {
      const res = await this.client.get('/price', {
        params: { symbol: tdSymbol, apikey: this.KEY },
      });
      return res.data?.price ? parseFloat(res.data.price) : null;
    } catch {
      return null;
    }
  }
}
