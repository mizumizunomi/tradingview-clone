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
  private binanceWs: any = null;
  private twelveDataWs: any = null;
  private subscribers: Map<string, Set<(data: PriceData) => void>> = new Map();
  private symbolsWithRealData = new Set<string>();

  private readonly TWELVE_DATA_KEY = process.env.TWELVE_DATA_API_KEY;

  // Our symbol → Twelve Data symbol
  private readonly TD_MAP: Record<string, string> = {
    EURUSD: 'EUR/USD', GBPUSD: 'GBP/USD', USDJPY: 'USD/JPY', USDCHF: 'USD/CHF',
    AUDUSD: 'AUD/USD', USDCAD: 'USD/CAD', NZDUSD: 'NZD/USD', EURGBP: 'EUR/GBP',
    EURJPY: 'EUR/JPY', GBPJPY: 'GBP/JPY',
    XAUUSD: 'XAU/USD', XAGUSD: 'XAG/USD',
    AAPL: 'AAPL', GOOGL: 'GOOGL', MSFT: 'MSFT', AMZN: 'AMZN',
    TSLA: 'TSLA', NVDA: 'NVDA', META: 'META', NFLX: 'NFLX',
    SPX500: 'SPX', NAS100: 'NDX', DJI: 'DJI',
    GER40: 'DAX', UK100: 'FTSE', JPN225: 'N225',
  };

  // Reverse map: Twelve Data symbol → our symbol
  private readonly TD_REVERSE: Record<string, string> =
    Object.fromEntries(Object.entries(this.TD_MAP).map(([k, v]) => [v, k]));

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
    'BTCUSD', 'ETHUSD', 'BNBUSD', 'SOLUSD', 'XRPUSD', 'ADAUSD',
    'DOGEUSD', 'AVAXUSD', 'DOTUSD', 'LINKUSD', 'UNIUSD', 'LTCUSD', 'BCHUSD', 'ATOMUSD',
  ];

  onModuleInit() {
    this.initMockPrices();
    this.connectBinanceWS();
    if (this.TWELVE_DATA_KEY) {
      this.logger.log('Twelve Data API key found — connecting real market data');
      this.fetchTwelveDataSnapshot();
      this.connectTwelveDataWS();
    } else {
      this.logger.warn('No TWELVE_DATA_API_KEY — using mock price updates');
    }
    // Always run mock updates for symbols not covered by real APIs
    this.startMockPriceUpdates();
  }

  // ── Init mock baseline ──────────────────────────────────────────────────────
  private initMockPrices() {
    for (const [symbol, price] of Object.entries(this.mockPrices)) {
      const spread = price * 0.0001;
      this.prices.set(symbol, {
        symbol, price,
        bid: price - spread / 2,
        ask: price + spread / 2,
        change: 0, changePercent: 0,
        timestamp: Date.now(),
      });
    }
  }

  // ── Binance WebSocket (crypto) ──────────────────────────────────────────────
  private connectBinanceWS() {
    try {
      const WebSocket = require('ws');
      const symbols = [
        'btcusdt', 'ethusdt', 'bnbusdt', 'solusdt', 'xrpusdt',
        'adausdt', 'dogeusdt', 'avaxusdt', 'dotusdt', 'linkusdt',
        'uniusdt', 'ltcusdt', 'bchusdt', 'atomusdt',
      ];
      const streams = symbols.map(s => s + '@miniTicker').join('/');
      this.binanceWs = new WebSocket('wss://stream.binance.com:9443/stream?streams=' + streams);

      this.binanceWs.on('message', (data: Buffer) => {
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
            bid: price - spread / 2, ask: price + spread / 2,
            change, changePercent, timestamp: Date.now(),
          };
          this.prices.set(symbol, priceData);
          this.symbolsWithRealData.add(symbol);
          this.notifySubscribers(symbol, priceData);
        } catch {}
      });

      this.binanceWs.on('error', (err: Error) => this.logger.warn('Binance WS error: ' + err.message));
      this.binanceWs.on('close', () => {
        this.logger.warn('Binance WS closed, reconnecting...');
        setTimeout(() => this.connectBinanceWS(), 5000);
      });
    } catch {
      this.logger.warn('Binance WS unavailable');
    }
  }

  // ── Twelve Data: initial REST snapshot ─────────────────────────────────────
  private async fetchTwelveDataSnapshot() {
    try {
      const tdSymbols = Object.values(this.TD_MAP).join(',');
      const res = await axios.get(
        `https://api.twelvedata.com/price?symbol=${encodeURIComponent(tdSymbols)}&apikey=${this.TWELVE_DATA_KEY}`
      );
      const data = res.data;
      for (const [ourSymbol, tdSymbol] of Object.entries(this.TD_MAP)) {
        const entry = data[tdSymbol];
        if (entry?.price) {
          const price = parseFloat(entry.price);
          if (isNaN(price) || price <= 0) continue;
          const spread = price * 0.0001;
          const seed = this.mockPrices[ourSymbol] || price;
          this.prices.set(ourSymbol, {
            symbol: ourSymbol, price,
            bid: price - spread / 2, ask: price + spread / 2,
            change: price - seed,
            changePercent: ((price - seed) / seed) * 100,
            timestamp: Date.now(),
          });
          this.symbolsWithRealData.add(ourSymbol);
          this.notifySubscribers(ourSymbol, this.prices.get(ourSymbol)!);
        }
      }
      this.logger.log('Twelve Data snapshot loaded');
    } catch (err) {
      this.logger.warn('Twelve Data snapshot failed: ' + err.message);
    }
  }

  // ── Twelve Data WebSocket (forex, stocks, indices) ──────────────────────────
  private connectTwelveDataWS() {
    try {
      const WebSocket = require('ws');
      const wsUrl = `wss://ws.twelvedata.com/v1/quotes/price?apikey=${this.TWELVE_DATA_KEY}`;
      this.twelveDataWs = new WebSocket(wsUrl);

      this.twelveDataWs.on('open', () => {
        this.logger.log('Twelve Data WS connected');
        const tdSymbols = Object.values(this.TD_MAP).join(',');
        this.twelveDataWs.send(JSON.stringify({
          action: 'subscribe',
          params: { symbols: tdSymbols },
        }));
      });

      this.twelveDataWs.on('message', (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.event !== 'price' || !msg.price) return;
          const ourSymbol = this.TD_REVERSE[msg.symbol];
          if (!ourSymbol) return;
          const price = parseFloat(msg.price);
          if (isNaN(price) || price <= 0) return;
          const spread = price * 0.0001;
          const seed = this.mockPrices[ourSymbol] || price;
          const priceData: PriceData = {
            symbol: ourSymbol, price,
            bid: price - spread / 2, ask: price + spread / 2,
            change: price - seed,
            changePercent: ((price - seed) / seed) * 100,
            timestamp: Date.now(),
          };
          this.prices.set(ourSymbol, priceData);
          this.symbolsWithRealData.add(ourSymbol);
          this.notifySubscribers(ourSymbol, priceData);
        } catch {}
      });

      this.twelveDataWs.on('error', (err: Error) => this.logger.warn('Twelve Data WS error: ' + err.message));
      this.twelveDataWs.on('close', () => {
        this.logger.warn('Twelve Data WS closed, reconnecting...');
        setTimeout(() => this.connectTwelveDataWS(), 5000);
      });
    } catch {
      this.logger.warn('Twelve Data WS unavailable');
    }
  }

  // ── Mock updates (only for symbols without real data) ──────────────────────
  private startMockPriceUpdates() {
    setInterval(() => {
      for (const [symbol, data] of this.prices.entries()) {
        if (this.symbolsWithRealData.has(symbol)) continue;
        const volatility = data.price * 0.0003;
        const delta = (Math.random() - 0.5) * volatility;
        const newPrice = Math.max(data.price + delta, 0.0001);
        const spread = newPrice * 0.0001;
        const seed = this.mockPrices[symbol] || newPrice;
        const newData: PriceData = {
          ...data, price: newPrice,
          bid: newPrice - spread / 2, ask: newPrice + spread / 2,
          change: newPrice - seed,
          changePercent: ((newPrice - seed) / seed) * 100,
          timestamp: Date.now(),
        };
        this.prices.set(symbol, newData);
        this.notifySubscribers(symbol, newData);
      }
    }, 2000);
  }

  // ── Candle data ─────────────────────────────────────────────────────────────
  async getCandles(symbol: string, timeframe: string): Promise<any[]> {
    // Crypto → Binance
    if (this.cryptoSymbols.includes(symbol)) {
      try {
        const binanceSymbol = symbol.replace('USD', 'USDT');
        const intervalMap: Record<string, string> = {
          '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
          '1h': '1h', '4h': '4h', '1D': '1d', '1W': '1w',
        };
        const res = await axios.get(
          `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${intervalMap[timeframe] || '1h'}&limit=500`
        );
        return res.data.map((k: any[]) => ({
          time: Math.floor(k[0] / 1000),
          open: parseFloat(k[1]), high: parseFloat(k[2]),
          low: parseFloat(k[3]), close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
        }));
      } catch {
        this.logger.warn('Binance candles failed for ' + symbol);
        return this.generateMockCandles(symbol, timeframe);
      }
    }

    // Forex / Stocks / Indices → Twelve Data
    if (this.TWELVE_DATA_KEY && this.TD_MAP[symbol]) {
      try {
        const tdSymbol = this.TD_MAP[symbol];
        const intervalMap: Record<string, string> = {
          '1m': '1min', '5m': '5min', '15m': '15min', '30m': '30min',
          '1h': '1h', '4h': '4h', '1D': '1day', '1W': '1week',
        };
        const res = await axios.get(
          `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(tdSymbol)}&interval=${intervalMap[timeframe] || '1h'}&outputsize=500&apikey=${this.TWELVE_DATA_KEY}`
        );
        if (res.data.status === 'error' || !res.data.values?.length) {
          throw new Error(res.data.message || 'No data returned');
        }
        return res.data.values.reverse().map((c: any) => ({
          time: Math.floor(new Date(c.datetime).getTime() / 1000),
          open: parseFloat(c.open), high: parseFloat(c.high),
          low: parseFloat(c.low), close: parseFloat(c.close),
          volume: parseFloat(c.volume || '0'),
        }));
      } catch (err) {
        this.logger.warn(`Twelve Data candles failed for ${symbol}: ${err.message}`);
        return this.generateMockCandles(symbol, timeframe);
      }
    }

    return this.generateMockCandles(symbol, timeframe);
  }

  private generateMockCandles(symbol: string, timeframe: string): object[] {
    const seedPrice = this.mockPrices[symbol] || 100;
    const intervalSeconds: Record<string, number> = {
      '1m': 60, '5m': 300, '15m': 900, '30m': 1800,
      '1h': 3600, '4h': 14400, '1D': 86400, '1W': 604800,
    };
    const seconds = intervalSeconds[timeframe] || 3600;
    const now = Math.floor(Date.now() / 1000);
    const candles: object[] = [];
    let price = seedPrice;

    for (let i = 500; i >= 0; i--) {
      const open = price;
      const volatility = price * 0.002;
      const close = Math.max(open + (Math.random() - 0.48) * volatility, 0.0001);
      const high = Math.max(open, close) + Math.random() * volatility * 0.5;
      const low = Math.max(Math.min(open, close) - Math.random() * volatility * 0.5, 0.0001);
      candles.push({ time: now - i * seconds, open, high, low, close, volume: Math.random() * 1000 + 100 });
      price = close;
    }
    return candles;
  }

  // ── Pub/Sub ─────────────────────────────────────────────────────────────────
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
}
