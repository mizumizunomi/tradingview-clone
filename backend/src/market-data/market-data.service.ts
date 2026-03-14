import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';

export interface PriceData {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

@Injectable()
export class MarketDataService implements OnModuleInit {
  private readonly logger = new Logger(MarketDataService.name);
  private prices: Map<string, PriceData> = new Map();
  private ws: any = null;
  private subscribers: Map<string, Set<(data: PriceData) => void>> = new Map();

  private mockPrices: Record<string, number> = {
    EURUSD: 1.08542, GBPUSD: 1.27113, USDJPY: 149.823, USDCHF: 0.89124,
    AUDUSD: 0.64821, USDCAD: 1.36542, NZDUSD: 0.59824, EURGBP: 0.85412,
    EURJPY: 162.543, GBPJPY: 190.234, XAUUSD: 2345.67, XAGUSD: 27.834,
    USOIL: 78.234, UKOIL: 82.156, AAPL: 187.42, GOOGL: 175.23,
    MSFT: 415.67, AMZN: 182.34, TSLA: 242.56, NVDA: 875.43,
    META: 512.34, NFLX: 634.21, SPX500: 5123.45, NAS100: 18234.56,
    DJI: 38976.43, GER40: 18234.56, UK100: 8123.45, JPN225: 38765.43,
  };

  private cryptoSymbols = [
    'BTCUSD','ETHUSD','BNBUSD','SOLUSD','XRPUSD','ADAUSD',
    'DOGEUSD','AVAXUSD','DOTUSD','LINKUSD','UNIUSD','LTCUSD','BCHUSD','ATOMUSD',
  ];

  onModuleInit() {
    this.initMockPrices();
    this.connectBinanceWS();
    this.startMockPriceUpdates();
  }

  private initMockPrices() {
    for (const [symbol, price] of Object.entries(this.mockPrices)) {
      const spread = price * 0.0001;
      this.prices.set(symbol, {
        symbol, price,
        bid: price - spread / 2,
        ask: price + spread / 2,
        change: (Math.random() - 0.5) * price * 0.01,
        changePercent: (Math.random() - 0.5) * 1,
        timestamp: Date.now(),
      });
    }
  }

  private connectBinanceWS() {
    try {
      const WebSocket = require('ws');
      const symbols = ['btcusdt','ethusdt','bnbusdt','solusdt','xrpusdt',
                       'adausdt','dogeusdt','avaxusdt','dotusdt','linkusdt',
                       'uniusdt','ltcusdt','bchusdt','atomusdt'];
      const streams = symbols.map(s => s + '@miniTicker').join('/');
      const wsUrl = 'wss://stream.binance.com:9443/stream?streams=' + streams;
      this.ws = new WebSocket(wsUrl);

      this.ws.on('message', (data: Buffer) => {
        try {
          const parsed = JSON.parse(data.toString());
          const ticker = parsed.data;
          if (!ticker) return;
          const symbol = ticker.s.replace('USDT', 'USD');
          const price = parseFloat(ticker.c);
          const open = parseFloat(ticker.o);
          const change = price - open;
          const changePercent = (change / open) * 100;
          const spread = price * 0.0002;
          const priceData: PriceData = {
            symbol, price,
            bid: price - spread / 2,
            ask: price + spread / 2,
            change, changePercent,
            timestamp: Date.now(),
          };
          this.prices.set(symbol, priceData);
          this.notifySubscribers(symbol, priceData);
        } catch {}
      });

      this.ws.on('error', (err: Error) => {
        this.logger.warn('Binance WS error: ' + err.message);
      });

      this.ws.on('close', () => {
        this.logger.warn('Binance WS closed, reconnecting...');
        setTimeout(() => this.connectBinanceWS(), 5000);
      });
    } catch (err) {
      this.logger.warn('WS unavailable, using mock only');
    }
  }

  private startMockPriceUpdates() {
    setInterval(() => {
      for (const [symbol, data] of this.prices.entries()) {
        if (this.cryptoSymbols.includes(symbol)) continue;
        const volatility = data.price * 0.0003;
        const delta = (Math.random() - 0.5) * volatility;
        const newPrice = Math.max(data.price + delta, 0.0001);
        const spread = newPrice * 0.0001;
        const seedPrice = this.mockPrices[symbol] || newPrice;
        const newData: PriceData = {
          ...data, price: newPrice,
          bid: newPrice - spread / 2,
          ask: newPrice + spread / 2,
          change: newPrice - seedPrice,
          changePercent: ((newPrice - seedPrice) / seedPrice) * 100,
          timestamp: Date.now(),
        };
        this.prices.set(symbol, newData);
        this.notifySubscribers(symbol, newData);
      }
    }, 2000);
  }

  private notifySubscribers(symbol: string, data: PriceData) {
    this.subscribers.get(symbol)?.forEach(cb => cb(data));
    this.subscribers.get('ALL')?.forEach(cb => cb(data));
  }

  subscribe(symbol: string, callback: (data: PriceData) => void): () => void {
    if (!this.subscribers.has(symbol)) this.subscribers.set(symbol, new Set());
    this.subscribers.get(symbol)!.add(callback);
    return () => this.subscribers.get(symbol)?.delete(callback);
  }

  getPrice(symbol: string): PriceData | undefined {
    return this.prices.get(symbol);
  }

  getAllPrices(): PriceData[] {
    return Array.from(this.prices.values());
  }

  async getCandles(symbol: string, timeframe: string): Promise<any[]> {
    const binanceSymbol = symbol.replace('USD', 'USDT');
    const intervalMap: Record<string, string> = {
      '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
      '1h': '1h', '4h': '4h', '1D': '1d', '1W': '1w', '1M': '1M',
    };
    const interval = intervalMap[timeframe] || '1h';

    if (this.cryptoSymbols.includes(symbol)) {
      try {
        const res = await axios.get(
          'https://api.binance.com/api/v3/klines?symbol=' + binanceSymbol + '&interval=' + interval + '&limit=500'
        );
        return res.data.map((k: any[]) => ({
          time: Math.floor(k[0] / 1000),
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
        }));
      } catch {
        this.logger.warn('Binance candles failed for ' + symbol + ', using mock');
      }
    }
    return this.generateMockCandles(symbol, timeframe);
  }

  private generateMockCandles(symbol: string, timeframe: string): object[] {
    const seedPrice = this.mockPrices[symbol] || 100;
    const candles: object[] = [];
    const count = 500;
    const intervalSeconds: Record<string, number> = {
      '1m': 60, '5m': 300, '15m': 900, '30m': 1800,
      '1h': 3600, '4h': 14400, '1D': 86400, '1W': 604800,
    };
    const seconds = intervalSeconds[timeframe] || 3600;
    const now = Math.floor(Date.now() / 1000);
    let price = seedPrice;

    for (let i = count; i >= 0; i--) {
      const time = now - i * seconds;
      const volatility = price * 0.002;
      const open = price;
      const change = (Math.random() - 0.48) * volatility;
      const close = Math.max(open + change, 0.0001);
      const high = Math.max(open, close) + Math.random() * volatility * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * 0.5;
      candles.push({ time, open, high, low: Math.max(low, 0.0001), close, volume: Math.random() * 1000 + 100 });
      price = close;
    }
    return candles;
  }
}
